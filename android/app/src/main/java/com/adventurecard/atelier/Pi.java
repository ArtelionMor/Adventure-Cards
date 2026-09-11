package com.adventurecard.atelier;

import android.content.Context;
import android.net.Uri;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * PARLER AU SERVEUR DE L'ATELIER (scripts/devserver.js, sur le Pi) : l'etat de la file de
 * calculs, et les commandes pause / reprendre / stop. Ce sont exactement les routes que
 * la page « Lancer un calcul » et les boutons des notifications utilisent deja — le
 * widget n'ajoute rien cote serveur.
 *
 * L'adresse est gardee dans les preferences de l'app. C'est l'ORIGINE du site
 * (https://teliau.xxxx.ts.net), jamais une page : on la nettoie a l'enregistrement.
 */
final class Pi {
    private static final String PREFS = "atelier";
    private static final String CLE = "adresse";

    private Pi() {}

    static String adresse(Context c) {
        String a = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CLE, null);
        return a == null || a.isEmpty() ? null : a;
    }

    static void enregistre(Context c, String adresse) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(CLE, adresse).apply();
    }

    /** « teliau.xxxx.ts.net/builder/accueil.html » -> « https://teliau.xxxx.ts.net ». Null si ce n'est pas une adresse. */
    static String normalise(String brut) {
        if (brut == null) return null;
        String s = brut.trim();
        if (s.isEmpty()) return null;
        if (!s.contains("://")) s = "https://" + s;
        Uri u = Uri.parse(s);
        if (u.getScheme() == null || u.getAuthority() == null || u.getAuthority().isEmpty()) return null;
        return u.getScheme() + "://" + u.getAuthority();
    }

    /** L'etat de la file : la meme reponse que lit la page (GET /api/run), sans la sortie. */
    static JSONObject etat(Context c) throws Exception {
        return etat(adresse(c));
    }

    static JSONObject etat(String adresse) throws Exception {
        return new JSONObject(requete(adresse + "/api/run?depuis=999999999", "GET"));
    }

    /** pause, reprendre ou stop. */
    static void commande(Context c, String action) throws Exception {
        requete(adresse(c) + "/api/run/" + action, "POST");
    }

    private static String requete(String url, String methode) throws Exception {
        HttpURLConnection h = null;
        try {
            h = (HttpURLConnection) new URL(url).openConnection();
            h.setConnectTimeout(6000);
            h.setReadTimeout(8000);
            h.setRequestMethod(methode);
            if ("POST".equals(methode)) {
                h.setDoOutput(true);
                h.setRequestProperty("Content-Type", "application/json");
                try (OutputStream o = h.getOutputStream()) { o.write("{}".getBytes(StandardCharsets.UTF_8)); }
            }
            int code = h.getResponseCode();
            String corps = lit(code < 400 ? h.getInputStream() : h.getErrorStream());
            if (code == 404) throw new Exception("Ce serveur ne lance pas de calculs (il faut celui du Pi).");
            if (code >= 400) throw new Exception("Le Pi a répondu " + code + ".");
            return corps;
        } catch (IOException e) {
            // Pas de Tailscale, Pi eteint, switch debranche… : le message d'Android est en
            // anglais et parle de sockets. On dit ce qui compte.
            throw new Exception("Le Pi ne répond pas (" + e.getClass().getSimpleName() + ").");
        } finally {
            if (h != null) h.disconnect();
        }
    }

    private static String lit(InputStream in) throws IOException {
        if (in == null) return "";
        try (InputStream i = in; ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] b = new byte[8192];
            for (int n; (n = i.read(b)) > 0; ) o.write(b, 0, n);
            return o.toString("UTF-8");
        }
    }
}
