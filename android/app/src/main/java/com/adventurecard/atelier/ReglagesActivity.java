package com.adventurecard.atelier;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

/**
 * L'ECRAN DE REGLAGE : l'adresse du serveur de l'Atelier, sur le Pi.
 *
 * Le plus simple est de ne rien taper : l'accueil de l'Atelier, ouvert sur le telephone,
 * a un bouton « Regler le widget Android » qui ouvre cet ecran avec le lien
 * atelier://config?url=<son adresse>. L'adresse est alors enregistree et testee d'un coup.
 *
 * L'ecran est construit en code plutot qu'en XML : trois champs ne valent pas un layout,
 * et ca evite toute bibliotheque de compatibilite.
 */
public class ReglagesActivity extends Activity {
    private EditText champ;
    private TextView retour;

    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        int p = dp(20);
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(p, p * 3, p, p);

        TextView titre = new TextView(this);
        titre.setText("Widget Atelier");
        titre.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        l.addView(titre);

        TextView aide = new TextView(this);
        aide.setText("L'adresse de l'Atelier sur le Pi. Le plus simple : ouvre l'Atelier sur ce téléphone "
            + "et touche « Régler le widget Android » sur son accueil. Sinon, recopie son adresse "
            + "(https://….ts.net).");
        aide.setPadding(0, dp(12), 0, dp(12));
        l.addView(aide);

        champ = new EditText(this);
        champ.setHint("https://teliau.xxxx.ts.net");
        champ.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        champ.setSingleLine(true);
        String actuelle = Pi.adresse(this);
        if (actuelle != null) champ.setText(actuelle);
        l.addView(champ, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout boutons = new LinearLayout(this);
        boutons.setOrientation(LinearLayout.HORIZONTAL);
        Button tester = new Button(this);
        tester.setText("Tester");
        tester.setOnClickListener(x -> teste());
        Button enregistrer = new Button(this);
        enregistrer.setText("Enregistrer");
        enregistrer.setOnClickListener(x -> enregistre());
        boutons.addView(tester);
        boutons.addView(enregistrer);
        l.addView(boutons);

        retour = new TextView(this);
        retour.setPadding(0, dp(12), 0, 0);
        l.addView(retour);

        TextView ensuite = new TextView(this);
        ensuite.setText("\nPour poser le widget : appui long sur l'écran d'accueil → Widgets → Widget Atelier → Simulations.");
        l.addView(ensuite);

        ScrollView defile = new ScrollView(this);
        defile.addView(l);
        setContentView(defile);

        traiteLien(getIntent());
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        traiteLien(i);
    }

    /** atelier://config?url=https://… — le lien de l'accueil de l'Atelier. */
    private void traiteLien(Intent i) {
        Uri d = i == null ? null : i.getData();
        if (d == null || !"atelier".equals(d.getScheme())) return;
        String url = d.getQueryParameter("url");
        if (url == null) return;
        champ.setText(url);
        enregistre();
        teste();
    }

    private void enregistre() {
        String a = Pi.normalise(champ.getText().toString());
        if (a == null) { retour.setText("Ce n'est pas une adresse."); return; }
        Pi.enregistre(this, a);
        champ.setText(a);
        WidgetFile.demandeRafraichissement(this);
        retour.setText("Enregistrée : " + a);
    }

    private void teste() {
        String a = Pi.normalise(champ.getText().toString());
        if (a == null) { retour.setText("Ce n'est pas une adresse."); return; }
        retour.setText("Test en cours…");
        new Thread(() -> {
            String m;
            try {
                JSONObject lot = Pi.etat(a).optJSONObject("lot");
                m = "✓ Le Pi répond. " + (lot == null ? "Aucune file lancée pour l'instant."
                    : lot.optBoolean("actif") ? "Une file tourne." : "La dernière file est terminée.");
            } catch (Exception e) {
                m = "✗ " + e.getMessage();
            }
            final String message = m;
            runOnUiThread(() -> retour.setText(message));
        }).start();
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
