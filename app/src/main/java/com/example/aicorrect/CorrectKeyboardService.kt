package com.example.aicorrect

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.app.AlertDialog
import android.content.Context
import android.content.SharedPreferences
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Canvas
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
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.emoji2.bundled.BundledEmojiCompatConfig
import androidx.emoji2.text.EmojiCompat

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

    private data class PendingResult(val text: String, val errorMsg: String?)

    override fun onCreate() {
        super.onCreate()
        try {
            EmojiCompat.init(BundledEmojiCompatConfig(this))
        } catch (_: Throwable) {
            // already initialized (e.g. by androidx.startup) — keep existing instance
        }
    }

    override fun onCreateInputView(): View {
        lastUiMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        lastLanguage = systemLanguage()
        letterButtons.clear()
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)

        applyNavigationBarInset(view)

        correctButton = view.findViewById(R.id.btnCorrect)
        correctButton?.setOnClickListener { applyCorrection() }
        undoButton = view.findViewById(R.id.btnUndo)
        undoButton?.setOnClickListener { undoCorrection() }
        updateUndoEnabled()
        val emojiHeader = view.findViewById<Button>(R.id.btnEmoji)
        emojiHeader.text = processEmoji("😀")
        emojiHeader.setOnClickListener { toggleEmojiPanel(view) }
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
                child.attachRepeat { commit(child.text.toString()) }
            }
        }
    }

    private fun bindRow3(row: LinearLayout) {
        for (i in 0 until row.childCount) {
            val child = row.getChildAt(i)
            if (child is Button && child.id != R.id.keyShift && child.id != R.id.keyDelete) {
                letterButtons.add(child)
                child.attachRepeat { commit(child.text.toString()) }
            }
        }
    }

    private fun systemLanguage(): String = resources.configuration.locales[0].language

    private fun processEmoji(s: CharSequence): CharSequence = try {
        val ec = EmojiCompat.get()
        if (ec.loadState == EmojiCompat.LOAD_STATE_SUCCEEDED) ec.process(s) ?: s else s
    } catch (_: Throwable) { s }

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

    private fun toggleEmojiPanel(root: View) {
        if (correctionInProgress) return
        val panel = root.findViewById<View>(R.id.emojiPanel)
        val area = root.findViewById<View>(R.id.keyboardArea)
        val opening = panel.visibility != View.VISIBLE
        panel.visibility = if (opening) View.VISIBLE else View.GONE
        area.visibility = if (opening) View.GONE else View.VISIBLE
        root.findViewById<Button>(R.id.btnEmoji).text = processEmoji(if (opening) "⌨️" else "😀")
    }

    private fun buildEmojiPanel(root: View) {
        val tabs = root.findViewById<LinearLayout>(R.id.emojiTabs)
        val grid = root.findViewById<GridLayout>(R.id.emojiGrid)
        tabs.removeAllViews()
        emojiTabButtons.clear()
        for ((index, category) in EMOJI_CATEGORIES.withIndex()) {
            val tabBtn = Button(this).apply {
                text = processEmoji(category.icon)
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
                text = processEmoji(emoji)
                textSize = 20f
                isAllCaps = false
                setBackgroundColor(surface)
                setTextColor(textColor)
                minWidth = 0
                minimumWidth = 0
                setPadding(0, 0, 0, 0)
                setOnClickListener { commit(emoji) }
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
    }

    private fun sendEnter() {
        if (correctionInProgress) return
        val ic = currentInputConnection ?: return
        ic.commitText("\n", 1)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val newNight = newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK
        val newLanguage = newConfig.locales[0].language
        if ((newNight != lastUiMode || newLanguage != lastLanguage) && inputView != null) {
            setInputView(onCreateInputView())
        }
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        inputView?.let { view ->
            showSymbolsPanel(view, false)
            view.findViewById<View>(R.id.emojiPanel).visibility = View.GONE
            view.findViewById<View>(R.id.keyboardArea).visibility = View.VISIBLE
            view.findViewById<Button>(R.id.btnEmoji).text = processEmoji("😀")
        }
        lastOriginalText = null
        updateUndoEnabled()
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
        if (correctionInProgress) return
        val ic = currentInputConnection ?: return

        if (!isAutoCorrectionEnabled()) {
            Toast.makeText(this, "Correction automatique désactivée", Toast.LENGTH_SHORT).show()
            return
        }

        val prefs = getPreferences()
        migrateLegacyApiKey(prefs)
        val apiKey = EncryptedKeyStore.getApiKey(this)
        if (apiKey.isEmpty()) {
            Toast.makeText(this, getString(R.string.toast_no_api_key), Toast.LENGTH_SHORT).show()
            return
        }
        val model = prefs.getString(KEY_MODEL, DEFAULT_MODEL)?.trim().orEmpty().ifEmpty { DEFAULT_MODEL }
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

        if (original.isBlank()) {
            Toast.makeText(this, "Rien à corriger", Toast.LENGTH_SHORT).show()
            return
        }

        if (!correctionWasSelection && shouldShowLongTextWarning(original)) {
            showLongTextWarning { launchCorrection(original, apiKey, model, language) }
            return
        }

        launchCorrection(original, apiKey, model, language)
    }

    private fun launchCorrection(original: String, apiKey: String, model: String, language: String) {
        correctionInProgress = true
        pendingResult = null
        correctionOriginal = original
        lastOriginalText = null
        updateUndoEnabled()
        startCorrectionAnimation()

        MistralClient.correct(
            apiKey = apiKey,
            model = model,
            language = language,
            text = original,
            onSuccess = { corrected ->
                mainHandler.post { pendingResult = PendingResult(corrected, null) }
            },
            onError = { err ->
                mainHandler.post { pendingResult = PendingResult(original, err) }
            },
        )
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
            ContextCompat.getColor(this, R.color.wave_base),
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

    private fun migrateLegacyApiKey(prefs: SharedPreferences) {
        val legacy = prefs.getString(KEY_API_KEY, null)
        if (!legacy.isNullOrBlank()) {
            EncryptedKeyStore.setApiKey(this, legacy)
            prefs.edit().remove(KEY_API_KEY).apply()
        }
    }

    private fun isAutoCorrectionEnabled(): Boolean {
        return getPreferences().getBoolean(KEY_AUTO_CORRECT, true)
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
        private const val PREFS_NAME = "ime_prefs"
        private const val KEY_AUTO_CORRECT = "auto_correct"
        private const val KEY_LANGUAGE = "language"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_MODEL = "model"
        private const val KEY_HIDE_LONG_TEXT_WARNING = "hide_long_text_warning"
        private const val LONG_TEXT_THRESHOLD = 500

        private data class KeyboardLayout(val row1: String, val row2: String, val row3: String)
        private val LAYOUT_AZERTY = KeyboardLayout("azertyuiop", "qsdfghjklm", "wxcvbn'")
        private val LAYOUT_QWERTY = KeyboardLayout("qwertyuiop", "asdfghjkl", "zxcvbnm")
        private val LAYOUT_QWERTZ = KeyboardLayout("qwertzuiop", "asdfghjkl", "yxcvbnm")
        private const val DEFAULT_LANGUAGE = "fr"
        private const val DEFAULT_MODEL = "mistral-small-latest"
        private const val MAX_CHARS = 10000
        private const val REPEAT_INITIAL_DELAY_MS = 400L
        private const val REPEAT_INTERVAL_MS = 50L
        private const val ANIM_PASS_DURATION_MS = 700L
        private const val NAV_BAR_FALLBACK_DP = 48f
        private const val WAVE_CORNER_RADIUS_DP = 3f
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
