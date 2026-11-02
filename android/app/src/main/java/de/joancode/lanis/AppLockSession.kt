package de.joancode.lanis

/** Foreground authentication is never persisted or restored from instance state. */
internal class AppLockSession(var enabled: Boolean) {
    var authenticated = false
        private set
    var prompting = false
    var foreground = false
        private set
    val locked get() = enabled && !authenticated
    val concealed get() = enabled && (!foreground || !authenticated)
    fun resume() { foreground = true }
    fun pause() { foreground = false; if (!prompting) authenticated = false }
    fun succeed() { prompting = false; authenticated = true }
    fun fail() { prompting = false; authenticated = false }
}
