package com.aicorrect.plume

import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Client HTTP du backend AiCorrect (mode "serveur").
 *
 * Le keyboard peut fonctionner en deux modes :
 *   - DIRECT_MISTRAL → appel direct à api.mistral.ai avec la clé Mistral du user
 *   - SERVER (ici)   → appel à api.aicorrect.app/v1/correct avec un Bearer
 *                      token API généré depuis le dashboard web. Le serveur
 *                      vérifie le token, le quota / la subscription active,
 *                      puis appelle Mistral pour son compte.
 *
 * Le body envoyé :
 *   {
 *     "text":     "<texte à corriger>",
 *     "language": "fr" | "en"              // pour le prompt de correction
 *     "locale":   "fr-FR"                  // BCP 47 du device (futur usage)
 *   }
 *
 * En cas d'erreur :
 *   - 401 → token invalide / révoqué
 *   - 402 → quota dépassé (free tier) ou billing requis. Le body JSON inclut
 *           un `code` parmi : quota_exceeded, account_suspended, billing_required.
 *   - 403 → compte suspendu
 *   - 5xx → erreur serveur ou Mistral upstream
 *
 * Le caller récupère un message texte exploitable via `onError(String)`.
 */
object AiCorrectClient {

    // L'URL est codée en dur ici car le backend de prod est unique. Pour le
    // staging on changera de build flavor ou on ajoutera un setting.
    private const val BASE_URL = "https://api.aicorrect.app"
    private const val CORRECT_PATH = "/v1/correct"
    private val JSON = "application/json; charset=utf-8".toMediaType()

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .build()
    }

    fun correct(
        token: String,
        language: String,
        locale: String,
        text: String,
        onSuccess: (String) -> Unit,
        onError: (message: String, code: String) -> Unit,
    ) {
        val payload = JSONObject().apply {
            put("text", text)
            put("language", language)
            put("locale", locale)
        }.toString().toRequestBody(JSON)

        val request = Request.Builder()
            .url(BASE_URL + CORRECT_PATH)
            .addHeader("Authorization", "Bearer $token")
            .addHeader("Content-Type", "application/json")
            .post(payload)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                // Pas de Context ici (couche réseau) : on remonte un code stable,
                // le message localisé est choisi par l'appelant (keyboard service).
                onError(e.message ?: "", "network_error")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val raw = it.body?.string().orEmpty()
                    if (it.isSuccessful) {
                        try {
                            val corrected = JSONObject(raw).getString("corrected").trim()
                            onSuccess(corrected)
                        } catch (ex: Exception) {
                            onError("", "invalid_response")
                        }
                        return
                    }
                    // Erreur structurée : { code, message, ... } ou Nest enveloppe { message, statusCode }
                    // Le `code` (ex. quota_exceeded) est remonté tel quel pour que
                    // l'appelant puisse adapter l'UI (message dédié, etc.).
                    onError(parseErrorMessage(raw, it.code), parseErrorCode(raw))
                }
            }
        })
    }

    /**
     * Extrait le `code` métier du body d'erreur (ex. quota_exceeded), ou "".
     * `internal` (et non `private`) pour être testable unitairement (JVM).
     */
    internal fun parseErrorCode(raw: String): String =
        try {
            JSONObject(raw).optString("code", "")
        } catch (_: Exception) {
            ""
        }

    /** `internal` (et non `private`) pour être testable unitairement (JVM). */
    internal fun parseErrorMessage(raw: String, httpCode: Int): String {
        if (raw.isBlank()) return "Erreur HTTP $httpCode"
        return try {
            val obj = JSONObject(raw)
            // Cas 1 : exception custom du backend (quota_exceeded, account_suspended, ...)
            val code = obj.optString("code", "")
            if (code.isNotEmpty()) {
                when (code) {
                    // Message de repli : l'UI affiche en réalité un toast dédié
                    // (toast_quota_reached) en se basant sur le code remonté.
                    "quota_exceeded" -> "Quota de correction atteint."
                    "account_suspended" -> "Compte suspendu."
                    "billing_required" -> "Abonnement requis."
                    "correction_unavailable" -> "Service de correction temporairement indisponible."
                    else -> obj.optString("message").ifEmpty { "Erreur : $code" }
                }
            } else {
                // Cas 2 : message Nest standard. `message` peut être string ou array.
                val message = obj.opt("message")
                when (message) {
                    is String -> message
                    null -> "Erreur HTTP $httpCode"
                    else -> message.toString()
                }
            }
        } catch (_: Exception) {
            "HTTP $httpCode: ${raw.take(120)}"
        }
    }
}
