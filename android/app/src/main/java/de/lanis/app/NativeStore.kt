package de.lanis.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Credentials and snapshots stay in a single atomic, encrypted, non-backed-up file. */
object NativeStore {
    val lock = Any()
    private const val KEY = "lanis-device-v1"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(KEY, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    private fun file(context: Context) = AtomicFile(File(context.noBackupFilesDir, "lanis-vault.json"))
    fun read(context: Context): JSONObject = synchronized(lock) {
        val file = file(context)
        if (!file.baseFile.exists()) return@synchronized JSONObject()
        val envelope = JSONObject(file.openRead().use { it.readBytes().toString(Charsets.UTF_8) })
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)))
        JSONObject(cipher.doFinal(Base64.decode(envelope.getString("data"), Base64.NO_WRAP)).toString(Charsets.UTF_8))
    }
    fun write(context: Context, state: JSONObject) = synchronized(lock) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val envelope = JSONObject().put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("data", Base64.encodeToString(cipher.doFinal(state.toString().toByteArray()), Base64.NO_WRAP))
        val target = file(context)
        val output = target.startWrite()
        try { output.write(envelope.toString().toByteArray()); target.finishWrite(output) }
        catch (error: Exception) { target.failWrite(output); throw error }
    }
    fun clear(context: Context) = synchronized(lock) { file(context).delete() }
}
