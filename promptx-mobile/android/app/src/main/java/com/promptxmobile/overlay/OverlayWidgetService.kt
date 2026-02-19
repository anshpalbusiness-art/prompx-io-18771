package com.promptxmobile.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import com.promptxmobile.MainActivity
import com.promptxmobile.R

/**
 * Foreground service that manages the floating PromptX overlay widget.
 * Displays a draggable pill/button on top of AI chat apps with
 * expand/collapse animations and prompt enhancement controls.
 */
class OverlayWidgetService : Service() {

    companion object {
        private const val TAG = "PromptXWidget"
        private const val CHANNEL_ID = "promptx_overlay_channel"
        private const val NOTIFICATION_ID = 7001

        private var instance: OverlayWidgetService? = null
        fun getInstance(): OverlayWidgetService? = instance
    }

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private var isExpanded = false
    private var enhancedText: String? = null
    private var currentState = OverlayState.IDLE

    // Touch tracking for drag
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f

    // ─── Lifecycle ───────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        createOverlayView()
        Log.i(TAG, "✅ Overlay Widget Service created")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        instance = null
        removeOverlayView()
        super.onDestroy()
        Log.i(TAG, "🛑 Overlay Widget Service destroyed")
    }

    // ─── Notification ────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "PromptX Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "PromptX prompt enhancement overlay"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("PromptX Overlay Active")
            .setContentText("Monitoring AI chat apps for prompt enhancement")
            .setSmallIcon(android.R.drawable.ic_menu_edit)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    // ─── Overlay View ────────────────────────────────────────────────────

    private fun createOverlayView() {
        val inflater = LayoutInflater.from(this)
        overlayView = inflater.inflate(R.layout.overlay_widget, null)

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 50
            y = 300
        }

        setupTouchListeners(layoutParams)
        setupButtonListeners()

        windowManager.addView(overlayView, layoutParams)
        overlayView?.visibility = View.GONE // Hidden until AI chat app detected
    }

    private fun removeOverlayView() {
        overlayView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to remove overlay: ${e.message}")
            }
        }
        overlayView = null
    }

    /**
     * Enable drag-to-move on the floating pill.
     */
    private fun setupTouchListeners(params: WindowManager.LayoutParams) {
        val pillContainer = overlayView?.findViewById<View>(R.id.pill_container)

        pillContainer?.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX - initialTouchX).toInt()
                    params.y = initialY + (event.rawY - initialTouchY).toInt()
                    try {
                        windowManager.updateViewLayout(overlayView, params)
                    } catch (e: Exception) {
                        Log.e(TAG, "Layout update failed: ${e.message}")
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    // If minimal movement, treat as click (toggle expand/collapse)
                    val dx = Math.abs(event.rawX - initialTouchX)
                    val dy = Math.abs(event.rawY - initialTouchY)
                    if (dx < 10 && dy < 10) {
                        toggleExpanded()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun setupButtonListeners() {
        // "Use Enhanced" button
        overlayView?.findViewById<View>(R.id.btn_use_enhanced)?.setOnClickListener {
            PromptXAccessibilityService.getInstance()?.pasteEnhancedPrompt()
        }

        // "Dismiss" button
        overlayView?.findViewById<View>(R.id.btn_dismiss)?.setOnClickListener {
            collapse()
            updateState(OverlayState.IDLE)
        }

        // "Close" button
        overlayView?.findViewById<View>(R.id.btn_close)?.setOnClickListener {
            hide()
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────

    fun show() {
        overlayView?.post {
            overlayView?.visibility = View.VISIBLE
            updateState(OverlayState.IDLE)
        }
    }

    fun hide() {
        overlayView?.post {
            overlayView?.visibility = View.GONE
            collapse()
        }
    }

    fun updateState(state: OverlayState, enhanced: String? = null) {
        currentState = state
        enhancedText = enhanced ?: enhancedText

        overlayView?.post {
            val statusIcon = overlayView?.findViewById<TextView>(R.id.status_icon)
            val statusText = overlayView?.findViewById<TextView>(R.id.status_text)
            val expandedContent = overlayView?.findViewById<LinearLayout>(R.id.expanded_content)
            val enhancedPreview = overlayView?.findViewById<TextView>(R.id.enhanced_preview)
            val btnUse = overlayView?.findViewById<View>(R.id.btn_use_enhanced)

            when (state) {
                OverlayState.IDLE -> {
                    statusIcon?.text = "✨"
                    statusText?.text = "PromptX"
                    btnUse?.isEnabled = false
                    collapse()
                }
                OverlayState.ENHANCING -> {
                    statusIcon?.text = "⚡"
                    statusText?.text = "Enhancing..."
                    btnUse?.isEnabled = false
                }
                OverlayState.READY -> {
                    statusIcon?.text = "✅"
                    statusText?.text = "Enhanced!"
                    enhancedPreview?.text = enhancedText?.take(120)?.plus("...")
                    btnUse?.isEnabled = true
                    expand()
                }
                OverlayState.PASTED -> {
                    statusIcon?.text = "🎯"
                    statusText?.text = "Pasted!"
                    btnUse?.isEnabled = false
                    // Auto-collapse after 2 seconds
                    overlayView?.postDelayed({ collapse() }, 2000)
                }
                OverlayState.ERROR -> {
                    statusIcon?.text = "⚠️"
                    statusText?.text = "Error"
                    btnUse?.isEnabled = false
                }
            }
        }
    }

    // ─── Expand/Collapse ─────────────────────────────────────────────────

    private fun toggleExpanded() {
        if (isExpanded) collapse() else expand()
    }

    private fun expand() {
        isExpanded = true
        overlayView?.findViewById<LinearLayout>(R.id.expanded_content)?.visibility = View.VISIBLE
    }

    private fun collapse() {
        isExpanded = false
        overlayView?.findViewById<LinearLayout>(R.id.expanded_content)?.visibility = View.GONE
    }
}
