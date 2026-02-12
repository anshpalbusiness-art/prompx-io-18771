package com.promptxmobile.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * React Native Bridge Module — lets JS control the floating overlay.
 *
 * Usage from React Native:
 *   import { NativeModules } from 'react-native';
 *   const { OverlayModule } = NativeModules;
 *   OverlayModule.startOverlay();
 *   OverlayModule.stopOverlay();
 *   OverlayModule.checkPermission().then(hasPermission => { ... });
 *   OverlayModule.requestPermission();
 */
class OverlayModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "OverlayModule"

    @ReactMethod
    fun checkPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(reactApplicationContext)
        ) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun startOverlay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(reactApplicationContext)
        ) {
            return // No permission
        }

        val intent = Intent(reactApplicationContext, FloatingBubbleService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopOverlay() {
        val intent = Intent(reactApplicationContext, FloatingBubbleService::class.java)
        reactApplicationContext.stopService(intent)
    }
}
