// LES TEXTES DU JEU, par CLE : c'est ce qui permettra de traduire (decision du game designer, 9 octobre 2026 :
// « on passera par des cles pour les traductions, dans la game config »). Un ecran ne devrait jamais ecrire un mot
// en dur : il demande `t('combat.tonTour')`. Un jour, ce fichier devient une table par langue (ou une feuille
// Google, comme les animations — voir config/feuille.js) ; les appelants n'ont rien a changer.
// Pour l'instant : tout est en francais, et seuls les mots que l'ecran de combat affiche sans icone sont ici.
export const TEXTES = {
  'combat.tonTour': 'Ton tour',
  'combat.tourAdverse': 'Tour adverse'
};

/** Le texte de la cle `cle` ; une cle inconnue s'affiche entre crochets (une faute de frappe se voit). */
export const t = cle => (Object.prototype.hasOwnProperty.call(TEXTES, cle) ? TEXTES[cle] : `[${cle}]`);
