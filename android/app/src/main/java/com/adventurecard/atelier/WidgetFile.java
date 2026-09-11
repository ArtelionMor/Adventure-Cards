package com.adventurecard.atelier;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.SystemClock;
import android.text.SpannableString;
import android.text.style.StyleSpan;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * LE WIDGET DE LA FILE DE SIMULATIONS — les maquettes mockups/iPhone 17 - 1.png (en cours)
 * et - 2.png (terminee).
 *
 * Il lit l'etat de la file sur le Pi (GET /api/run, la meme reponse que la page « Lancer
 * un calcul ») et dessine : le titre, la barre de la file entiere (rouge pendant, verte a
 * la fin), les boutons ■ et ❚❚ / ▶, cinq lignes centrees sur celle qui tourne (en jaune,
 * les autres de plus en plus pales), et « Analyser les resultats » a la fin.
 *
 * LA CADENCE : Android ne met un widget a jour de lui-meme que toutes les 30 min au
 * mieux. Tant qu'une file tourne, le widget se redemande donc lui-meme toutes les ~45 s
 * (un reveil inexact : Android peut le retarder quand le telephone dort, et c'est tres
 * bien ainsi pour la batterie) ; quand la file est finie, il cesse. Toucher le pied du
 * widget l'actualise tout de suite, et un bouton actualise apres avoir commande.
 */
public class WidgetFile extends AppWidgetProvider {
    static final String RAFRAICHIR = "com.adventurecard.atelier.RAFRAICHIR";
    static final String COMMANDE = "com.adventurecard.atelier.COMMANDE";
    static final String EXTRA_ACTION = "action";

    private static final long CADENCE_MS = 45_000;
    private static final int[] LIGNES = { R.id.ligne0, R.id.ligne1, R.id.ligne2, R.id.ligne3, R.id.ligne4 };

    private static final int BLANC = 0xFFFFFFFF;
    private static final int GRIS = 0xFFB0B6C2;
    private static final int JAUNE = 0xFFF5C518;
    private static final int VERT = 0xFFA5D6A7;
    private static final int ROUGE = 0xFFFF8A80;

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        travaille(ctx, goAsync(), null);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (RAFRAICHIR.equals(a)) travaille(ctx, goAsync(), null);
        else if (COMMANDE.equals(a)) travaille(ctx, goAsync(), intent.getStringExtra(EXTRA_ACTION));
    }

    @Override
    public void onDisabled(Context ctx) {
        planifie(ctx, false);   // plus aucun widget pose : plus de reveil
    }

    /** Demande une mise a jour (l'ecran de reglage s'en sert apres un changement d'adresse). */
    static void demandeRafraichissement(Context ctx) {
        ctx.sendBroadcast(new Intent(ctx, WidgetFile.class).setAction(RAFRAICHIR));
    }

    /** Le reseau hors du fil principal — Android tuerait le widget sinon. `goAsync` laisse ~10 s. */
    private static void travaille(Context ctx, PendingResult fin, String commande) {
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                if (Pi.adresse(app) == null) {
                    dessine(app, null, null);
                    return;
                }
                if (commande != null) Pi.commande(app, commande);
                dessine(app, Pi.etat(app), null);
            } catch (Exception e) {
                dessine(app, null, e.getMessage() == null ? e.toString() : e.getMessage());
            } finally {
                fin.finish();
            }
        }).start();
    }

    static void dessine(Context ctx, JSONObject e, String erreur) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_file);
        String adresse = Pi.adresse(ctx);
        boolean actif = false;

        v.setViewVisibility(R.id.btnPause, View.GONE);
        v.setViewVisibility(R.id.btnStop, View.GONE);
        v.setViewVisibility(R.id.btnAnalyser, View.GONE);
        v.setViewVisibility(R.id.barreEncours, View.VISIBLE);
        v.setViewVisibility(R.id.barreFinie, View.GONE);
        v.setProgressBar(R.id.barreEncours, 100, 0, false);
        v.setTextViewText(R.id.pct, "");
        for (int id : LIGNES) v.setViewVisibility(id, View.GONE);

        if (adresse == null) {
            v.setTextViewText(R.id.titre, "Widget à régler");
            ligne(v, 0, "Touche ici pour indiquer l'adresse du Pi.", BLANC, true);
            v.setOnClickPendingIntent(R.id.racine, reglages(ctx));
        } else if (erreur != null) {
            v.setTextViewText(R.id.titre, "Pi injoignable");
            ligne(v, 0, erreur, GRIS, false);
            ligne(v, 1, "Tailscale est-il actif sur le téléphone ?", GRIS, false);
            v.setOnClickPendingIntent(R.id.titre, reglages(ctx));
        } else {
            JSONObject lot = e.optJSONObject("lot");
            if (lot == null) {
                v.setTextViewText(R.id.titre, "Aucune simulation");
                ligne(v, 0, "Lance une file depuis l'Atelier.", GRIS, false);
            } else {
                actif = dessineLot(ctx, v, lot, adresse);
            }
            v.setOnClickPendingIntent(R.id.titre, vue(ctx, adresse + "/builder/lancer.html"));
        }

        String heure = new SimpleDateFormat("HH:mm", Locale.FRANCE).format(new Date());
        v.setTextViewText(R.id.pied, "à " + heure + (actif ? " · suivi toutes les ~45 s" : "") + " · touche pour actualiser");
        v.setOnClickPendingIntent(R.id.pied, rafraichir(ctx));

        AppWidgetManager.getInstance(ctx).updateAppWidget(new ComponentName(ctx, WidgetFile.class), v);
        planifie(ctx, actif);
    }

    /** La file : titre, barre, boutons, et la fenetre de cinq lignes. Rend « la file tourne-t-elle ? ». */
    private static boolean dessineLot(Context ctx, RemoteViews v, JSONObject lot, String adresse) {
        boolean actif = lot.optBoolean("actif");
        boolean pause = lot.optBoolean("pause");
        JSONArray lignes = lot.optJSONArray("lignes");
        int n = lignes == null ? 0 : lignes.length();
        int finis = 0;
        for (int i = 0; i < n; i++) if ("fini".equals(lignes.optJSONObject(i).optString("etat"))) finis++;

        String titre = actif ? (pause ? "Simulations en pause" : "Simulations en cours")
            : lot.optBoolean("arrete") ? "Simulations arrêtées" : "Simulations terminées";
        if (n > 1) titre += "  ·  " + Math.min(lot.optInt("faites") + (actif ? 1 : 0), n) + "/" + n;
        v.setTextViewText(R.id.titre, titre);

        int pct = (int) Math.floor(lot.optDouble("progression", 0) * 100);
        int barre = actif ? R.id.barreEncours : R.id.barreFinie;
        v.setViewVisibility(R.id.barreEncours, actif ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.barreFinie, actif ? View.GONE : View.VISIBLE);
        v.setProgressBar(barre, 100, pct, false);
        v.setTextViewText(R.id.pct, pct + "%");

        if (actif) {
            v.setViewVisibility(R.id.btnStop, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.btnStop, commande(ctx, "stop"));
            v.setViewVisibility(R.id.btnPause, View.VISIBLE);
            v.setTextViewText(R.id.btnPause, pause ? "▶" : "❚❚");
            v.setOnClickPendingIntent(R.id.btnPause, commande(ctx, pause ? "reprendre" : "pause"));
        } else if (finis > 0) {
            v.setViewVisibility(R.id.btnAnalyser, View.VISIBLE);
            v.setOnClickPendingIntent(R.id.btnAnalyser, vue(ctx, adresse + "/builder/lancer.html#resultats"));
        }

        // LA LIGNE AU CENTRE : celle qui tourne ; en pause entre deux calculs, la prochaine ;
        // file finie, la derniere jouee. Les cinq lignes affichees l'entourent.
        int centre = -1;
        for (int i = 0; i < n && centre < 0; i++) if ("encours".equals(lignes.optJSONObject(i).optString("etat"))) centre = i;
        if (centre < 0 && actif) for (int i = 0; i < n && centre < 0; i++) if ("attente".equals(lignes.optJSONObject(i).optString("etat"))) centre = i;
        if (centre < 0) for (int i = n - 1; i >= 0 && centre < 0; i--) if (!"annule".equals(lignes.optJSONObject(i).optString("etat"))) centre = i;
        if (centre < 0) centre = 0;
        int debut = Math.max(0, Math.min(centre - 2, n - LIGNES.length));

        for (int k = 0; k < LIGNES.length && debut + k < n; k++) {
            int i = debut + k;
            JSONObject l = lignes.optJSONObject(i);
            String etat = l.optString("etat");
            boolean ici = i == centre;
            int couleur = ici ? (actif ? JAUNE : VERT) : "echec".equals(etat) ? ROUGE : BLANC;
            int distance = Math.abs(i - centre);
            int alpha = ici ? 255 : distance == 1 ? 150 : 85;
            ligne(v, k, l.optString("libelle"), (alpha << 24) | (couleur & 0x00FFFFFF), ici);
        }
        return actif;
    }

    private static void ligne(RemoteViews v, int k, String texte, int couleur, boolean gras) {
        SpannableString s = new SpannableString(texte);
        if (gras) s.setSpan(new StyleSpan(Typeface.BOLD), 0, s.length(), 0);
        v.setTextViewText(LIGNES[k], s);
        v.setTextColor(LIGNES[k], couleur);
        v.setViewVisibility(LIGNES[k], View.VISIBLE);
    }

    // ------------------------------------------------------------ les intentions
    private static final int FLAGS = PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT;

    private static PendingIntent commande(Context ctx, String action) {
        Intent i = new Intent(ctx, WidgetFile.class).setAction(COMMANDE).putExtra(EXTRA_ACTION, action);
        return PendingIntent.getBroadcast(ctx, action.hashCode(), i, FLAGS);
    }

    private static PendingIntent rafraichir(Context ctx) {
        return PendingIntent.getBroadcast(ctx, 1, new Intent(ctx, WidgetFile.class).setAction(RAFRAICHIR), FLAGS);
    }

    /** Ouvre une page de l'Atelier — dans l'app installee si elle l'est, sinon dans le navigateur. */
    private static PendingIntent vue(Context ctx, String url) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, url.hashCode(), i, FLAGS);
    }

    private static PendingIntent reglages(Context ctx) {
        Intent i = new Intent(ctx, ReglagesActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, 2, i, FLAGS);
    }

    /** Le prochain reveil tant que la file tourne ; aucun sinon. */
    private static void planifie(Context ctx, boolean actif) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent pi = rafraichir(ctx);
        if (actif) am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + CADENCE_MS, pi);
        else am.cancel(pi);
    }
}
