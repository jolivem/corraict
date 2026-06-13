package com.aicorrect.plume

import okhttp3.Call
import okhttp3.Callback
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Authentification in-app contre le backend AiCorrect, sans passer par le site
 * ni par un QR code. Enchaîne les endpoints existants :
 *
 *   1. POST /v1/auth/request-code   { email, locale }            → envoie le code
 *   2. POST /v1/auth/verify-code    { email, code }              → pose le cookie de session
 *   3. POST /v1/auth/tokens         { label }  (avec la session) → renvoie le token "aic_…"
 *
 * Le cookie de session posé par l'étape 2 est conservé par un CookieJar en
 * mémoire et renvoyé automatiquement à l'étape 3 (le tout dans le même client).
 *
 * Les callbacks sont appelés depuis un thread OkHttp : l'appelant (Activity)
 * doit repasser sur le thread UI lui-même (runOnUiThread).
 */
object AuthClient {

    private const val BASE_URL = "https://api.aicorrect.app"
    private val JSON = "application/json; charset=utf-8".toMediaType()

    private val plainClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()
    }

    /** Garde en mémoire les cookies d'une session de connexion (un seul host). */
    private class SessionCookieJar : CookieJar {
        private val store = mutableListOf<Cookie>()
        override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
            store.addAll(cookies)
        }
        override fun loadForRequest(url: HttpUrl): List<Cookie> = store.toList()
    }

    /** Étape 1 : demande l'envoi du code à 6 chiffres par email. */
    fun requestCode(
        email: String,
        locale: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        val payload = JSONObject().apply {
            put("email", email)
            put("locale", locale)
        }.toString().toRequestBody(JSON)

        val request = Request.Builder()
            .url("$BASE_URL/v1/auth/request-code")
            .addHeader("Content-Type", "application/json")
            .post(payload)
            .build()

        plainClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError("network")
            }
            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) onSuccess()
                    else onError(errorKey(it.body?.string().orEmpty(), it.code))
                }
            }
        })
    }

    /**
     * Étapes 2 + 3 : vérifie le code (pose le cookie de session) puis crée
     * immédiatement un token d'appareil avec cette session. Renvoie le token brut.
     */
    fun loginAndCreateToken(
        email: String,
        code: String,
        label: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit,
    ) {
        // Client dédié à cette connexion, avec son propre CookieJar.
        val client = OkHttpClient.Builder()
            .cookieJar(SessionCookieJar())
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()

        val verifyPayload = JSONObject().apply {
            put("email", email)
            put("code", code)
        }.toString().toRequestBody(JSON)

        val verifyRequest = Request.Builder()
            .url("$BASE_URL/v1/auth/verify-code")
            .addHeader("Content-Type", "application/json")
            .post(verifyPayload)
            .build()

        client.newCall(verifyRequest).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError("network")
            }
            override fun onResponse(call: Call, response: Response) {
                val failed = response.use { !it.isSuccessful }
                if (failed) {
                    onError("code")
                    return
                }
                // Le cookie de session est maintenant dans le CookieJar : on crée le token.
                createToken(client, label, onSuccess, onError)
            }
        })
    }

    private fun createToken(
        client: OkHttpClient,
        label: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit,
    ) {
        val payload = JSONObject().apply {
            put("label", label.ifBlank { "Android" }.take(100))
        }.toString().toRequestBody(JSON)

        val request = Request.Builder()
            .url("$BASE_URL/v1/auth/tokens")
            .addHeader("Content-Type", "application/json")
            .post(payload)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError("network")
            }
            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val raw = it.body?.string().orEmpty()
                    if (!it.isSuccessful) {
                        onError(errorKey(raw, it.code))
                        return
                    }
                    val token = try {
                        JSONObject(raw).optString("token", "")
                    } catch (_: Exception) {
                        ""
                    }
                    if (token.startsWith("aic_")) onSuccess(token)
                    else onError("generic")
                }
            }
        })
    }

    /** Traduit la réponse d'erreur en une clé simple, interprétée par l'UI. */
    private fun errorKey(raw: String, httpCode: Int): String = when (httpCode) {
        401 -> "code"
        429 -> "rate"
        else -> "generic"
    }
}
