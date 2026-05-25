package com.example.aicorrect

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStoreFile
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.KeysetHandle
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

/**
 * Modern replacement for EncryptedSharedPreferences using Jetpack DataStore and Google Tink.
 */
class EncryptedDataStore(private val context: Context) {

    companion object {
        private const val DATASTORE_NAME = "secure_settings"
        private const val KEYSET_NAME = "master_keyset"
        private const val PREF_FILE_NAME = "master_key_preference"
        private const val MASTER_KEY_URI = "android-keystore://master_key"

        private val KEY_API_KEY = stringPreferencesKey("api_key")
    }

    private val aead: Aead by lazy {
        AeadConfig.register()
        val keysetHandle = AndroidKeysetManager.Builder()
            .withSharedPref(context, KEYSET_NAME, PREF_FILE_NAME)
            .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
            .withMasterKeyUri(MASTER_KEY_URI)
            .build()
            .keysetHandle
        TinkAead(keysetHandle)
    }

    private class TinkAead(keysetHandle: KeysetHandle) : Aead {
        private val primitive = keysetHandle.getPrimitive(Aead::class.java)
        override fun encrypt(plaintext: ByteArray?, associatedData: ByteArray?): ByteArray = primitive.encrypt(plaintext, associatedData)
        override fun decrypt(ciphertext: ByteArray?, associatedData: ByteArray?): ByteArray = primitive.decrypt(ciphertext, associatedData)
    }

    private val dataStore: DataStore<Preferences> = PreferenceDataStoreFactory.create(
        produceFile = { context.preferencesDataStoreFile(DATASTORE_NAME) }
    )

    suspend fun getApiKey(): String {
        return dataStore.data.map { preferences ->
            val encrypted = preferences[KEY_API_KEY] ?: return@map ""
            decrypt(encrypted)
        }.first()
    }

    suspend fun setApiKey(apiKey: String) {
        val encrypted = encrypt(apiKey)
        dataStore.edit { preferences ->
            preferences[KEY_API_KEY] = encrypted
        }
    }

    private fun encrypt(text: String): String {
        if (text.isEmpty()) return ""
        val ciphertext = aead.encrypt(text.toByteArray(Charsets.UTF_8), null)
        return android.util.Base64.encodeToString(ciphertext, android.util.Base64.DEFAULT)
    }

    private fun decrypt(encryptedText: String): String {
        if (encryptedText.isEmpty()) return ""
        return try {
            val ciphertext = android.util.Base64.decode(encryptedText, android.util.Base64.DEFAULT)
            val decrypted = aead.decrypt(ciphertext, null)
            String(decrypted, Charsets.UTF_8)
        } catch (e: Exception) {
            ""
        }
    }

    // Synchronous access for compatibility with existing code if needed, 
    // but ideally the app should move to coroutines.
    fun getApiKeySync(): String = runBlocking { getApiKey() }
    fun setApiKeySync(key: String) = runBlocking { setApiKey(key) }
}
