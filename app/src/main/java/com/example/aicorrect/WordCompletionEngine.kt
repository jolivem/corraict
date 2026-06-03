package com.example.aicorrect

import android.content.Context
import java.text.Normalizer

/**
 * Moteur de complétion de mots 100 % local et hors-ligne.
 *
 * Charge un dictionnaire embarqué (`mot<TAB>rang`, rang = position de fréquence,
 * plus petit = plus fréquent) et propose les complétions du préfixe en cours.
 *
 * Structure : trois tableaux parallèles triés par clé « normalisée » (minuscule
 * sans accent), pour faire une recherche dichotomique. Comme on normalise des
 * deux côtés (clés ET préfixe tapé), la tolérance aux accents est gratuite :
 * taper « etre » comme « être » mène à la clé « etre ».
 *
 * Le chargement doit se faire HORS du thread principal ; tant que [ready] est
 * faux, [suggest] renvoie une liste vide (jamais de blocage).
 */
class WordCompletionEngine {

    @Volatile private var keys: Array<String> = emptyArray()   // clés normalisées, triées
    @Volatile private var words: Array<String> = emptyArray()  // mot original (accentué) ⟷ même index
    @Volatile private var ranks: IntArray = IntArray(0)        // rang de fréquence ⟷ même index

    @Volatile var ready: Boolean = false
        private set

    /** Lit l'asset et construit les tableaux triés. À appeler en arrière-plan. */
    fun load(context: Context, assetPath: String) {
        try {
            val triples = ArrayList<Triple<String, String, Int>>(50_000)
            context.assets.open(assetPath).bufferedReader(Charsets.UTF_8).useLines { lines ->
                for (line in lines) {
                    val tab = line.indexOf('\t')
                    if (tab <= 0) continue
                    val word = line.substring(0, tab)
                    val rank = line.substring(tab + 1).trim().toIntOrNull() ?: continue
                    triples.add(Triple(fold(word), word, rank))
                }
            }
            // Tri par clé normalisée avec la MÊME comparaison (String.compareTo) que
            // la recherche dichotomique : garantit la cohérence du binaire.
            triples.sortBy { it.first }
            val n = triples.size
            keys = Array(n) { triples[it].first }
            words = Array(n) { triples[it].second }
            ranks = IntArray(n) { triples[it].third }
            ready = true
        } catch (_: Throwable) {
            // Asset manquant / erreur IO : on reste non prêt (aucune suggestion).
        }
    }

    /** Renvoie jusqu'à [max] mots (accentués) commençant par [prefix], les plus fréquents d'abord. */
    fun suggest(prefix: String, max: Int = 3): List<String> {
        if (!ready || prefix.isEmpty() || max <= 0) return emptyList()
        val k = keys
        val p = fold(prefix)
        if (p.isEmpty()) return emptyList()

        val lo = lowerBound(k, p)
        if (lo >= k.size || !k[lo].startsWith(p)) return emptyList()

        // Sélection des `max` meilleurs rangs sur la tranche contiguë qui commence par p,
        // en un seul passage (pas de tri global, pas d'allocation proportionnelle à la tranche).
        val bestIdx = IntArray(max) { -1 }
        val bestRank = IntArray(max) { Int.MAX_VALUE }
        var i = lo
        while (i < k.size && k[i].startsWith(p)) {
            val rk = ranks[i]
            var slot = -1
            for (s in 0 until max) {
                if (rk < bestRank[s]) { slot = s; break }
            }
            if (slot >= 0) {
                for (s in max - 1 downTo slot + 1) {
                    bestRank[s] = bestRank[s - 1]
                    bestIdx[s] = bestIdx[s - 1]
                }
                bestRank[slot] = rk
                bestIdx[slot] = i
            }
            i++
        }

        val out = ArrayList<String>(max)
        for (s in 0 until max) {
            val idx = bestIdx[s]
            if (idx >= 0) out.add(words[idx])
        }
        return out
    }

    /** Premier index dont la clé est ≥ target. */
    private fun lowerBound(arr: Array<String>, target: String): Int {
        var lo = 0
        var hi = arr.size
        while (lo < hi) {
            val mid = (lo + hi) ushr 1
            if (arr[mid] < target) lo = mid + 1 else hi = mid
        }
        return lo
    }

    companion object {
        /** Minuscule + suppression des accents (marques diacritiques). */
        fun fold(s: String): String {
            val normalized = Normalizer.normalize(s, Normalizer.Form.NFD)
            val sb = StringBuilder(normalized.length)
            for (c in normalized) {
                if (Character.getType(c) != Character.NON_SPACING_MARK.toInt()) sb.append(c)
            }
            return sb.toString().lowercase()
        }
    }
}
