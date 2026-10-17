package de.joancode.lanis

import android.os.Bundle
import android.app.ActivityManager
import android.graphics.Color
import android.graphics.Bitmap
import android.graphics.Canvas
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
            WindowInsetsCompat.CONSUMED
        }
        ViewCompat.requestApplyInsets(root)
        bridge.webView.setBackgroundColor(Color.parseColor("#0a0a0a"))
        val appearance = runCatching { NativeStore.read(this) }.getOrNull()
        updateTaskAppearance(appearance?.optString("theme", "ruby") ?: "ruby")
        if (BuildConfig.DEBUG) android.webkit.WebView.setWebContentsDebuggingEnabled(true)
    }

    @Suppress("DEPRECATION")
    fun updateTaskAppearance(theme: String) {
        val (icon, color) = when (theme) {
            "emerald" -> R.mipmap.ic_launcher_emerald to R.color.icon_emerald
            "sapphire" -> R.mipmap.ic_launcher_sapphire to R.color.icon_sapphire
            "amethyst" -> R.mipmap.ic_launcher_amethyst to R.color.icon_amethyst
            "amber" -> R.mipmap.ic_launcher_amber to R.color.icon_amber
            "cyan" -> R.mipmap.ic_launcher_cyan to R.color.icon_cyan
            "coral" -> R.mipmap.ic_launcher_coral to R.color.icon_coral
            "blush" -> R.mipmap.ic_launcher_blush to R.color.icon_blush
            "moss" -> R.mipmap.ic_launcher_moss to R.color.icon_moss
            else -> R.mipmap.ic_launcher_ruby to R.color.icon_ruby
        }
        val label = getString(R.string.app_name)
        // Launcher aliases do not change running tasks. Use a bitmap because
        // Launcher3/Pixel recents still ignore resource-only task icons.
        val size = getSystemService(ActivityManager::class.java).launcherLargeIconSize
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        // Recents may wrap bitmap icons; match that wrapper to the artwork.
        getDrawable(icon)!!.apply { setBounds(0, 0, size, size); draw(Canvas(bitmap)) }
        setTaskDescription(ActivityManager.TaskDescription(label, bitmap, getColor(color)))
    }
}
