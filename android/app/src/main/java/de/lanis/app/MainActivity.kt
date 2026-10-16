package de.lanis.app

import android.os.Bundle
import android.graphics.Color
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(LanisNativePlugin::class.java)
        super.onCreate(savedInstanceState)
        // Apply system bars and IME once, natively; fixed web elements stay above both.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val root = findViewById<android.view.View>(android.R.id.content)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            bridge.webView.evaluateJavascript("document.documentElement.classList.toggle('android-keyboard', ${keyboard.bottom > bars.bottom})", null)
            insets
        }
        ViewCompat.requestApplyInsets(root)
        bridge.webView.setBackgroundColor(Color.parseColor("#0f172a"))
        if (BuildConfig.DEBUG) android.webkit.WebView.setWebContentsDebuggingEnabled(true)
    }
}
