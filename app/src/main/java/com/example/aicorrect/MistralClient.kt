package com.example.aicorrect

import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object MistralClient {

    private const val ENDPOINT = "https://api.mistral.ai/v1/chat/completions"
    private const val MODELS_ENDPOINT = "https://api.mistral.ai/v1/models"
    private val JSON = "application/json; charset=utf-8".toMediaType()

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    fun testConnection(
        apiKey: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        val request = Request.Builder()
            .url(MODELS_ENDPOINT)
            .addHeader("Authorization", "Bearer $apiKey")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e.message ?: "Network error")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (it.isSuccessful) {
                        onSuccess()
                    } else {
                        val body = it.body?.string()?.take(200).orEmpty()
                        onError("HTTP ${it.code}: $body")
                    }
                }
            }
        })
    }

    fun correct(
        apiKey: String,
        model: String,
        language: String,
        text: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit,
    ) {
        val systemPrompt = buildSystemPrompt(language)

        val body = JSONObject().apply {
            put("model", model)
            put("temperature", 0.0)
            put("messages", JSONArray().apply {
                put(JSONObject().put("role", "system").put("content", systemPrompt))
                put(JSONObject().put("role", "user").put("content", text))
            })
        }.toString().toRequestBody(JSON)

        val request = Request.Builder()
            .url(ENDPOINT)
            .addHeader("Authorization", "Bearer $apiKey")
            .addHeader("Content-Type", "application/json")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError(e.message ?: "Network error")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val raw = it.body?.string().orEmpty()
                    if (!it.isSuccessful) {
                        onError("HTTP ${it.code}: ${raw.take(200)}")
                        return
                    }
                    try {
                        val content = JSONObject(raw)
                            .getJSONArray("choices")
                            .getJSONObject(0)
                            .getJSONObject("message")
                            .getString("content")
                            .trim()
                        onSuccess(content)
                    } catch (ex: Exception) {
                        onError("Parse error: ${ex.message}")
                    }
                }
            }
        })
    }

    private fun buildSystemPrompt(language: String): String {
        val langName = when (language) {
            "en" -> "anglais"
            else -> "français"
        }
        return """
            Tu es un correcteur orthographique et grammatical strict pour du texte en $langName.

            RÈGLES :
            - Corrige UNIQUEMENT les fautes d'orthographe, de grammaire, les accents manquants et les fautes de frappe évidentes.
            - NE reformule PAS, NE réécris PAS, N'améliore PAS le style.
            - NE change PAS le choix des mots, même si un mot paraît familier ou maladroit.
            - NE change PAS la ponctuation sauf si elle est grammaticalement incorrecte.
            - N'ajoute ni ne supprime de contenu. Garde le même nombre de phrases.
            - Préserve les sauts de ligne, la casse et le ton exact de l'utilisateur.
            - Si le texte est déjà correct, renvoie-le tel quel.

            FORMAT DE SORTIE :
            - Réponds UNIQUEMENT avec le texte corrigé.
            - Pas de guillemets autour du texte.
            - Pas d'explication, pas de préfixe ("Voici…"), pas de suffixe.
            - Pas de formatage markdown.
        """.trimIndent()
    }
}
