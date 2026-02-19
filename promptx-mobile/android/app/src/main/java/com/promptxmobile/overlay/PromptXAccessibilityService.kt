package com.promptxmobile.overlay

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * PromptX Accessibility Service — reads text from AI chat app input fields,
 * enhances prompts after a debounce period, and shows the overlay widget.
 *
 * Required permissions:
 * - Accessibility Service (user must enable in Settings)
 * - SYSTEM_ALERT_WINDOW (display over other apps)
 */
class PromptXAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "PromptXOverlay"
        private var instance: PromptXAccessibilityService? = null

        fun getInstance(): PromptXAccessibilityService? = instance
    }

    private lateinit var settings: OverlaySettingsManager
    private val handler = Handler(Looper.getMainLooper())
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    private var currentInputText = ""
    private var lastEnhancedText = ""
    private var currentPackageName: String? = null
    private var isInAIChatApp = false
    private var debounceRunnable: Runnable? = null

    private var overlayService: OverlayWidgetService? = null

    // ─── Lifecycle ───────────────────────────────────────────────────────

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        settings = OverlaySettingsManager(this)

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_FOCUSED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 100
        }
        serviceInfo = info

        // Start the overlay widget service
        val overlayIntent = Intent(this, OverlayWidgetService::class.java)
        startService(overlayIntent)

        Log.i(TAG, "✅ PromptX Accessibility Service connected")
    }

    override fun onInterrupt() {
        Log.w(TAG, "⚠️ Service interrupted")
    }

    override fun onDestroy() {
        instance = null
        debounceRunnable?.let { handler.removeCallbacks(it) }
        executor.shutdownNow()
        super.onDestroy()
        Log.i(TAG, "🛑 Service destroyed")
    }

    // ─── Event Handling ──────────────────────────────────────────────────

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !settings.isEnabled) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                handleWindowChange(event)
            }
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                handleTextChanged(event)
            }
            AccessibilityEvent.TYPE_VIEW_FOCUSED -> {
                handleFocusChanged(event)
            }
        }
    }

    /**
     * Detects when user switches to/from an AI chat app.
     */
    private fun handleWindowChange(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString()
        currentPackageName = packageName
        isInAIChatApp = settings.isAIChatApp(packageName)

        if (isInAIChatApp) {
            Log.d(TAG, "📱 Entered AI chat app: $packageName")
            showOverlayWidget()
        } else {
            hideOverlayWidget()
        }
    }

    /**
     * Monitors text changes in input fields while in AI chat apps.
     * Triggers debounced enhancement after user stops typing.
     */
    private fun handleTextChanged(event: AccessibilityEvent) {
        if (!isInAIChatApp || !settings.isEnabled) return

        val newText = event.text?.joinToString("") ?: return
        if (newText.isBlank() || newText == currentInputText) return

        currentInputText = newText
        Log.d(TAG, "⌨️ Text changed: \"${newText.take(40)}...\"")

        // Cancel previous debounce
        debounceRunnable?.let { handler.removeCallbacks(it) }

        // Start new debounce timer
        debounceRunnable = Runnable {
            if (currentInputText.length >= 5) { // Minimum meaningful prompt length
                enhancePrompt(currentInputText)
            }
        }
        handler.postDelayed(debounceRunnable!!, settings.debounceMs)
    }

    /**
     * Track when input fields gain focus in AI chat apps.
     */
    private fun handleFocusChanged(event: AccessibilityEvent) {
        if (!isInAIChatApp) return

        val source = event.source ?: return
        if (source.className?.toString()?.contains("EditText") == true ||
            source.isEditable) {
            Log.d(TAG, "📝 Input field focused")
        }
        source.recycle()
    }

    // ─── Enhancement Logic ───────────────────────────────────────────────

    /**
     * Calls the PromptX overlay-enhance API to improve the user's prompt.
     */
    private fun enhancePrompt(prompt: String) {
        if (prompt.isBlank()) return

        Log.i(TAG, "🔮 Enhancing prompt: \"${prompt.take(50)}...\"")
        updateOverlayState(OverlayState.ENHANCING)

        executor.execute {
            try {
                val url = URL(settings.apiEndpoint)
                val connection = url.openConnection() as HttpURLConnection
                connection.apply {
                    requestMethod = "POST"
                    setRequestProperty("Content-Type", "application/json")
                    connectTimeout = 10000
                    readTimeout = 15000
                    doOutput = true
                }

                val requestBody = JSONObject().apply {
                    put("prompt", prompt)
                    put("style", settings.style)
                    put("privacyMode", settings.privacyMode)
                }

                OutputStreamWriter(connection.outputStream).use { writer ->
                    writer.write(requestBody.toString())
                    writer.flush()
                }

                if (connection.responseCode == 200) {
                    val response = BufferedReader(InputStreamReader(connection.inputStream)).use {
                        it.readText()
                    }
                    val json = JSONObject(response)
                    val enhanced = json.getString("enhanced")
                    lastEnhancedText = enhanced

                    handler.post {
                        Log.i(TAG, "✅ Enhancement ready: \"${enhanced.take(60)}...\"")
                        updateOverlayState(OverlayState.READY, enhanced)
                    }
                } else {
                    Log.e(TAG, "❌ API error: ${connection.responseCode}")
                    handler.post { updateOverlayState(OverlayState.ERROR) }
                }

                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "❌ Enhancement failed: ${e.message}")
                handler.post { updateOverlayState(OverlayState.ERROR) }
            }
        }
    }

    // ─── Input Field Manipulation ────────────────────────────────────────

    /**
     * Finds the active input field and replaces its text with the enhanced prompt.
     */
    fun pasteEnhancedPrompt() {
        if (lastEnhancedText.isBlank()) return

        val rootNode = rootInActiveWindow ?: return

        try {
            val inputNodes = mutableListOf<AccessibilityNodeInfo>()
            findEditableNodes(rootNode, inputNodes)

            for (node in inputNodes) {
                if (node.isEditable && node.isFocused) {
                    // Set the enhanced text
                    val arguments = android.os.Bundle().apply {
                        putCharSequence(
                            AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                            lastEnhancedText
                        )
                    }
                    node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments)
                    Log.i(TAG, "✅ Enhanced prompt pasted into input field")

                    // Auto-send if enabled
                    if (settings.autoSend) {
                        handler.postDelayed({
                            sendMessage(rootNode)
                        }, 300)
                    }

                    updateOverlayState(OverlayState.PASTED)
                    break
                }
                node.recycle()
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to paste: ${e.message}")
        }
        rootNode.recycle()
    }

    /**
     * Recursively finds all editable text nodes in the view hierarchy.
     */
    private fun findEditableNodes(node: AccessibilityNodeInfo, results: MutableList<AccessibilityNodeInfo>) {
        if (node.isEditable) {
            results.add(AccessibilityNodeInfo.obtain(node))
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            findEditableNodes(child, results)
            child.recycle()
        }
    }

    /**
     * Attempts to find and click the send button.
     */
    private fun sendMessage(rootNode: AccessibilityNodeInfo) {
        try {
            // Look for send/submit buttons by common descriptions
            val sendTerms = listOf("send", "submit", "arrow", "up")
            for (term in sendTerms) {
                val nodes = rootNode.findAccessibilityNodeInfosByText(term)
                for (node in nodes) {
                    if (node.isClickable) {
                        node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        Log.i(TAG, "🚀 Auto-sent message")
                        node.recycle()
                        return
                    }
                    node.recycle()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Auto-send failed: ${e.message}")
        }
    }

    // ─── Overlay Widget Control ──────────────────────────────────────────

    private fun showOverlayWidget() {
        OverlayWidgetService.getInstance()?.show()
    }

    private fun hideOverlayWidget() {
        OverlayWidgetService.getInstance()?.hide()
    }

    private fun updateOverlayState(state: OverlayState, enhancedText: String? = null) {
        OverlayWidgetService.getInstance()?.updateState(state, enhancedText)
    }
}

enum class OverlayState {
    IDLE,       // Watching for input
    ENHANCING,  // API call in progress
    READY,      // Enhanced prompt ready to use
    PASTED,     // Successfully pasted
    ERROR       // Enhancement failed
}
