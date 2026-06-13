package com.aicorrect.plume

import android.content.Context

/**
 * Stores the Mistral API key securely.
 * Migrated from EncryptedSharedPreferences to Jetpack DataStore with Tink.
 */
object EncryptedKeyStore {

    private var instance: EncryptedDataStore? = null

    private fun getStore(context: Context): EncryptedDataStore {
        return instance ?: synchronized(this) {
            instance ?: EncryptedDataStore(context.applicationContext).also { instance = it }
        }
    }

    /**
     * Retrieves the API key synchronously. 
     * Note: In a real app, prefer using the suspend functions in EncryptedDataStore.
     */
    fun getApiKey(context: Context): String =
        getStore(context).getApiKeySync()

    /**
     * Saves the API key synchronously.
     * Note: In a real app, prefer using the suspend functions in EncryptedDataStore.
     */
    fun setApiKey(context: Context, key: String) {
        getStore(context).setApiKeySync(key)
    }

    /**
     * Retrieves the AiCorrect server API token (Bearer aic_...) — utilisé en
     * mode SERVER. Stocké chiffré, distinct de la clé Mistral.
     */
    fun getServerToken(context: Context): String =
        getStore(context).getServerTokenSync()

    fun setServerToken(context: Context, token: String) {
        getStore(context).setServerTokenSync(token)
    }
}
