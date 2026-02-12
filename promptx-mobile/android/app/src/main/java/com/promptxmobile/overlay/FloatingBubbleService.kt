package com.promptxmobile.overlay

import android.app.Service
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.ScrollView
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.ViewGroup
import android.util.TypedValue
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import androidx.core.app.NotificationCompat
import com.promptxmobile.MainActivity
import com.promptxmobile.R
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * FloatingBubbleService — Creates a persistent floating bubble overlay
 * that users can tap to enhance prompts from any app.
 *
 * Like Messenger chat heads but for AI prompt enhancement.
 */
class FloatingBubbleService : Service() {

    private lateinit var windowManager: WindowManager
    private var bubbleView: View? = null
    private var expandedView: View? = null
    private var isExpanded = false
    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())

    companion object {
        const val CHANNEL_ID = "promptx_overlay"
        const val NOTIFICATION_ID = 1001
        const val SUPABASE_URL = "https://tplfjmitflhxuttixqjq.supabase.co"
        const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbGZqbWl0ZmxoeHV0dGl4cWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1MTY5NDQsImV4cCI6MjA1MjA5Mjk0NH0.L9MfjhFwCbGSqVFBJFsfWMVhNlMYEyN12cXMX2BZLvY"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        showBubble()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        removeBubble()
        removeExpanded()
    }

    // ─── Notification (required for foreground service) ───

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "PromptX Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "PromptX floating bubble is active"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⚡ PromptX Active")
            .setContentText("Tap the floating bubble to enhance prompts")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pi)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    // ─── Bubble View (collapsed circle) ───

    private fun showBubble() {
        val size = dpToPx(56)

        // Create circular bubble
        val bubble = View(this).apply {
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#818CF8"))
                setStroke(dpToPx(2), Color.parseColor("#6366F1"))
            }
            // Add ⚡ text
            val tv = TextView(this@FloatingBubbleService).apply {
                text = "⚡"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
                gravity = Gravity.CENTER
                setTextColor(Color.WHITE)
            }
        }

        // Use a FrameLayout to hold the emoji
        val container = android.widget.FrameLayout(this).apply {
            val bg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#818CF8"))
                setStroke(dpToPx(2), Color.parseColor("#6366F1"))
            }
            background = bg
            elevation = 8f

            val tv = TextView(this@FloatingBubbleService).apply {
                text = "⚡"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
                gravity = Gravity.CENTER
                setTextColor(Color.WHITE)
            }
            addView(tv, android.widget.FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            ).apply {
                gravity = Gravity.CENTER
            })
        }

        val params = WindowManager.LayoutParams(
            size, size,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dpToPx(16)
            y = dpToPx(200)
        }

        // Touch listener for drag + click
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false

        container.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isDragging = true
                    }
                    params.x = initialX + dx
                    params.y = initialY + dy
                    windowManager.updateViewLayout(container, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isDragging) {
                        // Click — expand the panel
                        toggleExpanded()
                    }
                    true
                }
                else -> false
            }
        }

        try {
            windowManager.addView(container, params)
            bubbleView = container
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ─── Expanded Panel ───

    private fun toggleExpanded() {
        if (isExpanded) {
            removeExpanded()
        } else {
            showExpanded()
        }
        isExpanded = !isExpanded
    }

    private fun showExpanded() {
        val width = dpToPx(320)
        val height = dpToPx(420)

        val panel = ScrollView(this).apply {
            background = GradientDrawable().apply {
                cornerRadius = dpToPx(16).toFloat()
                setColor(Color.parseColor("#0a0e27"))
                setStroke(dpToPx(1), Color.parseColor("#1a1f4e"))
            }
            elevation = 16f
            setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16))
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        // Header
        val header = TextView(this).apply {
            text = "⚡ PromptX Enhance"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, dpToPx(12))
        }
        content.addView(header)

        // Paste from clipboard hint
        val hint = TextView(this).apply {
            text = "Paste your prompt or type one below"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setTextColor(Color.parseColor("#888"))
            setPadding(0, 0, 0, dpToPx(8))
        }
        content.addView(hint)

        // Text input
        val input = EditText(this).apply {
            background = GradientDrawable().apply {
                cornerRadius = dpToPx(8).toFloat()
                setColor(Color.parseColor("#0d1440"))
                setStroke(dpToPx(1), Color.parseColor("#1a1f4e"))
            }
            setTextColor(Color.WHITE)
            setHintTextColor(Color.parseColor("#555"))
            hint = "Type or paste prompt..."
            setPadding(dpToPx(12), dpToPx(12), dpToPx(12), dpToPx(12))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            minLines = 3
            maxLines = 6
            gravity = Gravity.TOP
        }

        // Try to paste from clipboard
        try {
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = clipboard.primaryClip
            if (clip != null && clip.itemCount > 0) {
                val text = clip.getItemAt(0).text?.toString() ?: ""
                if (text.length in 5..2000) {
                    input.setText(text)
                }
            }
        } catch (_: Exception) {}

        content.addView(input, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            bottomMargin = dpToPx(12)
        })

        // Result area
        val resultLabel = TextView(this).apply {
            text = ""
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setTextColor(Color.parseColor("#818CF8"))
            visibility = View.GONE
        }
        content.addView(resultLabel)

        val resultText = TextView(this).apply {
            text = ""
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            setTextColor(Color.WHITE)
            background = GradientDrawable().apply {
                cornerRadius = dpToPx(8).toFloat()
                setColor(Color.parseColor("#0f1440"))
                setStroke(dpToPx(1), Color.parseColor("#818CF8"))
            }
            setPadding(dpToPx(12), dpToPx(12), dpToPx(12), dpToPx(12))
            visibility = View.GONE
            setLineSpacing(4f, 1f)
        }
        content.addView(resultText, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = dpToPx(4)
            bottomMargin = dpToPx(12)
        })

        // Buttons row
        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }

        // Enhance button
        val enhanceBtn = Button(this).apply {
            text = "⚡ Enhance"
            background = GradientDrawable().apply {
                cornerRadius = dpToPx(8).toFloat()
                setColor(Color.parseColor("#818CF8"))
            }
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            isAllCaps = false
            setPadding(dpToPx(16), dpToPx(10), dpToPx(16), dpToPx(10))

            setOnClickListener {
                val prompt = input.text.toString().trim()
                if (prompt.length >= 5) {
                    text = "⏳ Enhancing..."
                    isEnabled = false

                    serviceScope.launch {
                        try {
                            val result = enhanceViaAPI(prompt)
                            resultLabel.text = "✨ Enhanced Prompt"
                            resultLabel.visibility = View.VISIBLE
                            resultText.text = result
                            resultText.visibility = View.VISIBLE
                            text = "⚡ Enhance"
                            isEnabled = true
                        } catch (e: Exception) {
                            resultLabel.text = "❌ Enhancement failed"
                            resultLabel.visibility = View.VISIBLE
                            resultText.text = e.message ?: "Unknown error"
                            resultText.visibility = View.VISIBLE
                            text = "⚡ Retry"
                            isEnabled = true
                        }
                    }
                }
            }
        }

        // Copy button
        val copyBtn = Button(this).apply {
            text = "📋 Copy"
            background = GradientDrawable().apply {
                cornerRadius = dpToPx(8).toFloat()
                setColor(Color.parseColor("#1a1f4e"))
                setStroke(dpToPx(1), Color.parseColor("#333"))
            }
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            isAllCaps = false
            setPadding(dpToPx(16), dpToPx(10), dpToPx(16), dpToPx(10))

            setOnClickListener {
                val textToCopy = resultText.text.toString()
                if (textToCopy.isNotEmpty()) {
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    val clip = android.content.ClipData.newPlainText("PromptX", textToCopy)
                    clipboard.setPrimaryClip(clip)
                    text = "✅ Copied!"
                    postDelayed({ text = "📋 Copy" }, 2000)
                }
            }
        }

        // Close button
        val closeBtn = Button(this).apply {
            text = "✕"
            background = GradientDrawable().apply {
                cornerRadius = dpToPx(8).toFloat()
                setColor(Color.parseColor("#1a1f4e"))
            }
            setTextColor(Color.parseColor("#F87171"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            isAllCaps = false
            minWidth = dpToPx(40)
            minimumWidth = dpToPx(40)
            setPadding(dpToPx(8), dpToPx(10), dpToPx(8), dpToPx(10))

            setOnClickListener { toggleExpanded() }
        }

        btnRow.addView(enhanceBtn, LinearLayout.LayoutParams(
            0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f
        ).apply { marginEnd = dpToPx(6) })

        btnRow.addView(copyBtn, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply { marginEnd = dpToPx(6) })

        btnRow.addView(closeBtn, LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ))

        content.addView(btnRow)
        panel.addView(content)

        val params = WindowManager.LayoutParams(
            width, height,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        try {
            windowManager.addView(panel, params)
            expandedView = panel
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun removeExpanded() {
        expandedView?.let {
            try {
                windowManager.removeView(it)
            } catch (_: Exception) {}
        }
        expandedView = null
    }

    private fun removeBubble() {
        bubbleView?.let {
            try {
                windowManager.removeView(it)
            } catch (_: Exception) {}
        }
        bubbleView = null
    }

    // ─── API Call ───

    private suspend fun enhanceViaAPI(prompt: String): String {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("$SUPABASE_URL/functions/v1/sdk-generate-prompt")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $SUPABASE_ANON_KEY")
                conn.doOutput = true
                conn.connectTimeout = 15000
                conn.readTimeout = 15000

                val body = JSONObject().apply {
                    put("prompt", prompt)
                    put("toolType", "text")
                    put("model", "google/gemini-2.5-flash")
                }

                conn.outputStream.use {
                    it.write(body.toString().toByteArray())
                }

                if (conn.responseCode == 200) {
                    val response = conn.inputStream.bufferedReader().readText()
                    val json = JSONObject(response)
                    json.optString("optimized", json.optString("enhanced", prompt))
                } else {
                    // Fallback: local enhancement
                    localEnhance(prompt)
                }
            } catch (e: Exception) {
                localEnhance(prompt)
            }
        }
    }

    private fun localEnhance(prompt: String): String {
        return "$prompt\n\nPlease provide a comprehensive, well-structured response with specific details and actionable insights."
    }

    // ─── Utilities ───

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }
}
