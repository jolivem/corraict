package com.example.aicorrect

import android.content.Context
import android.content.SharedPreferences
import android.inputmethodservice.InputMethodService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.graphics.Typeface
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.text.style.StyleSpan
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.Toast

class CorrectKeyboardService : InputMethodService() {

    private enum class ShiftState { OFF, ONE_SHOT, LOCKED }

    private var inputView: View? = null
    private var shiftState = ShiftState.OFF
    private var shiftButton: Button? = null
    private var correctButton: Button? = null
    private var correctButtonOriginalText: CharSequence? = null
    private val letterButtons = mutableListOf<Button>()
    private var correctionInProgress = false
    private var animationRunnable: Runnable? = null
    private var pendingResult: PendingResult? = null

    private data class PendingResult(val text: String, val errorMsg: String?)

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_view, null)

        correctButton = view.findViewById(R.id.btnCorrect)
        correctButtonOriginalText = correctButton?.text
        correctButton?.setOnClickListener { applyCorrection() }
        view.findViewById<Button>(R.id.btnEmoji).setOnClickListener { toggleEmojiPanel(view) }
        buildEmojiPanel(view.findViewById(R.id.emojiPanel))

        bindLetterRow(view.findViewById(R.id.rowDigits))
        bindLetterRow(view.findViewById(R.id.row1))
        bindLetterRow(view.findViewById(R.id.row2))
        bindRow3(view.findViewById(R.id.row3))
        bindRow4(view)
        bindSymbolsPanel(view)

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
        val panel = root.findViewById<GridLayout>(R.id.emojiPanel)
        panel.visibility = if (panel.visibility == View.VISIBLE) View.GONE else View.VISIBLE
    }

    private fun buildEmojiPanel(panel: GridLayout) {
        panel.removeAllViews()
        for (emoji in EMOJIS) {
            val btn = Button(this).apply {
                text = emoji
                textSize = 18f
                isAllCaps = false
                setBackgroundColor(0xFF2A2A2A.toInt())
                setTextColor(0xFFFFFFFF.toInt())
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
            panel.addView(btn, params)
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
                btn.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFF1A1A1A.toInt())
            }
            ShiftState.ONE_SHOT -> {
                btn.text = "⇧"
                btn.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFF1976D2.toInt())
            }
            ShiftState.LOCKED -> {
                btn.text = "⇪"
                btn.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFFF57C00.toInt())
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
        val action = currentInputEditorInfo?.imeOptions?.and(EditorInfo.IME_MASK_ACTION) ?: 0
        if (action != EditorInfo.IME_ACTION_NONE && action != EditorInfo.IME_ACTION_UNSPECIFIED) {
            ic.performEditorAction(action)
        } else {
            ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER))
            ic.sendKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER))
        }
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
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
        val before = ic.getTextBeforeCursor(MAX_CHARS, 0)?.toString().orEmpty()
        val after = ic.getTextAfterCursor(MAX_CHARS, 0)?.toString().orEmpty()
        val original = before + after

        if (original.isBlank()) {
            Toast.makeText(this, "Rien à corriger", Toast.LENGTH_SHORT).show()
            return
        }

        correctionInProgress = true
        pendingResult = null
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

    private fun finalizeCorrection(result: PendingResult) {
        stopCorrectionAnimation()
        replaceWholeField(result.text)
        correctionInProgress = false
        pendingResult = null
        result.errorMsg?.let { err ->
            Toast.makeText(
                this,
                "${getString(R.string.toast_correction_failed)} : $err",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun startCorrectionAnimation() {
        val btn = correctButton ?: return
        val original = correctButtonOriginalText?.toString() ?: return
        val n = original.length
        if (n == 0) return
        val cycleLength = n + WAVE_LENGTH
        val ticksPerPass = (ANIM_PASS_DURATION_MS / ANIM_TICK_MS).toInt().coerceAtLeast(1)
        val charsPerTick = (cycleLength.toDouble() / ticksPerPass).coerceAtLeast(1.0)
        var headFloat = 0.0

        animationRunnable = object : Runnable {
            override fun run() {
                val head = (headFloat.toInt() % cycleLength + cycleLength) % cycleLength
                btn.text = buildButtonWaveSpannable(head, original)

                val prevPass = (headFloat / cycleLength).toInt()
                headFloat += charsPerTick
                val newPass = (headFloat / cycleLength).toInt()

                if (newPass > prevPass) {
                    pendingResult?.let { result ->
                        finalizeCorrection(result)
                        return
                    }
                }
                mainHandler.postDelayed(this, ANIM_TICK_MS)
            }
        }
        mainHandler.post(animationRunnable!!)
    }

    private fun stopCorrectionAnimation() {
        animationRunnable?.let { mainHandler.removeCallbacks(it) }
        animationRunnable = null
        correctButtonOriginalText?.let { correctButton?.text = it }
    }

    private fun buildButtonWaveSpannable(head: Int, text: String): CharSequence {
        val ss = SpannableString(text)
        val n = text.length
        for (i in 0 until n) {
            val inWave = i <= head && i > head - WAVE_LENGTH
            val color = if (inWave) COLOR_BRIGHT else COLOR_DIM
            ss.setSpan(ForegroundColorSpan(color), i, i + 1, Spanned.SPAN_INCLUSIVE_EXCLUSIVE)
            if (inWave) {
                ss.setSpan(StyleSpan(Typeface.BOLD), i, i + 1, Spanned.SPAN_INCLUSIVE_EXCLUSIVE)
            }
        }
        return ss
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
        private const val DEFAULT_LANGUAGE = "fr"
        private const val DEFAULT_MODEL = "mistral-small-latest"
        private const val MAX_CHARS = 10000
        private const val REPEAT_INITIAL_DELAY_MS = 400L
        private const val REPEAT_INTERVAL_MS = 50L
        private const val ANIM_TICK_MS = 70L
        private const val ANIM_PASS_DURATION_MS = 700L
        private const val WAVE_LENGTH = 3
        private const val COLOR_BRIGHT = 0xFFFFFFFF.toInt()
        private const val COLOR_DIM = 0x55FFFFFF.toInt()
        private val EMOJIS = listOf(
            "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎",
            "🤔", "😏", "😅", "😭", "😢", "😡", "🤯", "🙄",
            "😴", "🤗", "👍", "👎", "❤️", "🔥", "🎉", "✨",
        )
    }
}
