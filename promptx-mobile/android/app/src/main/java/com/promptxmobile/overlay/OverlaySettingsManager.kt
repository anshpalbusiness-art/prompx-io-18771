package com.promptxmobile.overlay

import android.content.Context
import android.content.SharedPreferences

/**
 * Manages overlay settings via SharedPreferences.
 * Settings are synced with the PromptX web app when available.
 */
class OverlaySettingsManager(context: Context) {

    companion object {
        private const val PREFS_NAME = "promptx_overlay_settings"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_STYLE = "style"
        private const val KEY_AUTO_SEND = "auto_send"
        private const val KEY_PRIVACY_MODE = "privacy_mode"
        private const val KEY_DEBOUNCE_MS = "debounce_ms"
        private const val KEY_API_ENDPOINT = "api_endpoint"

        private const val DEFAULT_ENDPOINT = "https://promptx.io/api/overlay-enhance"
        private const val DEFAULT_DEBOUNCE = 3000L

        // Recognized AI chat app package names
        val AI_CHAT_PACKAGES = setOf(
            "com.openai.chatgpt",
            "com.anthropic.claude",
            "com.google.android.apps.bard",
            "ai.x.grok",
            "ai.perplexity.app.android",
            "com.quora.poe",
            "com.microsoft.copilot",
            "com.deepseek.chat"
        )

        // AI chat app keywords for fallback detection
        val AI_CHAT_KEYWORDS = setOf(
            "chatgpt", "claude", "gemini", "grok", "perplexity",
            "poe", "copilot", "deepseek", "bard", "chat"
        )
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var isEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    var style: String
        get() = prefs.getString(KEY_STYLE, "professional") ?: "professional"
        set(value) = prefs.edit().putString(KEY_STYLE, value).apply()

    var autoSend: Boolean
        get() = prefs.getBoolean(KEY_AUTO_SEND, false)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_SEND, value).apply()

    var privacyMode: Boolean
        get() = prefs.getBoolean(KEY_PRIVACY_MODE, false)
        set(value) = prefs.edit().putBoolean(KEY_PRIVACY_MODE, value).apply()

    var debounceMs: Long
        get() = prefs.getLong(KEY_DEBOUNCE_MS, DEFAULT_DEBOUNCE)
        set(value) = prefs.edit().putLong(KEY_DEBOUNCE_MS, value).apply()

    var apiEndpoint: String
        get() = prefs.getString(KEY_API_ENDPOINT, DEFAULT_ENDPOINT) ?: DEFAULT_ENDPOINT
        set(value) = prefs.edit().putString(KEY_API_ENDPOINT, value).apply()

    /**
     * Check if a package name belongs to a recognized AI chat app.
     */
    fun isAIChatApp(packageName: String?): Boolean {
        if (packageName == null) return false
        if (AI_CHAT_PACKAGES.contains(packageName)) return true
        // Fallback: check if package name contains AI chat keywords
        return AI_CHAT_KEYWORDS.any { packageName.lowercase().contains(it) }
    }
}
