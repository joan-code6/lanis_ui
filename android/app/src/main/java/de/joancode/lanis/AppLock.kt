package de.joancode.lanis

import android.app.KeyguardManager
import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

class AppLock(private val activity: MainActivity) {
    companion object {
        private const val PREFERENCES = "lanis-app-lock"
        private const val AUTHENTICATORS = BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        fun enabled(context: Context) = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getBoolean("enabled", false)
        fun available(context: Context) = context.getSystemService(KeyguardManager::class.java).isDeviceSecure &&
            BiometricManager.from(context).canAuthenticate(AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS
    }

    private val session = AppLockSession(enabled(activity))
    private var completion: ((Boolean, String?) -> Unit)? = null
    private var requestedEnabled: Boolean? = null
    private val cover = FrameLayout(activity)
    private val message = TextView(activity)
    val locked get() = session.locked
    private val prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            val requested = requestedEnabled
            if (requested != null) {
                // Commit before reporting success; a failed write leaves the old policy intact.
                if (!activity.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putBoolean("enabled", requested).commit()) {
                    session.fail()
                    render()
                    finish(false, "App-Sperre konnte nicht gespeichert werden.")
                    return
                }
                session.enabled = requested
            }
            session.succeed()
            render()
            finish(true, null)
        }
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
            session.fail()
            message.text = "Zum Öffnen erneut entsperren."
            render()
            finish(false, "Entsperren abgebrochen. Bitte erneut versuchen.")
        }
    })

    init {
        cover.setBackgroundColor(Color.rgb(10, 10, 10))
        cover.isClickable = true
        cover.isFocusable = true
        val content = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }
        content.addView(TextView(activity).apply {
            text = "LANIS gesperrt"
            textSize = 24f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
        })
        message.apply {
            text = "Biometrie oder Gerätesperre verwenden."
            textSize = 16f
            setTextColor(Color.LTGRAY)
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 32)
        }
        content.addView(message)
        content.addView(Button(activity).apply {
            text = "Entsperren"
            setOnClickListener { authenticate() }
        })
        cover.addView(content, FrameLayout.LayoutParams(-1, -2, Gravity.CENTER))
        activity.addContentView(cover, FrameLayout.LayoutParams(-1, -1))
        render()
    }

    fun resume() {
        session.resume()
        render()
        if (session.locked && !session.prompting) authenticate()
    }

    fun pause() {
        session.pause()
        if (session.enabled) {
            activity.currentFocus?.let { view ->
                activity.getSystemService(android.view.inputmethod.InputMethodManager::class.java)
                    .hideSoftInputFromWindow(view.windowToken, 0)
                view.clearFocus()
            }
        }
        render()
    }

    fun setEnabled(value: Boolean, callback: (Boolean, String?) -> Unit) {
        if (session.prompting || !session.foreground || session.locked) {
            callback(false, "Bitte zuerst entsperren.")
            return
        }
        requestedEnabled = value
        completion = callback
        authenticate()
    }

    private fun authenticate() {
        if (session.prompting) return
        if (!available(activity)) {
            message.text = "Richte zuerst eine Gerätesperre in Android ein."
            finish(false, "Richte zuerst eine PIN, ein Muster oder Passwort in Android ein.")
            return
        }
        session.prompting = true
        try {
            prompt.authenticate(BiometricPrompt.PromptInfo.Builder()
                .setTitle("LANIS entsperren")
                .setSubtitle("Biometrie oder Gerätesperre verwenden")
                .setAllowedAuthenticators(AUTHENTICATORS)
                .build())
        } catch (_: Exception) {
            session.fail()
            render()
            finish(false, "Entsperren nicht verfügbar. Bitte erneut versuchen.")
        }
    }

    private fun finish(success: Boolean, error: String?) {
        val callback = completion
        completion = null
        requestedEnabled = null
        callback?.invoke(success, error)
    }

    private fun render() {
        activity.appLockBack.isEnabled = session.locked
        if (session.enabled) activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        activity.bridge.webView.visibility = if (session.concealed) View.INVISIBLE else View.VISIBLE
        cover.visibility = if (session.concealed) View.VISIBLE else View.GONE
        if (session.concealed) cover.bringToFront()
    }
}
