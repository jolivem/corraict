package com.example.aicorrect

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.inputmethodservice.InputMethodService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.CheckBox
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.PopupWindow
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject

class CorrectKeyboardService : InputMethodService() {

    private enum class ShiftState { OFF, ONE_SHOT, LOCKED }

    private var inputView: View? = null
    private var shiftState = ShiftState.OFF
    private var shiftButton: Button? = null
    private var correctButton: Button? = null
    private var undoButton: Button? = null
    private var correctButtonOriginalBackground: Drawable? = null
    private var correctButtonOriginalTint: ColorStateList? = null
    private val letterButtons = mutableListOf<Button>()
    private val emojiTabButtons = mutableListOf<Button>()
    private var currentEmojiCategory = 0
    private var lastUiMode = Configuration.UI_MODE_NIGHT_UNDEFINED
    private var lastLanguage: String = ""
    private var correctionInProgress = false
    private var correctionOriginal: String? = null
    private var correctionWasSelection = false
    private var lastOriginalText: String? = null
    private var lastWasSelection = false
    private var lastCorrectedLength = 0
    private var waveAnimator: ValueAnimator? = null
    private var waveDrawable: WaveBackgroundDrawable? = null
    private var pendingResult: PendingResult? = null

    private var accentPopup: PopupWindow? = null
    private var accentChips: List<TextView> = emptyList()
    private var accentVariants: List<Char> = emptyList()
    private var accentHighlightIndex = 0
    private var accentPopupShowing = false

    private val completionEngine = WordCompletionEngine()
    private var suggestionStrip: View? = null
    private var suggestionButtons: List<Button> = emptyList()
    private var suggestionDividers: List<View> = emptyList()
    private var completionEnabled = true
    private var emojiMode = false

    private data class PendingResult(val text: String, val errorMsg: String?)

    override fun onCreate() {
        super.onCreate()
        completionEnabled = getPreferences().getBoolean(KEY_COMPLETION, true)
        // Chargement du dictionnaire hors du thread principal.
        val assetPath = dictAssetForLanguage()
        Thread { completionEngine.load(applicationContext, assetPath) }.start()
    }

    /** Asset du dictionnaire selon la langue (même logique que la disposition clavier). */
    private fun dictAssetForLanguage(): String = when (systemLanguage()) {
        "fr" -> "dict/fr.txt"
        else -> "dict/fr.txt" // FR par défaut ; prévu pour ajouter dict/en.txt plus tard
    }

    override fun onCreateInputView(): View {
        lastUiMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        lastLanguage = systemLanguage()
        dismissAccentPopup()
        letterButtons.clear()
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)

        applyNavigationBarInset(view)

        correctButton = view.findViewById(R.id.btnCorrect)
        correctButton?.setOnClickListener { applyCorrection() }
        undoButton = view.findViewById(R.id.btnUndo)
        undoButton?.setOnClickListener { undoCorrection() }
        updateUndoEnabled()
        view.findViewById<Button>(R.id.btnEmoji).setOnClickListener { toggleEmojiPanel(view) }
        buildEmojiPanel(view)

        bindLetterRow(view.findViewById(R.id.rowDigits))
        bindLetterRow(view.findViewById(R.id.row1))
        bindLetterRow(view.findViewById(R.id.row2))
        bindRow3(view.findViewById(R.id.row3))
        bindRow4(view)
        bindSymbolsPanel(view)
        applyKeyboardLayout(view)

        shiftButton = view.findViewById(R.id.keyShift)
        shiftButton?.setOnClickListener { onShiftClick() }
        shiftButton?.setOnLongClickListener { onShiftLongPress() }
        refreshShiftVisual()

        view.findViewById<Button>(R.id.keyDelete).attachRepeat { deleteOne() }
        view.findViewById<Button>(R.id.keyEnter).setOnClickListener { sendEnter() }
        view.findViewById<Button>(R.id.keySpace).attachRepeat { commit(" ") }

        view.findViewById<Button>(R.id.keySymbolsToggle).setOnClickListener { showSymbolsPanel(view, true) }
        view.findViewById<Button>(R.id.keyLettersToggle).setOnClickListener { showSymbolsPanel(view, false) }

        suggestionStrip = view.findViewById(R.id.suggestionStrip)
        suggestionButtons = listOf(
            view.findViewById(R.id.suggestion0),
            view.findViewById(R.id.suggestion1),
            view.findViewById(R.id.suggestion2),
        )
        suggestionDividers = listOf(
            view.findViewById(R.id.suggestionDivider1),
            view.findViewById(R.id.suggestionDivider2),
        )
        suggestionButtons.forEachIndexed { i, btn -> btn.setOnClickListener { onSuggestionTapped(i) } }
        clearSuggestions()

        inputView = view
        return view
    }

    private fun bindSymbolsPanel(root: View) {
        bindSymbolRow(root.findViewById(R.id.symRowDigits))
        bindSymbolRow(root.findViewById(R.id.symRow1))
        bindSymbolRow(root.findViewById(R.id.symRow2))
        bindSymbolRow(root.findViewById(R.id.symRow3))

        root.findViewById<Button>(R.id.keyDeleteSym).attachRepeat { deleteOne() }
        root.findViewById<Button>(R.id.keyCommaSym).attachRepeat { commit(",") }
        root.findViewById<Button>(R.id.keyPeriodSym).attachRepeat { commit(".") }
        root.findViewById<Button>(R.id.keySpaceSym).attachRepeat { commit(" ") }
        root.findViewById<Button>(R.id.keyEnterSym).setOnClickListener { sendEnter() }
    }

    private fun bindSymbolRow(row: LinearLayout) {
        for (i in 0 until row.childCount) {
            val child = row.getChildAt(i)
            if (child is Button) {
                val text = child.text.toString()
                child.attachRepeat { commit(text) }
            }
        }
    }

    private fun showSymbolsPanel(root: View, showSymbols: Boolean) {
        if (correctionInProgress) return
        root.findViewById<View>(R.id.lettersPanel).visibility = if (showSymbols) View.GONE else View.VISIBLE
        root.findViewById<View>(R.id.symbolsPanel).visibility = if (showSymbols) View.VISIBLE else View.GONE
    }

    private fun bindLetterRow(row: LinearLayout) {
        for (i in 0 until row.childCount) {
            val child = row.getChildAt(i)
            if (child is Button) {
                letterButtons.add(child)
                child.attachLetterKey()
            }
        }
    }

    private fun bindRow3(row: LinearLayout) {
        for (i in 0 until row.childCount) {
            val child = row.getChildAt(i)
            if (child is Button && child.id != R.id.keyShift && child.id != R.id.keyDelete) {
                letterButtons.add(child)
                child.attachLetterKey()
            }
        }
    }

    private fun systemLanguage(): String = resources.configuration.locales[0].language

    private fun currentLayout(): KeyboardLayout = when (systemLanguage()) {
        "fr" -> LAYOUT_AZERTY
        "de" -> LAYOUT_QWERTZ
        else -> LAYOUT_QWERTY
    }

    private fun applyKeyboardLayout(view: View) {
        val layout = currentLayout()
        fillLetterRow(view.findViewById(R.id.row1), layout.row1)
        fillLetterRow(view.findViewById(R.id.row2), layout.row2)
        fillRow3Letters(view.findViewById(R.id.row3), layout.row3)
        refreshLetterCase()
    }

    private fun fillLetterRow(row: LinearLayout, chars: String) {
        var i = 0
        for (j in 0 until row.childCount) {
            val child = row.getChildAt(j)
            if (child is Button && i < chars.length) {
                child.text = chars[i].toString()
                i++
            }
        }
    }

    private fun fillRow3Letters(row: LinearLayout, chars: String) {
        var i = 0
        for (j in 0 until row.childCount) {
            val child = row.getChildAt(j)
            if (child is Button && child.id != R.id.keyShift && child.id != R.id.keyDelete && i < chars.length) {
                child.text = chars[i].toString()
                i++
            }
        }
    }

    private fun bindRow4(root: View) {
        root.findViewById<Button>(R.id.keyComma).attachRepeat { commit(",") }
        root.findViewById<Button>(R.id.keyPeriod).attachRepeat { commit(".") }
    }

    private fun View.attachRepeat(action: () -> Unit) {
        var repeatRunnable: Runnable? = null

        setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    v.isPressed = true
                    action()
                    repeatRunnable = object : Runnable {
                        override fun run() {
                            action()
                            mainHandler.postDelayed(this, REPEAT_INTERVAL_MS)
                        }
                    }
                    mainHandler.postDelayed(repeatRunnable!!, REPEAT_INITIAL_DELAY_MS)
                    true
                }
                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    repeatRunnable?.let { mainHandler.removeCallbacks(it) }
                    repeatRunnable = null
                    if (event.action == MotionEvent.ACTION_UP) v.performClick()
                    true
                }
                else -> false
            }
        }
    }

    private fun dp(value: Float): Int = (value * resources.displayMetrics.density).toInt()

    /** Variantes accentuées de la lettre affichée par la touche, ou null si aucune. */
    private fun variantsFor(button: Button): List<Char>? {
        val text = button.text?.toString() ?: return null
        if (text.length != 1) return null
        return ACCENT_VARIANTS[text[0].lowercaseChar()]
    }

    /**
     * Gestion tactile des touches lettres : écrit au relâchement (tap), et sur appui long
     * affiche le popup de variantes accentuées que l'on sélectionne en glissant le doigt.
     */
    private fun Button.attachLetterKey() {
        val key = this
        var longPressRunnable: Runnable? = null

        setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    if (correctionInProgress) return@setOnTouchListener true
                    v.isPressed = true
                    val variants = variantsFor(key)
                    if (variants != null) {
                        val r = Runnable {
                            longPressRunnable = null
                            showAccentPopup(key, variants)
                        }
                        longPressRunnable = r
                        mainHandler.postDelayed(r, LONG_PRESS_MS)
                    }
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (accentPopupShowing) updateAccentHighlight(event.rawX, event.rawY)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    v.isPressed = false
                    longPressRunnable?.let { mainHandler.removeCallbacks(it) }
                    longPressRunnable = null
                    if (accentPopupShowing) {
                        commitHighlightedAccent(event.rawX, event.rawY)
                        dismissAccentPopup()
                    } else {
                        commit(key.text.toString())
                    }
                    true
                }
                MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    longPressRunnable?.let { mainHandler.removeCallbacks(it) }
                    longPressRunnable = null
                    dismissAccentPopup()
                    true
                }
                else -> false
            }
        }
    }

    private fun showAccentPopup(key: Button, variants: List<Char>) {
        if (correctionInProgress) return
        val anchor = inputView ?: return
        dismissAccentPopup()

        val upper = shiftState != ShiftState.OFF
        val chipW = dp(POPUP_CHIP_WIDTH_DP)
        val chipH = dp(POPUP_CHIP_HEIGHT_DP)
        val margin = dp(POPUP_CHIP_MARGIN_DP)
        val pad = dp(POPUP_PADDING_DP)

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(pad, pad, pad, pad)
            background = ContextCompat.getDrawable(this@CorrectKeyboardService, R.drawable.key_bg)
            backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(this@CorrectKeyboardService, R.color.key_surface_wide))
        }
        val chips = variants.map { ch ->
            TextView(this).apply {
                text = if (upper) ch.toString().uppercase() else ch.toString()
                textSize = 22f
                gravity = Gravity.CENTER
                setTextColor(ContextCompat.getColor(this@CorrectKeyboardService, R.color.key_text))
                background = ContextCompat.getDrawable(this@CorrectKeyboardService, R.drawable.key_bg)
                val lp = LinearLayout.LayoutParams(chipW, chipH).apply { setMargins(margin, 0, margin, 0) }
                container.addView(this, lp)
            }
        }

        accentChips = chips
        accentVariants = variants
        accentHighlightIndex = 0
        accentPopupShowing = true

        val popupW = chips.size * (chipW + 2 * margin) + 2 * pad
        val popupH = chipH + 2 * pad

        val popup = PopupWindow(container, popupW, popupH, false).apply {
            isClippingEnabled = false
            isTouchable = false   // la touche d'origine garde le grab tactile
            isFocusable = false
            isOutsideTouchable = false
            setBackgroundDrawable(null)
        }
        accentPopup = popup

        val keyLoc = IntArray(2)
        key.getLocationOnScreen(keyLoc)
        val keyCenterX = keyLoc[0] + key.width / 2
        // Centrer la chip[0] (le défaut) sur le centre de la touche.
        val chip0CenterOffset = pad + margin + chipW / 2
        val screenW = if (anchor.width > 0) anchor.width else resources.displayMetrics.widthPixels
        val x = (keyCenterX - chip0CenterOffset).coerceIn(0, (screenW - popupW).coerceAtLeast(0))
        val y = keyLoc[1] - popupH - dp(POPUP_GAP_ABOVE_KEY_DP)

        highlightChip(0)
        try {
            popup.showAtLocation(anchor, Gravity.NO_GRAVITY, x, y)
        } catch (_: Throwable) {
            dismissAccentPopup()
        }
    }

    /** Index de la chip sous la position écran donnée, ou null si en dehors horizontalement. */
    private fun chipIndexAt(rawX: Float): Int? {
        val loc = IntArray(2)
        for ((i, chip) in accentChips.withIndex()) {
            chip.getLocationOnScreen(loc)
            if (rawX >= loc[0] && rawX < loc[0] + chip.width) return i
        }
        return null
    }

    private fun updateAccentHighlight(rawX: Float, rawY: Float) {
        val idx = chipIndexAt(rawX) ?: return
        if (idx != accentHighlightIndex) {
            accentHighlightIndex = idx
            highlightChip(idx)
        }
    }

    private fun highlightChip(index: Int) {
        accentChips.forEachIndexed { i, chip ->
            val active = i == index
            chip.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(this, if (active) R.color.key_accent_active else R.color.key_surface))
            chip.setTextColor(ContextCompat.getColor(this, if (active) R.color.white else R.color.key_text))
        }
    }

    private fun commitHighlightedAccent(rawX: Float, rawY: Float) {
        if (accentVariants.isEmpty()) return
        val hit = chipIndexAt(rawX)
        // Relâché clairement sous la barre (≥ 1 hauteur de chip dessous) : on n'écrit rien.
        val first = accentChips.firstOrNull()
        val belowStrip = if (first != null) {
            val loc = IntArray(2)
            first.getLocationOnScreen(loc)
            rawY > loc[1] + first.height + dp(POPUP_CHIP_HEIGHT_DP)
        } else false
        when {
            hit != null -> commit(accentVariants[hit].toString())
            belowStrip -> { /* hors zone : rien */ }
            else -> commit(accentVariants[accentHighlightIndex].toString()) // défaut (é)
        }
    }

    private fun dismissAccentPopup() {
        accentPopupShowing = false
        accentChips = emptyList()
        accentVariants = emptyList()
        accentHighlightIndex = 0
        accentPopup?.let { p ->
            if (p.isShowing) {
                try { p.dismiss() } catch (_: Throwable) {}
            }
        }
        accentPopup = null
    }

    private fun toggleEmojiPanel(root: View) {
        if (correctionInProgress) return
        val panel = root.findViewById<View>(R.id.emojiPanel)
        val area = root.findViewById<View>(R.id.keyboardArea)
        val opening = panel.visibility != View.VISIBLE
        panel.visibility = if (opening) View.VISIBLE else View.GONE
        area.visibility = if (opening) View.GONE else View.VISIBLE
        root.findViewById<Button>(R.id.btnEmoji).text = if (opening) "⌨️" else "😀"

        // En mode smiley, la barre de complétion disparaît ; les emojis fréquents
        // sont affichés dans leur rangée dédiée, en haut du panneau.
        emojiMode = opening
        if (opening) {
            suggestionStrip?.visibility = View.GONE
            buildFrequentEmojiRow(root)
        } else {
            suggestionStrip?.visibility = if (completionEnabled) View.VISIBLE else View.GONE
            clearSuggestions()
        }
    }

    private fun buildEmojiPanel(root: View) {
        val tabs = root.findViewById<LinearLayout>(R.id.emojiTabs)
        val grid = root.findViewById<GridLayout>(R.id.emojiGrid)
        tabs.removeAllViews()
        emojiTabButtons.clear()
        for ((index, category) in EMOJI_CATEGORIES.withIndex()) {
            val tabBtn = Button(this).apply {
                text = category.icon
                textSize = 18f
                isAllCaps = false
                setTextColor(ContextCompat.getColor(this@CorrectKeyboardService, R.color.key_text))
                minWidth = 0
                minimumWidth = 0
                setPadding(28, 12, 28, 12)
                setOnClickListener { showEmojiCategory(grid, index) }
            }
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { setMargins(1, 2, 1, 2) }
            tabs.addView(tabBtn, params)
            emojiTabButtons.add(tabBtn)
        }
        showEmojiCategory(grid, 0)
    }

    private fun showEmojiCategory(grid: GridLayout, index: Int) {
        currentEmojiCategory = index
        val activeColor = ContextCompat.getColor(this, R.color.key_accent_active)
        val inactiveColor = ContextCompat.getColor(this, R.color.key_surface_wide)
        for ((i, btn) in emojiTabButtons.withIndex()) {
            btn.setBackgroundColor(if (i == index) activeColor else inactiveColor)
        }
        grid.removeAllViews()
        val surface = ContextCompat.getColor(this, R.color.key_surface)
        val textColor = ContextCompat.getColor(this, R.color.key_text)
        for (emoji in EMOJI_CATEGORIES[index].emojis) {
            val btn = Button(this).apply {
                text = emoji
                textSize = 20f
                isAllCaps = false
                setBackgroundColor(surface)
                setTextColor(textColor)
                minWidth = 0
                minimumWidth = 0
                setPadding(0, 0, 0, 0)
                setOnClickListener { onEmojiPicked(emoji) }
            }
            val params = GridLayout.LayoutParams().apply {
                width = 0
                height = ViewGroup.LayoutParams.WRAP_CONTENT
                columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1, GridLayout.FILL, 1f)
                setMargins(2, 2, 2, 2)
            }
            grid.addView(btn, params)
        }
    }

    private fun commit(text: String) {
        if (correctionInProgress) return
        val ic = currentInputConnection ?: return
        val upper = shiftState != ShiftState.OFF && text.length == 1 && text[0].isLetter()
        val out = if (upper) text.uppercase() else text
        ic.commitText(out, 1)
        if (shiftState == ShiftState.ONE_SHOT) {
            shiftState = ShiftState.OFF
            refreshShiftVisual()
            refreshLetterCase()
        }
        refreshSuggestions()
    }

    // ===================== Complétion de mots =====================

    /** Le mot en cours de frappe : les lettres juste avant le curseur. */
    private fun currentWord(): String {
        val ic = currentInputConnection ?: return ""
        val before = ic.getTextBeforeCursor(64, 0)?.toString() ?: return ""
        var i = before.length
        while (i > 0 && before[i - 1].isLetter()) i--
        return before.substring(i)
    }

    /** Met la 1ʳᵉ lettre en majuscule si le morceau tapé l'est, ou si Shift est actif. */
    private fun applyCase(word: String, partial: String): String {
        if (word.isEmpty()) return word
        val cap = (partial.isNotEmpty() && partial[0].isUpperCase()) || shiftState != ShiftState.OFF
        return if (cap) word[0].uppercaseChar() + word.substring(1) else word
    }

    /**
     * Recalcule et affiche les suggestions pour le mot en cours. Ne touche JAMAIS
     * à la visibilité de la barre (gérée uniquement par le réglage, dans
     * onStartInputView) : la hauteur du clavier reste donc constante.
     */
    private fun refreshSuggestions() {
        if (emojiMode) return // la barre est masquée en mode smiley (rangée emoji dédiée)
        if (!completionEnabled || correctionInProgress) { clearSuggestions(); return }
        if (suggestionButtons.isEmpty()) return
        val word = currentWord()
        if (word.isEmpty()) { clearSuggestions(); return }
        val results = completionEngine.suggest(word, suggestionButtons.size)
        suggestionButtons.forEachIndexed { i, btn ->
            val r = results.getOrNull(i)
            btn.text = if (r != null) applyCase(r, word) else ""
            btn.textSize = SUGGESTION_TEXT_SP
        }
        // Un séparateur n'est visible que s'il y a un mot à sa droite.
        suggestionDividers.forEachIndexed { i, divider ->
            divider.visibility = if (results.size > i + 1) View.VISIBLE else View.INVISIBLE
        }
    }

    /** Vide les suggestions sans masquer la barre (hauteur stable). */
    private fun clearSuggestions() {
        suggestionButtons.forEach { it.text = "" }
        suggestionDividers.forEach { it.visibility = View.INVISIBLE }
    }

    /** Remplace le morceau tapé par le mot complet + une espace. */
    private fun onSuggestionTapped(index: Int) {
        if (correctionInProgress) return
        val ic = currentInputConnection ?: return
        val word = currentWord()
        if (word.isEmpty()) return
        val full = suggestionButtons.getOrNull(index)?.text?.toString().orEmpty()
        if (full.isEmpty()) return
        ic.beginBatchEdit()
        ic.deleteSurroundingText(word.length, 0) // efface le morceau déjà inséré
        ic.commitText("$full ", 1)
        ic.endBatchEdit()
        if (shiftState == ShiftState.ONE_SHOT) {
            shiftState = ShiftState.OFF
            refreshShiftVisual()
            refreshLetterCase()
        }
        clearSuggestions()
    }

    // ===================== Emojis fréquents =====================

    /** Insère un emoji et incrémente son compteur d'usage. */
    private fun onEmojiPicked(emoji: String) {
        recordEmojiUse(emoji)
        commit(emoji)
    }

    /** (Re)construit la rangée dédiée des emojis les plus utilisés (panneau smiley). */
    private fun buildFrequentEmojiRow(root: View) {
        val row = root.findViewById<LinearLayout>(R.id.emojiFrequentRow)
        row.removeAllViews()
        val textColor = ContextCompat.getColor(this, R.color.key_text)
        for (emoji in topEmojis(FREQUENT_EMOJI_COUNT)) {
            val btn = Button(this).apply {
                text = emoji
                textSize = EMOJI_ROW_TEXT_SP
                isAllCaps = false
                setBackgroundColor(Color.TRANSPARENT) // laisse voir le bandeau
                setTextColor(textColor)
                minWidth = 0
                minimumWidth = 0
                setPadding(0, 0, 0, 0)
                setOnClickListener { onEmojiPicked(emoji) }
            }
            val params = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)
            params.setMargins(2, 2, 2, 2)
            row.addView(btn, params)
        }
    }

    private fun recordEmojiUse(emoji: String) {
        val prefs = getPreferences()
        val map = parseEmojiFreq(prefs.getString(KEY_EMOJI_FREQ, null))
        map[emoji] = (map[emoji] ?: 0) + 1
        prefs.edit().putString(KEY_EMOJI_FREQ, serializeEmojiFreq(map)).apply()
    }

    /** Top-N emojis par fréquence ; complété par des emojis par défaut si l'historique est court. */
    private fun topEmojis(n: Int): List<String> {
        val map = parseEmojiFreq(getPreferences().getString(KEY_EMOJI_FREQ, null))
        val ordered = map.entries.sortedByDescending { it.value }.map { it.key }.toMutableList()
        for (e in DEFAULT_FREQUENT_EMOJIS) {
            if (ordered.size >= n) break
            if (e !in ordered) ordered.add(e)
        }
        return ordered.take(n)
    }

    private fun parseEmojiFreq(s: String?): MutableMap<String, Int> {
        val map = LinkedHashMap<String, Int>()
        if (s.isNullOrEmpty()) return map
        try {
            val obj = JSONObject(s)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = obj.optInt(k)
            }
        } catch (_: Exception) {
        }
        return map
    }

    private fun serializeEmojiFreq(map: Map<String, Int>): String {
        val obj = JSONObject()
        for ((k, v) in map) obj.put(k, v)
        return obj.toString()
    }

    private fun onShiftClick() {
        if (correctionInProgress) return
        shiftState = when (shiftState) {
            ShiftState.OFF -> ShiftState.ONE_SHOT
            ShiftState.ONE_SHOT -> ShiftState.OFF
            ShiftState.LOCKED -> ShiftState.OFF
        }
        refreshShiftVisual()
        refreshLetterCase()
    }

    private fun onShiftLongPress(): Boolean {
        if (correctionInProgress) return true
        shiftState = ShiftState.LOCKED
        refreshShiftVisual()
        refreshLetterCase()
        return true
    }

    private fun refreshShiftVisual() {
        val btn = shiftButton ?: return
        when (shiftState) {
            ShiftState.OFF -> {
                btn.text = "⇧"
                btn.backgroundTintList = ColorStateList.valueOf(
                    ContextCompat.getColor(this, R.color.key_surface_wide))
            }
            ShiftState.ONE_SHOT -> {
                btn.text = "⇧"
                btn.backgroundTintList = ColorStateList.valueOf(
                    ContextCompat.getColor(this, R.color.key_accent_active))
            }
            ShiftState.LOCKED -> {
                btn.text = "⇪"
                btn.backgroundTintList = ColorStateList.valueOf(
                    ContextCompat.getColor(this, R.color.key_accent_locked))
            }
        }
    }

    private fun refreshLetterCase() {
        val upper = shiftState != ShiftState.OFF
        for (b in letterButtons) {
            val t = b.text?.toString() ?: continue
            if (t.length == 1 && t[0].isLetter()) {
                b.text = if (upper) t.uppercase() else t.lowercase()
            }
        }
    }

    private fun deleteOne() {
        if (correctionInProgress) return
        val ic = currentInputConnection ?: return
        val selected = ic.getSelectedText(0)
        if (!selected.isNullOrEmpty()) {
            ic.commitText("", 1)
        } else {
            ic.deleteSurroundingText(1, 0)
        }
        refreshSuggestions()
    }

    private fun sendEnter() {
        if (correctionInProgress) return
        val ic = currentInputConnection ?: return

        val editorInfo = currentInputEditorInfo
        // Sur un champ mono-ligne avec une action (Envoyer, Rechercher, OK…),
        // Entrée déclenche cette action plutôt que d'insérer un retour à la ligne.
        if (editorInfo != null && !isMultiLineField(editorInfo)) {
            val imeOptions = editorInfo.imeOptions
            val action = imeOptions and EditorInfo.IME_MASK_ACTION
            val noEnterAction = (imeOptions and EditorInfo.IME_FLAG_NO_ENTER_ACTION) != 0
            if (!noEnterAction &&
                action != EditorInfo.IME_ACTION_NONE &&
                action != EditorInfo.IME_ACTION_UNSPECIFIED) {
                ic.performEditorAction(action)
                return
            }
        }
        ic.commitText("\n", 1)
    }

    /** Vrai si le champ accepte plusieurs lignes (zone de texte type note/message). */
    private fun isMultiLineField(editorInfo: EditorInfo): Boolean {
        val inputType = editorInfo.inputType
        if ((inputType and InputType.TYPE_MASK_CLASS) != InputType.TYPE_CLASS_TEXT) return false
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        return (inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE) != 0 ||
            (inputType and InputType.TYPE_TEXT_FLAG_IME_MULTI_LINE) != 0 ||
            variation == InputType.TYPE_TEXT_VARIATION_LONG_MESSAGE
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        dismissAccentPopup()
        val newNight = newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK
        val newLanguage = newConfig.locales[0].language
        if ((newNight != lastUiMode || newLanguage != lastLanguage) && inputView != null) {
            setInputView(onCreateInputView())
        }
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        dismissAccentPopup()
        inputView?.let { view ->
            showSymbolsPanel(view, false)
            view.findViewById<View>(R.id.emojiPanel).visibility = View.GONE
            view.findViewById<View>(R.id.keyboardArea).visibility = View.VISIBLE
            view.findViewById<Button>(R.id.btnEmoji).text = "😀"
        }
        lastOriginalText = null
        updateUndoEnabled()
        emojiMode = false
        completionEnabled = getPreferences().getBoolean(KEY_COMPLETION, true)
        // Seul endroit qui change la visibilité de la barre (changement statique
        // à l'ouverture du champ, jamais pendant la frappe).
        suggestionStrip?.visibility = if (completionEnabled) View.VISIBLE else View.GONE
        clearSuggestions()
    }

    override fun onFinishInputView(finishingInput: Boolean) {
        dismissAccentPopup()
        clearSuggestions()
        super.onFinishInputView(finishingInput)
    }

    override fun onDestroy() {
        dismissAccentPopup()
        super.onDestroy()
    }

    private fun applyNavigationBarInset(root: View) {
        val basePadding = root.paddingBottom

        fun setBottom(extra: Int) {
            root.setPadding(root.paddingLeft, root.paddingTop, root.paddingRight, basePadding + extra)
        }

        // Avant que les insets ne soient dispatchés à la vue, on évite la frame
        // d'attente : en portrait on présume une barre nav, en paysage non.
        val initial = if (isPortrait()) navigationBarFallbackPx() else 0
        setBottom(initial)

        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val navBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
            v.setPadding(v.paddingLeft, v.paddingTop, v.paddingRight, basePadding + navBottom)
            insets
        }

        root.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(v: View) {
                ViewCompat.requestApplyInsets(v)
            }
            override fun onViewDetachedFromWindow(v: View) {}
        })
    }

    private fun isPortrait(): Boolean {
        return resources.configuration.orientation == Configuration.ORIENTATION_PORTRAIT
    }

    private fun navigationBarFallbackPx(): Int {
        val resId = resources.getIdentifier("navigation_bar_height", "dimen", "android")
        val fromResource = if (resId > 0) resources.getDimensionPixelSize(resId) else 0
        if (fromResource > 0) return fromResource
        return (NAV_BAR_FALLBACK_DP * resources.displayMetrics.density).toInt()
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    private fun applyCorrection() {
        if (correctionInProgress) {
            Log.i(TAG, "applyCorrection ignoré : correction déjà en cours")
            return
        }
        val ic = currentInputConnection
        if (ic == null) {
            Log.w(TAG, "applyCorrection : currentInputConnection == null (aucun champ lié)")
            return
        }

        // Mode serveur uniquement : on récupère le token (obtenu via connexion).
        val token = EncryptedKeyStore.getServerToken(this)
        Log.i(TAG, "applyCorrection : token présent=${token.isNotEmpty()} (len=${token.length})")
        if (token.isEmpty()) {
            showMissingTokenDialog()
            return
        }

        val language = getSelectedLanguage()

        ic.finishComposingText()
        val selected = ic.getSelectedText(0)?.toString().orEmpty()
        val original: String
        if (selected.isNotBlank()) {
            original = selected
            correctionWasSelection = true
        } else {
            val before = ic.getTextBeforeCursor(MAX_CHARS, 0)?.toString().orEmpty()
            val after = ic.getTextAfterCursor(MAX_CHARS, 0)?.toString().orEmpty()
            original = before + after
            correctionWasSelection = false
        }

        Log.i(TAG, "applyCorrection : sélection=$correctionWasSelection, longueur texte=${original.length}")
        if (original.isBlank()) {
            Log.w(TAG, "applyCorrection : texte vide → 'Rien à corriger'")
            Toast.makeText(this, "Rien à corriger", Toast.LENGTH_SHORT).show()
            return
        }

        if (!correctionWasSelection && shouldShowLongTextWarning(original)) {
            showLongTextWarning { launchCorrection(original, token, language) }
            return
        }

        launchCorrection(original, token, language)
    }

    private fun launchCorrection(original: String, token: String, language: String) {
        dismissAccentPopup()
        correctionInProgress = true
        clearSuggestions()
        pendingResult = null
        correctionOriginal = original
        lastOriginalText = null
        updateUndoEnabled()
        startCorrectionAnimation()

        AiCorrectClient.correct(
            token = token,
            language = language,
            locale = deviceLocaleTag(),
            text = original,
            onSuccess = { corrected ->
                Log.i(TAG, "correction OK : longueur résultat=${corrected.length}")
                mainHandler.post { pendingResult = PendingResult(corrected, null) }
            },
            onError = { err ->
                Log.w(TAG, "correction ÉCHEC : $err")
                mainHandler.post { pendingResult = PendingResult(original, err) }
            },
        )
    }

    /** BCP 47 tag du locale device (ex. "fr-FR", "en-US"). Pour analytics futur. */
    private fun deviceLocaleTag(): String {
        val locales = resources.configuration.locales
        val primary = if (locales.isEmpty) java.util.Locale.getDefault() else locales[0]
        return primary.toLanguageTag()
    }

    private fun shouldShowLongTextWarning(text: String): Boolean {
        if (getPreferences().getBoolean(KEY_HIDE_LONG_TEXT_WARNING, false)) return false
        if (text.length < LONG_TEXT_THRESHOLD) return false
        return hasReplyHistory(text)
    }

    private fun hasReplyHistory(text: String): Boolean {
        if (text.lineSequence().any { it.trimStart().startsWith(">") }) return true
        val markers = listOf(
            "-----Original Message-----",
            "-----Message d'origine-----",
            "________________________________",
        )
        if (markers.any { text.contains(it) }) return true
        for (line in text.lineSequence()) {
            val trimmed = line.trim()
            if (trimmed.startsWith("On ", ignoreCase = true) &&
                trimmed.endsWith("wrote:", ignoreCase = true)) return true
            if (trimmed.startsWith("Le ", ignoreCase = true) &&
                (trimmed.endsWith("a écrit :", ignoreCase = true) ||
                 trimmed.endsWith("a écrit:", ignoreCase = true))) return true
        }
        return false
    }

    private fun showMissingTokenDialog() {
        val token = inputView?.windowToken ?: run {
            // Fallback rare : on n'a pas de windowToken pour attacher le dialog
            // (ex. clavier détaché). On retombe sur le toast pour ne rien perdre.
            Toast.makeText(this, getString(R.string.toast_no_server_token), Toast.LENGTH_LONG).show()
            return
        }
        val content = layoutInflater.inflate(R.layout.dialog_missing_token, null)
        val dialog = AlertDialog.Builder(this)
            .setView(content)
            .setPositiveButton(R.string.dialog_login) { _, _ ->
                openLogin()
            }
            .setNegativeButton(R.string.dialog_close, null)
            .create()
        val window = dialog.window ?: return
        val lp = window.attributes
        lp.token = token
        lp.type = WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG
        window.attributes = lp
        dialog.show()
    }

    private fun openLogin() {
        try {
            val intent = Intent(this, LoginActivity::class.java).apply {
                // Lancement d'une Activity depuis un Service : pas de back-stack.
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (_: Throwable) {
            openAiCorrectWebsite()
        }
    }

    private fun openAiCorrectWebsite() {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://aicorrect.app")).apply {
                // Obligatoire : on lance un Activity depuis un Service (pas de back-stack).
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        } catch (_: Throwable) {
            // Pas de navigateur installé / activity non résolue
            Toast.makeText(this, "https://aicorrect.app", Toast.LENGTH_LONG).show()
        }
    }

    private fun showLongTextWarning(onContinue: () -> Unit) {
        val token = inputView?.windowToken ?: run { onContinue(); return }
        val content = layoutInflater.inflate(R.layout.dialog_long_text_warning, null)
        val checkbox = content.findViewById<CheckBox>(R.id.cbDontShowAgain)
        val dialog = AlertDialog.Builder(this)
            .setView(content)
            .setPositiveButton(R.string.dialog_continue) { _, _ ->
                if (checkbox.isChecked) {
                    getPreferences().edit().putBoolean(KEY_HIDE_LONG_TEXT_WARNING, true).apply()
                }
                onContinue()
            }
            .setNegativeButton(R.string.dialog_cancel) { _, _ ->
                if (checkbox.isChecked) {
                    getPreferences().edit().putBoolean(KEY_HIDE_LONG_TEXT_WARNING, true).apply()
                }
            }
            .create()
        val window = dialog.window ?: return
        val lp = window.attributes
        lp.token = token
        lp.type = WindowManager.LayoutParams.TYPE_APPLICATION_ATTACHED_DIALOG
        window.attributes = lp
        dialog.show()
    }

    private fun finalizeCorrection(result: PendingResult) {
        stopCorrectionAnimation()
        if (correctionWasSelection) {
            currentInputConnection?.commitText(result.text, 1)
        } else {
            replaceWholeField(result.text)
        }
        correctionInProgress = false
        pendingResult = null
        if (result.errorMsg == null) {
            lastOriginalText = correctionOriginal
            lastWasSelection = correctionWasSelection
            lastCorrectedLength = result.text.length
        }
        correctionOriginal = null
        updateUndoEnabled()
        refreshSuggestions()
        result.errorMsg?.let { err ->
            Toast.makeText(
                this,
                "${getString(R.string.toast_correction_failed)} : $err",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun undoCorrection() {
        if (correctionInProgress) return
        val original = lastOriginalText ?: return
        if (lastWasSelection) {
            val ic = currentInputConnection ?: return
            ic.beginBatchEdit()
            ic.deleteSurroundingText(lastCorrectedLength, 0)
            ic.commitText(original, 1)
            ic.endBatchEdit()
        } else {
            replaceWholeField(original)
        }
        lastOriginalText = null
        updateUndoEnabled()
    }

    private fun updateUndoEnabled() {
        val enabled = lastOriginalText != null && !correctionInProgress
        undoButton?.let {
            it.isEnabled = enabled
            it.alpha = if (enabled) 1f else 0.4f
        }
    }

    private fun startCorrectionAnimation() {
        val btn = correctButton ?: return

        correctButtonOriginalBackground = btn.background
        correctButtonOriginalTint = btn.backgroundTintList

        val corner = WAVE_CORNER_RADIUS_DP * resources.displayMetrics.density
        val drawable = WaveBackgroundDrawable(
            // Base = couleur de fond du bouton (bleu marine en clair, gris en sombre),
            // pour garder la couleur du bouton pendant l'animation au lieu d'un bleu.
            ContextCompat.getColor(this, R.color.correct_button_bg),
            ContextCompat.getColor(this, R.color.wave_highlight),
            corner,
        )
        waveDrawable = drawable
        btn.backgroundTintList = null
        btn.background = drawable

        waveAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = ANIM_PASS_DURATION_MS
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener { drawable.headFraction = it.animatedValue as Float }
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationRepeat(animation: Animator) {
                    pendingResult?.let { result ->
                        animation.cancel()
                        finalizeCorrection(result)
                    }
                }
            })
            start()
        }
    }

    private fun stopCorrectionAnimation() {
        waveAnimator?.cancel()
        waveAnimator = null
        waveDrawable = null
        correctButton?.let { btn ->
            btn.background = correctButtonOriginalBackground
            btn.backgroundTintList = correctButtonOriginalTint
        }
        correctButtonOriginalBackground = null
        correctButtonOriginalTint = null
    }

    private fun replaceWholeField(newText: String) {
        val ic = currentInputConnection ?: return
        ic.beginBatchEdit()
        val curBefore = ic.getTextBeforeCursor(MAX_CHARS, 0)?.toString().orEmpty()
        val curAfter = ic.getTextAfterCursor(MAX_CHARS, 0)?.toString().orEmpty()
        ic.deleteSurroundingText(curBefore.length, curAfter.length)
        ic.commitText(newText, 1)
        ic.endBatchEdit()
    }

    private fun getSelectedLanguage(): String {
        return getPreferences().getString(KEY_LANGUAGE, DEFAULT_LANGUAGE) ?: DEFAULT_LANGUAGE
    }

    private fun getPreferences(): SharedPreferences {
        val storageContext = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            createDeviceProtectedStorageContext()
        } else {
            this
        }
        return storageContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    companion object {
        private const val TAG = "AiCorrectKbd"
        private const val PREFS_NAME = "ime_prefs"
        private const val KEY_COMPLETION = "word_completion"
        private const val KEY_LANGUAGE = "language"
        private const val KEY_EMOJI_FREQ = "emoji_freq"
        private const val SUGGESTION_TEXT_SP = 16f
        private const val EMOJI_ROW_TEXT_SP = 20f
        private const val FREQUENT_EMOJI_COUNT = 8
        private val DEFAULT_FREQUENT_EMOJIS =
            listOf("😀", "😂", "❤️", "👍", "🙏", "😊", "🎉", "😍")
        private const val KEY_HIDE_LONG_TEXT_WARNING = "hide_long_text_warning"
        private const val LONG_TEXT_THRESHOLD = 500

        private data class KeyboardLayout(val row1: String, val row2: String, val row3: String)
        private val LAYOUT_AZERTY = KeyboardLayout("azertyuiop", "qsdfghjklm", "wxcvbn'")
        private val LAYOUT_QWERTY = KeyboardLayout("qwertyuiop", "asdfghjkl", "zxcvbnm")
        private val LAYOUT_QWERTZ = KeyboardLayout("qwertzuiop", "asdfghjkl", "yxcvbnm")
        private const val DEFAULT_LANGUAGE = "fr"
        private const val MAX_CHARS = 10000
        private const val REPEAT_INITIAL_DELAY_MS = 400L
        private const val REPEAT_INTERVAL_MS = 50L
        private const val ANIM_PASS_DURATION_MS = 700L
        private const val NAV_BAR_FALLBACK_DP = 48f
        private const val WAVE_CORNER_RADIUS_DP = 8f
        private const val LONG_PRESS_MS = 300L
        private const val POPUP_CHIP_WIDTH_DP = 44f
        private const val POPUP_CHIP_HEIGHT_DP = 48f
        private const val POPUP_CHIP_MARGIN_DP = 2f
        private const val POPUP_PADDING_DP = 2f
        private const val POPUP_GAP_ABOVE_KEY_DP = 6f

        /** Variantes accentuées par lettre de base (minuscule) ; 1ʳᵉ = défaut au relâchement. */
        private val ACCENT_VARIANTS: Map<Char, List<Char>> = mapOf(
            'e' to listOf('é', 'è', 'ê', 'ë'),
            'a' to listOf('à', 'â', 'æ', 'ä', 'á'),
            'i' to listOf('î', 'ï', 'í', 'ì'),
            'o' to listOf('ô', 'ö', 'œ', 'ó', 'ò'),
            'u' to listOf('ù', 'û', 'ü', 'ú'),
            'c' to listOf('ç'),
            'n' to listOf('ñ'),
            'y' to listOf('ÿ'),
        )
        private data class EmojiCategory(val icon: String, val emojis: List<String>)

        private val EMOJI_CATEGORIES = listOf(
            EmojiCategory("😀", listOf(
                "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
                "😉","😊","😇","🥰","😍","🤩","😘","😋","😜","🤪",
                "😎","🤔","🤨","😏","😒","🙄","😬","😮","😯","😲",
                "🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵",
                "🥶","😱","😨","😰","😥","😓","🤗","🤭","😶","🤐",
                "😔","😪","😴","🤤","🤒","🤕","🤧","🥴","😷","🤠",
            )),
            EmojiCategory("👍", listOf(
                "👍","👎","👌","✌️","🤞","🤘","🤙","👈","👉","👆",
                "👇","☝️","👋","🤚","✋","🖖","👏","🙌","🙏","🤝",
                "🤲","✊","👊","💪","👀","👁️","👃","👄","👅","🧠",
                "👶","👦","👧","👨","👩","🧑","👴","👵","💃","🕺",
                "🤷","🤦","🙋","🙇","🚶","🏃","🧎","🧍",
            )),
            EmojiCategory("❤️", listOf(
                "❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","💕",
                "💞","💓","💗","💖","💘","💝","💟","♥️","💔","❣️",
                "💌","💋","💯","💢","💥","💫","💦","💨","💭","💤",
                "🌹","🌷","🌸","💐","🌺","🌻","🌼","🌿","🍀","🍃",
            )),
            EmojiCategory("🐶", listOf(
                "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
                "🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆",
                "🦅","🦉","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌",
                "🐞","🐢","🐍","🐙","🐠","🐟","🐬","🦈","🐳","🐊",
                "🦒","🐘","🐪","🐫","🐃","🐎","🐖","🐑","🐐","🦌",
                "🐕","🐈","🐓","🦃","🕊️","🐇","🌳","🌲","🌴","🌵",
            )),
            EmojiCategory("🍕", listOf(
                "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍈",
                "🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🥦","🥬",
                "🥒","🌶️","🌽","🥕","🧅","🥔","🥐","🍞","🥖","🧀",
                "🥚","🍳","🥞","🥓","🍗","🍖","🌭","🍔","🍟","🍕",
                "🥪","🌮","🌯","🥗","🍝","🍜","🍲","🍛","🍣","🍱",
                "🥟","🍙","🍚","🍦","🍰","🎂","🍩","🍪","🍫","🍿",
                "🍯","🥛","☕","🍵","🥤","🍺","🍻","🥂","🍷","🍸",
            )),
            EmojiCategory("⚽", listOf(
                "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱","🏓",
                "🏸","🥊","⛳","🏹","🎣","🥋","⛸️","🎿","🏂","🏋️",
                "🤼","🤸","⛹️","🏌️","🏇","🧘","🏄","🏊","🚴","🚵",
                "🏆","🥇","🥈","🥉","🏅","🎖️","🎯","🎳","🎮","🎰",
                "🧩","♟️","🎲","🎭","🎨","🎬","🎤","🎧","🎼","🎵",
                "🎶","🎸","🎹","🎺","🎻","🥁","🚗","🚕","🚌","🚓",
                "🚑","🚒","🚜","🏍️","🚲","🛵","✈️","🚀","🛸","🚁",
                "⛵","🚤","🚢","🏠","🏡","🏢","🏥","🏫","🏰","🗼",
                "⛪","⛩️","🌉","🗽","⛲","🏖️","🏝️","🌋","⛰️","🗻",
                "🏕️","⛺","🌍","🌎","🌏","🗺️",
            )),
            EmojiCategory("💡", listOf(
                "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","💽","💾","💿",
                "📷","📸","📹","🎥","📞","☎️","📟","📠","📺","📻",
                "🎙️","⏰","⏱️","⏲️","⌛","⏳","📡","🔋","🔌","💡",
                "🔦","🕯️","🪔","💸","💵","💰","💳","💎","⚖️","🔧",
                "🔨","🛠️","⛏️","🔩","⚙️","🔫","💣","🪓","🔪","🗡️",
                "⚔️","🛡️","🚬","⚰️","🏺","🔮","📿","🧿","💈","🔭",
                "🔬","🌡️","💊","💉","🩸","🧬","🧪","🚽","🚿","🛁",
                "🧼","🧽","🛏️","🛋️","🪑","🚪","🛒","🎁","🎀","🎊",
                "🎉","🎈","🔑","🗝️","🖼️","✂️","📌","📍","📎","✏️",
                "🖊️","🖋️","📚","📖","📕","📗","📘","📙","📓","📒",
                "📔","📰","📅","📆","📇","🗂️","📁","📂","📊","📈",
                "📉","📋","🔖","💼","📧","✉️","📨","📩","📤","📥",
                "📦","📭","📮",
            )),
            EmojiCategory("✅", listOf(
                "✅","☑️","✔️","❌","❎","⭕","🚫","⛔","📛","❗",
                "❕","❓","❔","‼️","⁉️","💯","💢","♻️","🌀","💲",
                "®️","©️","™️","➕","➖","✖️","➗","♾️","↗️","↘️",
                "↙️","↖️","⬆️","⬇️","⬅️","➡️","↔️","↕️","🔃","🔄",
                "🔝","🔜","🔙","🔛","🔚","🔀","🔁","🔂","▶️","⏩",
                "◀️","⏪","⏸️","⏹️","🔆","🔅","📶","🔔","🔕","🔘",
                "🟢","🟡","🟠","🔴","🟣","🔵","⚫","⚪","🟤","🟥",
                "🟧","🟨","🟩","🟦","🟪","🟫","⬛","⬜","🔺","🔻",
                "🔸","🔹","🔶","🔷","🔳","🔲","☀️","🌤️","⛅","🌥️",
                "☁️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","🌪️",
                "🌫️","🌈","☔","💧","🌊","🔥","✨","⭐","🌟","💫",
                "☄️","🌙","☀️",
            )),
        )
    }
}

private class WaveBackgroundDrawable(
    private val baseColor: Int,
    private val highlightColor: Int,
    private val cornerRadiusPx: Float,
) : Drawable() {

    var headFraction: Float = 0f
        set(value) {
            if (field != value) {
                field = value
                invalidateSelf()
            }
        }

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rectF = RectF()

    override fun draw(canvas: Canvas) {
        val b = bounds
        val w = b.width().toFloat()
        val h = b.height().toFloat()
        if (w <= 0f || h <= 0f) return

        val waveWidth = w * WAVE_WIDTH_FRACTION
        val center = -waveWidth / 2f + headFraction * (w + waveWidth)
        val start = center - waveWidth / 2f
        val end = center + waveWidth / 2f

        paint.shader = LinearGradient(
            start, 0f, end, 0f,
            intArrayOf(baseColor, highlightColor, baseColor),
            floatArrayOf(0f, 0.5f, 1f),
            Shader.TileMode.CLAMP,
        )

        rectF.set(0f, 0f, w, h)
        canvas.drawRoundRect(rectF, cornerRadiusPx, cornerRadiusPx, paint)
    }

    override fun setAlpha(alpha: Int) {
        paint.alpha = alpha
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
        paint.colorFilter = colorFilter
    }

    @Deprecated("Deprecated in Java")
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT

    companion object {
        private const val WAVE_WIDTH_FRACTION = 0.35f
    }
}
