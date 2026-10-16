// LES TEXTES DU JEU, par CLE : c'est ce qui permettra de traduire (decision du game designer, 9 octobre 2026 :
// « on passera par des cles pour les traductions, dans la game config »). Un ecran ne devrait jamais ecrire un mot
// en dur : il demande `t('combat.tonTour')`. Un jour, ce fichier devient une table par langue (ou une feuille
// Google, comme les animations — voir config/feuille.js) ; les appelants n'ont rien a changer.
// Pour l'instant : tout est en francais, et seuls les mots que l'ecran de combat affiche sans icone sont ici.
export const TEXTES = {
  'combat.tonTour': 'Ton tour',
  'combat.tourAdverse': 'Tour adverse',
  // L'ecran d'equipe et d'amelioration : les mots de la maquette (12 octobre 2026).
  'deck.equipe': 'Equipe',
  'deck.tous': 'Tous',
  'deck.verrouille': 'Locked',
  'deck.niveau': 'Level {n}',
  'deck.ameliorer': 'Upgrade',
  'deck.puissance': '+{n} power',
  // Les ARENES : la fiche (presentation de l'ennemi, puis choix de l'equipe) et l'onglet (16 octobre 2026).
  'arene.onglet': 'Arènes',
  'arene.vide': "Aucune arène découverte : approche-toi d'un bâtiment sur la carte.",
  'arene.niveau': 'Niveau {n}',
  'arene.jamais': 'Jamais battue',
  'arene.battue': 'Battue au niveau {n}',
  'arene.question': 'Ce que ce combat te demande',
  'arene.strategie': 'Stratégie optimale',
  'arene.punit': "Ce qu'il punit",
  'arene.deck': 'Son deck',
  'arene.conseilles': 'Héros conseillés',
  'arene.tousConseilles': 'Toutes les équipes conviennent.',
  'arene.puissance': 'Puissance conseillée : {r} — ta puissance : {p}',
  'arene.provisoire': 'Textes provisoires, pas encore validés.',
  'arene.choisirEquipe': "Choisir l'équipe",
  'arene.fermer': 'Fermer',
  'arene.retour': 'Retour',
  'arene.combattre': 'Combattre',
  'arene.decks': 'Decks enregistrés',
  'arene.aucunDeck': 'Aucun deck enregistré.',
  'arene.enregistrer': '+ Enregistrer ce deck',
  'arene.decksPlein': 'Plus de place : supprime un deck.',
  'arene.oublier': 'Oublier ?',
  'arene.taille': 'Deck : {n} cartes',
  'arene.manque': 'Il te manque {n} carte(s) : un deck en compte au moins {min}.',
  'arene.retraits': 'Retirer une carte (jokers : {n})',
  'arene.pasDeJoker': "Plus de joker de retrait : le profil du joueur en donne.",
  // Le PROFIL DU JOUEUR (le nom de cette progression n'est pas tranche : pas « plan »).
  'profil.titre': 'Profil',
  'profil.niveau': 'Niveau du joueur {n}',
  'profil.xp': '{x} / {y} XP',
  'profil.max': 'Niveau maximum atteint',
  'profil.puissance': 'Puissance : {n}',
  'profil.jokers': 'Jokers de retrait : {n}',
  'profil.places': "Places d'équipe : {n}",
  'profil.recHeros': '{nom} devient recrutable',
  'profil.recPlace': "Une place d'équipe de plus",
  'profil.recJoker': '{n} joker(s) de retrait',
  'profil.depart': 'Départ',
  // LA FERME en grille.
  'ferme.titre': 'Ferme',
  'ferme.champ': 'Champ',
  'ferme.vente': 'Prochaine vente dans {t}',
  'ferme.ouvrir': 'Ouvrir cette case : {n} pièces',
  'ferme.dansLOrdre': "Ouvre les cases dans l'ordre.",
  'ferme.planter': 'Que planter ?',
  'ferme.inconnue': 'À trouver sur la carte',
  'ferme.trouve': 'Tu as trouvé : {liste}.',
  'ferme.dejaTrouve': 'Tu connais déjà tout ce qui pousse ici.'
};

/**
 * Le texte de la cle `cle` ; une cle inconnue s'affiche entre crochets (une faute de frappe se voit).
 * `vars` remplit les trous : t('deck.niveau', { n: 4 }) -> « Level 4 ».
 */
export const t = (cle, vars) => {
  const s = Object.prototype.hasOwnProperty.call(TEXTES, cle) ? TEXTES[cle] : `[${cle}]`;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
};
