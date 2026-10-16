package de.lanis.app

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

class TimetableTileService : TileService() {
    override fun onStartListening() { qsTile?.let { it.state = Tile.STATE_INACTIVE; it.label = getString(R.string.widget_today); it.updateTile() } }
    override fun onClick() {
        val intent = Intent(this, MainActivity::class.java).setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("https://lanis.arg-server.de/timetable")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) startActivityAndCollapse(PendingIntent.getActivity(this, 900, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        else launchOnLegacyAndroid(intent)
    }

    // The PendingIntent overload does not exist before API 34. This helper is only
    // reached on API 26–33, where the Intent overload is supported by Android.
    @SuppressLint("StartActivityAndCollapseDeprecated")
    @Suppress("DEPRECATION")
    private fun launchOnLegacyAndroid(intent: Intent) { startActivityAndCollapse(intent) }
}
