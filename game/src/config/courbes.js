// COURBES DE PROGRESSION — « de combien monte cette stat, et a quels niveaux ? ».
//
// C'est le modele derriere l'editeur de l'Atelier (`builder/courbes.html`), et ce que le
// moteur relira pour buffer ses adversaires au fil des niveaux. Il vit dans
// game/src/config/ pour la meme raison que `mechanics.js` : c'est un REGISTRE (rythmes,
// formes, echelles) plus les quelques fonctions qui le lisent, et la page du builder
// l'importe tel quel — une seule implementation, donc les memes chiffres dans l'editeur,
// dans le banc de test et, demain, dans le jeu. Les profils, eux, sont des VALEURS
// d'equilibrage : ils se rangent dans les donnees, jamais en dur ici.
//
// LE MODELE, en trois phrases. Un PROFIL contient des COLONNES — une colonne, c'est une
// stat qui evolue (les PV d'un ennemi, ses degats, son armure, le cout en mana d'une
// carte). A chaque niveau, une ou plusieurs colonnes PRENNENT LEUR TOUR et changent de
// valeur ; les autres repliquent la precedente. Chaque colonne porte deux objets
// INDEPENDANTS : un RYTHME (quand est-ce son tour ?) et une COURBE (quelle valeur a ce
// niveau-la ?).
//
// ⚠ LES DEUX NE SE TOUCHENT JAMAIS, et c'est la regle qui tient tout le fichier : la
// valeur d'une colonne est TOUJOURS celle de sa courbe au niveau ou le tour tombe —
// `Math.round(valeurBornee(col, niveau))`, rien d'autre. Changer un rythme deplace donc
// les valeurs sur l'axe des niveaux ; il ne peut pas deformer la courbe, ni faire dire a
// une colonne un nombre qui n'est pas sur la sienne. C'est aussi ce qui la rend
// impermeable aux rythmes des AUTRES colonnes : eux ne decident que le QUAND.
//
// LA CONTRAINTE ABSOLUE : chaque ligne differe de la precedente. Un niveau qui ne change
// rien est un niveau qui ne se sent pas. Tout le reste en decoule — la normalisation des
// poids (un tour a distribuer par niveau), le tour force quand personne ne bougerait, et
// la regle |Δvaleur| >= K que la validation impose a chaque segment.

// ---------- LA DETTE : LA PRIMITIVE, ET ELLE SERT AUX DEUX BOUTS ----------

/**
 * « Rendre des choses entieres quand la cible, elle, ne tombe pas juste. »
 *
 * On garde la cible REELLE au compteur, on rend l'entier, et l'ecart — la dette — reste
 * du. Il n'est jamais jete : c'est exactement ce qui empeche la derive.
 *
 * Les deux repartitions de l'outil sortent de cette seule ardoise :
 *   - LES TOURS entre les colonnes. La cible d'une colonne apres L niveaux vaut L·w (son
 *     poids normalise) ; `creanciere()` dit qui doit le plus, `rend()` lui donne le tour
 *     du niveau et rembourse 1.
 *   - LES POINTS entre les tours d'un segment. La cible d'un tour est la valeur exacte de
 *     la courbe a son niveau ; `versEntier()` rend l'arrondi et garde l'ecart. C'est
 *     « arrondir la cible cumulee, puis prendre les differences » — ⚠ jamais l'inverse :
 *     arrondir l'increment ferait deriver la colonne de plusieurs points sur 40 niveaux,
 *     et une derive ne se voit pas, elle se constate trop tard.
 *
 * La phase de depart vaut 0.5·poids (`avance(poids.map(w => 0.5 * w))`) : a 0, tout le
 * monde attendrait un tour entier avant de rien recevoir, et la colonne 0 partirait
 * systematiquement en tete. Ne pas la remplacer par 0.
 */
export function ardoise(n) {
  const cible = new Array(n).fill(0);
  const rendu = new Array(n).fill(0);
  return {
    /** Chaque part gagne son du. */
    avance(poids) { for (let i = 0; i < n; i++) cible[i] += poids[i] || 0; },
    /** Ce qu'on doit encore a la part i. */
    du: i => cible[i] - rendu[i],
    /** La plus creanciere parmi celles que `ok` accepte. Egalite : plus petit indice. */
    creanciere(ok = () => true) {
      let m = -1;
      for (let i = 0; i < n; i++) {
        if (!ok(i)) continue;
        if (m < 0 || cible[i] - rendu[i] > cible[m] - rendu[m] + 1e-9) m = i;
      }
      return m;
    },
    /** La part i recoit son du : d'autant de dette en moins. */
    rend(i, x = 1) { rendu[i] += x; return x; },
    /** La part i vise `x` : on rend l'entier le plus proche, l'ecart reste du. */
    versEntier(i, x) { cible[i] = x; const v = Math.round(x); const pas = v - rendu[i]; rendu[i] = v; return pas; }
  };
}

// ---------- LES REGISTRES ----------

/**
 * QUAND EST-CE SON TOUR. `taux` = la colonne entre dans la rotation a dette (elle a une
 * frequence, donc un poids) ; sans `taux`, elle ne bouge qu'aux niveaux qu'on lui a
 * ecrits — c'est fait pour les evenements rares poses a la main, ou une frequence serait
 * une mauvaise abstraction (« le boss gagne son aura aux niveaux 6, 14 et 25 »).
 */
export const RYTHMES = {
  regulier: {
    label: '1 sur X',
    desc: "Un tour tous les X niveaux. C'est un poids RELATIF : les colonnes se partagent un tour par niveau.",
    taux: true
  },
  toujours: {
    label: 'Toujours',
    desc: "A chaque niveau (equivaut a 1 sur 1). Face a une autre colonne aussi pressee, elles alternent.",
    taux: true
  },
  liste: {
    label: 'Niveaux choisis',
    desc: "Les niveaux sont ecrits a la main : 6, 14, 25. Hors rotation — ces tours-la ne se negocient pas.",
    taux: false
  }
};

/** LA FORME d'un segment : comment on va d'une keyframe a la suivante. */
export const FORMES = {
  lineaire: { label: 'Linéaire', desc: 'A vitesse constante.', f: t => t },
  easeIn: { label: 'Ease-in (démarre doucement)', desc: "Lent d'abord, rapide a la fin.", f: t => t * t },
  easeOut: { label: 'Ease-out (finit doucement)', desc: "Rapide d'abord, lent a la fin.", f: t => t * (2 - t) }
};

/**
 * L'ECHELLE d'un segment : dans quel espace on interpole.
 *   additive — on ajoute des points. De 10 a 50, le milieu est a 30.
 *   proportionnelle — on multiplie. De 10 a 40, le milieu est a 20, pas a 25 :
 *     l'interpolation se fait dans l'espace log, donc chaque pas vaut un FACTEUR.
 * ⚠ La proportionnelle ne sait pas traverser 0 : une keyframe a 0 ou un changement de
 * signe la rendent impossible (un facteur ne sort jamais de son signe), et la validation
 * le dit au lieu de rendre un NaN silencieux.
 */
export const ECHELLES = {
  additive: { label: 'Additive (+ points)', desc: 'On ajoute des points : le milieu est la moyenne.' },
  proportionnelle: { label: 'Proportionnelle (× facteur)', desc: "On multiplie : chaque pas vaut un facteur, pas un nombre de points." }
};

/** CE QU'ON RANGE : la valeur elle-meme, ou l'ecart depuis le depart de la colonne. */
export const STOCKAGES = {
  absolu: { label: 'Valeur absolue', desc: 'La stat telle quelle : 20, 24, 29…' },
  modificateur: { label: 'Modificateur cumulé', desc: "L'ecart depuis la valeur de depart : 0, +4, +9…" }
};

/** LA QUEUE, apres la derniere keyframe. Un booleen : prolonger (vrai) ou boucler. */
export const QUEUES = {
  prolonger: { label: 'Prolonger la pente', desc: 'On continue la pente du dernier segment, indéfiniment.' },
  boucler: { label: 'Boucler le motif', desc: 'On rejoue tout le motif, décalé — de la variation totale, ou du ratio total.' }
};

// ---------- LE MODELE ----------

/** Une colonne neuve : une stat qui monte de 10 a 40 entre les niveaux 1 et 20. */
export function colonneVide(id = 'stat', nom = 'Stat') {
  return {
    id, nom,
    rythme: { mode: 'regulier', x: 2, cap: 0, niveaux: [] },
    courbe: {
      keyframes: [
        { niveau: 1, valeur: 10, forme: 'lineaire', echelle: 'additive' },
        { niveau: 20, valeur: 40, forme: 'lineaire', echelle: 'additive' }
      ],
      // LE BOOLEEN DE QUEUE : vrai = prolonger la pente, faux = boucler le motif.
      prolonger: true
    },
    plancher: null, plafond: null,
    stockage: 'absolu'
  };
}

/** Un profil neuf. `horizon` = combien de niveaux on developpe. */
export function profilVide(id = 'profil', nom = 'Nouveau profil') {
  return { id, nom, niveauDepart: 1, horizon: 40, colonnes: [colonneVide('hp', 'PV')] };
}

/** Les keyframes d'une colonne, telles qu'elles sont ecrites : le tri est VALIDE, pas force. */
export const keyframes = col => (col.courbe && col.courbe.keyframes) || [];

/** Les niveaux couverts par un profil, du premier au dernier. */
export const premierNiveau = p => Math.round(p.niveauDepart ?? 1);
export const dernierNiveau = p => premierNiveau(p) + Math.max(1, Math.round(p.horizon ?? 40)) - 1;

/** Une colonne entre-t-elle dans la rotation a dette ? */
export const aTaux = col => !!(RYTHMES[col.rythme?.mode] || RYTHMES.regulier).taux;

/** Son poids brut : 1/X. « Toujours » vaut 1 sur 1, comme son nom le dit. */
export function poidsBrut(col) {
  if (!aTaux(col)) return 0;
  if (col.rythme.mode === 'toujours') return 1;
  return 1 / Math.max(1, Math.round(col.rythme.x || 1));
}

/** Les niveaux ecrits a la main, tries et dedoublonnes. */
export const niveauxEcrits = col => [...new Set((col.rythme?.niveaux || []).map(Math.round))].sort((a, b) => a - b);

// ---------- LA COURBE : LA VALEUR EXACTE A UN NIVEAU ----------

const signeDe = v => (v < 0 ? -1 : 1);
const formeDe = kf => (FORMES[kf?.forme] || FORMES.lineaire).f;
const echelleDe = kf => (ECHELLES[kf?.echelle] ? kf.echelle : 'additive');

/** Une echelle proportionnelle est-elle possible entre ces deux valeurs ? */
const multipliable = (a, b) => a !== 0 && b !== 0 && signeDe(a) === signeDe(b);

/**
 * Un segment, interpole selon SA forme et SON echelle. `t` est deja dans [0, 1].
 * Une proportionnelle impossible retombe sur l'additive : la validation le dit, et une
 * courbe a moitie NaN ne montrerait rien a personne.
 */
function entreDeux(a, b, t) {
  const e = formeDe(a)(Math.max(0, Math.min(1, t)));
  if (echelleDe(a) === 'proportionnelle' && multipliable(a.valeur, b.valeur)) {
    return signeDe(a.valeur) * Math.abs(a.valeur) * Math.pow(Math.abs(b.valeur) / Math.abs(a.valeur), e);
  }
  return a.valeur + (b.valeur - a.valeur) * e;
}

/** Dans le motif : le segment qui contient ce niveau. */
function dansLeMotif(ks, niveau) {
  for (let i = 0; i < ks.length - 1; i++) {
    if (niveau <= ks[i + 1].niveau) {
      const L = ks[i + 1].niveau - ks[i].niveau;
      return L <= 0 ? ks[i + 1].valeur : entreDeux(ks[i], ks[i + 1], (niveau - ks[i].niveau) / L);
    }
  }
  return ks[ks.length - 1].valeur;
}

/**
 * L'ECHELLE DE LA QUEUE, c'est celle du DERNIER segment : c'est lui qui rejoint la suite,
 * qu'on prolonge sa pente ou qu'on reparte pour un cycle.
 */
export const echelleQueue = col => {
  const ks = keyframes(col);
  return ks.length >= 2 ? echelleDe(ks[ks.length - 2]) : 'additive';
};

/** Ce qu'un cycle ajoute (additif) ou multiplie (proportionnel), quand la courbe boucle. */
export function decalageDeBoucle(col) {
  const ks = keyframes(col);
  if (ks.length < 2) return { echelle: 'additive', pas: 0 };
  const v0 = ks[0].valeur, vn = ks[ks.length - 1].valeur;
  if (echelleQueue(col) === 'proportionnelle' && multipliable(v0, vn)) {
    return { echelle: 'proportionnelle', pas: Math.abs(vn) / Math.abs(v0) };
  }
  return { echelle: 'additive', pas: vn - v0 };
}

/**
 * LA VALEUR EXACTE de la courbe a un niveau, avant tout arrondi et avant les bornes.
 * Avant la premiere keyframe : la valeur de depart. Apres la derniere : la queue.
 */
export function valeurIdeale(col, niveau) {
  const ks = keyframes(col);
  if (!ks.length) return 0;
  if (ks.length === 1) return ks[0].valeur;
  const premier = ks[0], dernier = ks[ks.length - 1];
  if (niveau <= premier.niveau) return premier.valeur;
  if (niveau <= dernier.niveau) return dansLeMotif(ks, niveau);

  const apres = niveau - dernier.niveau;
  if (col.courbe.prolonger !== false) {
    // PROLONGER : la pente moyenne du dernier segment, continuee indefiniment. On prend
    // la pente moyenne et pas la tangente : un ease-in finit a deux fois sa pente
    // moyenne, et la courbe partirait au plafond des la premiere keyframe passee.
    const a = ks[ks.length - 2], b = dernier;
    const L = Math.max(1, b.niveau - a.niveau);
    if (echelleDe(a) === 'proportionnelle' && multipliable(a.valeur, b.valeur)) {
      const r = Math.pow(Math.abs(b.valeur) / Math.abs(a.valeur), 1 / L);
      return signeDe(b.valeur) * Math.abs(b.valeur) * Math.pow(r, apres);
    }
    return b.valeur + ((b.valeur - a.valeur) / L) * apres;
  }

  // BOUCLER : on rejoue le motif, decale. L'axe des niveaux avance d'une longueur de
  // cycle, les valeurs de ce qu'un cycle entier a fait — d'ou la CONTINUITE a la
  // jonction : la fin du cycle c et le debut du cycle c+1 tombent sur le meme nombre.
  const cycle = dernier.niveau - premier.niveau;
  if (cycle <= 0) return dernier.valeur;
  const c = Math.ceil(apres / cycle);
  const dedans = niveau - c * cycle;
  const brut = dedans <= premier.niveau ? premier.valeur : dansLeMotif(ks, dedans);
  const d = decalageDeBoucle(col);
  return d.echelle === 'proportionnelle' ? brut * Math.pow(d.pas, c) : brut + d.pas * c;
}

/** La meme, ramenee entre le plancher et le plafond de la colonne (s'ils existent). */
export function valeurBornee(col, niveau) {
  let v = valeurIdeale(col, niveau);
  if (col.plancher != null) v = Math.max(col.plancher, v);
  if (col.plafond != null) v = Math.min(col.plafond, v);
  return v;
}

/**
 * LA COURBE ENTIERE, niveau par niveau, telle qu'elle sortira. `pas` est ce que ce
 * niveau-la ajoute par rapport au precedent : c'est l'ardoise qui le rend, a partir de la
 * cible cumulee — jamais un arrondi d'increment.
 */
export function tableColonne(col, depart, fin) {
  const ard = ardoise(1);
  const reels = [], entiers = [], pas = [];
  ard.versEntier(0, valeurBornee(col, depart));
  for (let L = depart; L <= fin; L++) {
    const reel = valeurBornee(col, L);
    pas.push(ard.versEntier(0, reel));
    reels.push(reel);
    entiers.push(Math.round(reel));
  }
  return { reels, entiers, pas };
}

// ---------- DEVELOPPER UN PROFIL ----------

/**
 * LE CALENDRIER, niveau par niveau : qui bouge, et pour quelle valeur.
 *
 * L'ordonnanceur a dette distribue UN tour par niveau entre les colonnes a taux (poids
 * normalises) ; les colonnes a niveaux ecrits prennent le leur en plus, quand il tombe.
 * Une colonne qui ne peut plus rien changer — son cap, sa liste finie, sa courbe plate ou
 * bloquee par une borne — SORT DE LA ROTATION, et les poids sont renormalises sur celles
 * qui restent : les autres accelerent d'autant.
 *
 * ⚠ LE POIDS EST RELATIF, pas une frequence. Normaliser, c'est ce qui garantit un
 * changement par niveau : deux colonnes a 1 sur 4 ne laissent pas trois niveaux vides,
 * elles alternent. Si le designer veut que « 1 sur 4 » veuille dire un niveau sur quatre,
 * il lui faut des poids qui somment a 1 — l'editeur affiche le rythme EFFECTIF a cote du
 * rythme demande, pour que l'ecart se voie au lieu de se deviner.
 *
 * ⚠ Si un niveau ne changeait rien, on FORCE la colonne la plus en retard qui, elle,
 * changerait quelque chose. C'est la contrainte absolue, et c'est le seul endroit qui la
 * tient. Quand plus personne ne peut rien (tout est epuise), la ligne se repete : on ne
 * l'invente pas, `valide()` le signale.
 */
export function developpe(profil) {
  const cols = profil.colonnes || [];
  const depart = premierNiveau(profil), fin = dernierNiveau(profil);
  const n = cols.length;
  const tables = cols.map(c => tableColonne(c, depart, fin));
  const ecrits = cols.map(c => (aTaux(c) ? null : new Set(niveauxEcrits(c))));

  // « Cette colonne peut-elle encore changer a partir de ce niveau ? » — on le lit
  // d'avance sur sa table (suffixes min et max), sinon il faudrait la reparcourir a
  // chaque niveau, pour chaque colonne.
  const suffixe = (t, f, init) => { const a = new Array(t.length); let m = init; for (let i = a.length - 1; i >= 0; i--) { m = f(m, t[i]); a[i] = m; } return a; };
  const sufMin = tables.map(t => suffixe(t.entiers, Math.min, Infinity));
  const sufMax = tables.map(t => suffixe(t.entiers, Math.max, -Infinity));

  const val = cols.map((c, i) => tables[i].entiers[0]);
  const tours = cols.map(() => []);
  const sortie = cols.map(() => false);
  const sortieAu = cols.map(() => null);
  const lignes = [{ niveau: depart, valeurs: val.slice(), bougent: [], forces: [] }];

  const ard = ardoise(n);
  let poids = new Array(n).fill(0);
  const rebat = () => {
    const bruts = cols.map((c, i) => (sortie[i] ? 0 : poidsBrut(c)));
    const somme = bruts.reduce((a, b) => a + b, 0);
    poids = somme > 0 ? bruts.map(w => w / somme) : bruts;
  };
  rebat();
  ard.avance(poids.map(w => 0.5 * w));   // LA PHASE : elle centre le depart

  /** Peut-elle encore changer a partir de l'indice k de sa table ? */
  const changeraEncore = (i, k) => k < sufMin[i].length && (sufMin[i][k] < val[i] || sufMax[i][k] > val[i]);
  /** Sa liste lui laisse-t-elle encore un niveau ? */
  const resteEcrit = (i, L) => !!ecrits[i] && [...ecrits[i]].some(x => x >= L);
  /** Son cap est-il atteint ? 0 = pas de cap. */
  const capAtteint = i => {
    const cap = Math.round(cols[i].rythme?.cap || 0);
    return cap > 0 && tours[i].length >= cap;
  };

  for (let L = depart + 1; L <= fin; L++) {
    const k = L - depart;
    const bougent = [], forces = [];
    const prend = i => { if (!bougent.includes(i)) { bougent.push(i); tours[i].push(L); } };

    // 1. Les niveaux ecrits a la main : ils ne se negocient pas.
    cols.forEach((c, i) => { if (!sortie[i] && ecrits[i] && ecrits[i].has(L) && !capAtteint(i)) prend(i); });

    // 2. Le tour du niveau va a la colonne a taux la plus creanciere.
    ard.avance(poids);
    const gagnante = ard.creanciere(i => !sortie[i] && aTaux(cols[i]) && !capAtteint(i));
    if (gagnante >= 0) { ard.rend(gagnante); prend(gagnante); }

    // 3. LA CONTRAINTE ABSOLUE. Si rien ne changerait, la plus en retard qui, elle,
    //    changerait quelque chose prend un tour de plus. Une colonne a niveaux ecrits
    //    n'est jamais forcee : ses niveaux sont un choix, pas une frequence.
    if (!bougent.some(i => tables[i].entiers[k] !== val[i])) {
      const secours = ard.creanciere(i => !sortie[i] && aTaux(cols[i]) && !capAtteint(i) && tables[i].entiers[k] !== val[i]);
      if (secours >= 0) { ard.rend(secours); prend(secours); forces.push(secours); }
    }

    for (const i of bougent) val[i] = tables[i].entiers[k];
    lignes.push({ niveau: L, valeurs: val.slice(), bougent, forces });

    // 4. Qui sort de la rotation ? On renormalise des que la liste change. ⚠ Rien ne
    //    sort au DERNIER niveau : il n'y a plus rien apres, tout le monde y paraitrait
    //    epuise et la validation crierait sur un profil parfaitement sain.
    let change = false;
    if (L < fin) cols.forEach((c, i) => {
      if (sortie[i]) return;
      const fini = capAtteint(i) || (aTaux(c) ? !changeraEncore(i, k + 1) : !resteEcrit(i, L + 1));
      if (fini) { sortie[i] = true; sortieAu[i] = L; change = true; }
    });
    if (change) rebat();
  }

  return { depart, fin, colonnes: cols, lignes, tours, tables, sortie, sortieAu };
}

/** La valeur telle qu'on la RANGE : absolue, ou l'ecart depuis le depart de la colonne. */
export function valeurRangee(col, valeur, depart) {
  return col.stockage === 'modificateur' ? valeur - depart : valeur;
}

/**
 * LE RYTHME EFFECTIF d'une colonne : un tour tous les combien, vraiment. C'est ce qui
 * rend la normalisation visible au lieu de la laisser surprendre.
 */
export function rythmeEffectif(dev, i) {
  const t = dev.tours[i] || [];
  if (t.length < 1) return null;
  return (dev.fin - dev.depart) / t.length;
}

// ---------- LES SEGMENTS, ET CE QU'ILS COUTENT EN TOURS ----------

/**
 * Les segments d'une colonne, avec les TOURS qui tombent dedans — c'est ce couple que la
 * validation juge. ⚠ K est un nombre de TOURS, pas de niveaux : 40 niveaux a 1 sur 8 font
 * 5 tours, et c'est 5 qu'il faut comparer a l'ecart de valeur.
 */
export function segments(col, toursDeLaColonne) {
  const ks = keyframes(col);
  const out = [];
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i], b = ks[i + 1];
    out.push({
      i, a, b,
      delta: b.valeur - a.valeur,
      tours: (toursDeLaColonne || []).filter(L => L > a.niveau && L <= b.niveau)
    });
  }
  return out;
}

/**
 * LES SEGMENTS QUI PROMETTENT DES TOURS PLATS : K tours pour moins de K points d'ecart,
 * donc des tours qui rendront la valeur precedente. ⚠ C'est ici, et nulle part ailleurs,
 * que la regle est ecrite : la validation la lit pour crier, l'apercu la lit pour
 * surligner. Deux copies divergeraient, et l'editeur surlignerait un segment que le
 * bandeau ne signale pas.
 */
export function segmentsPlats(col, toursDeLaColonne) {
  return segments(col, toursDeLaColonne).filter(s => s.tours.length && Math.abs(s.delta) < s.tours.length);
}

// ---------- LA VALIDATION ----------

const nomDe = col => col.nom || col.id || 'colonne';

/**
 * Les memes regles pour l'editeur (le bandeau « À vérifier ») et pour le banc de test.
 * Rend une liste de { bad, msg, col } : `bad` = le profil ne fera pas ce qu'il annonce.
 * Un message doit toujours nommer les LEVIERS : un avertissement qui ne dit pas quoi
 * changer se lit une fois puis s'ignore.
 */
export function valide(profil, dev = developpe(profil)) {
  const out = [];
  const bad = (msg, col) => out.push({ bad: true, msg, col });
  const mou = (msg, col) => out.push({ bad: false, msg, col });
  const cols = profil.colonnes || [];
  if (!cols.length) { bad('Ce profil n’a aucune colonne : il n’y a rien à développer.'); return out; }

  cols.forEach((c, idx) => {
    const ks = keyframes(c);
    if (ks.length < 2) { bad(`${nomDe(c)} : il faut au moins deux keyframes pour faire une courbe.`, c.id); return; }

    // Keyframes non triees ou niveaux dupliques : l'ordre des niveaux EST la courbe.
    for (let i = 0; i < ks.length - 1; i++) {
      if (ks[i + 1].niveau === ks[i].niveau) bad(`${nomDe(c)} : deux keyframes au niveau ${ks[i].niveau} — laquelle vaut ?`, c.id);
      else if (ks[i + 1].niveau < ks[i].niveau) bad(`${nomDe(c)} : keyframes non triées (niveau ${ks[i].niveau} puis ${ks[i + 1].niveau}) — l’ordre des niveaux fait la courbe.`, c.id);
    }

    // L'echelle proportionnelle multiplie : elle ne traverse ni le 0 ni le signe.
    for (let i = 0; i < ks.length - 1; i++) {
      if (echelleDe(ks[i]) !== 'proportionnelle') continue;
      const a = ks[i].valeur, b = ks[i + 1].valeur;
      if (a === 0 || b === 0) bad(`${nomDe(c)}, segment niveaux ${ks[i].niveau}→${ks[i + 1].niveau} : échelle proportionnelle avec une keyframe à 0 — multiplier ne part jamais de zéro. Passe ce segment en additif.`, c.id);
      else if (signeDe(a) !== signeDe(b)) bad(`${nomDe(c)}, segment niveaux ${ks[i].niveau}→${ks[i + 1].niveau} : échelle proportionnelle de ${a} à ${b} — un facteur ne change pas de signe. Passe ce segment en additif.`, c.id);
    }

    // LA REGLE DES TOURS PLATS : K tours pour |Δ| points, il en faut au moins autant.
    for (const s of segmentsPlats(c, dev.tours[idx])) {
      const K = s.tours.length, d = Math.abs(s.delta);
      const sens = s.delta < 0 ? -1 : 1;
      const large = `${s.a.valeur}→${s.a.valeur + sens * K}`;
      const rythme = c.rythme?.mode === 'regulier'
        ? `espace le rythme (1 sur ${Math.ceil(Math.max(1, Math.round(c.rythme.x || 1)) * K / Math.max(1, d))})`
        : 'espace le rythme';
      bad(`${nomDe(c)}, segment niveaux ${s.a.niveau}→${s.b.niveau} : ${K} tours pour ${d} point${d > 1 ? 's' : ''} d’écart. `
        + `${K - d} tours seront plats. Élargis la plage (${large}), ${rythme}, ou rallonge le segment.`, c.id);
    }

    // Une borne atteinte avant la derniere keyframe : la fin de la courbe ne dit plus rien.
    const dernier = ks[ks.length - 1].niveau;
    for (const [borne, mot, hors] of [[c.plancher, 'plancher', (v, b) => v < b], [c.plafond, 'plafond', (v, b) => v > b]]) {
      if (borne == null) continue;
      for (let L = dev.depart; L <= Math.min(dernier, dev.fin); L++) {
        if (!hors(valeurIdeale(c, L), borne)) continue;
        mou(`${nomDe(c)} : ${mot} ${borne} atteint au niveau ${L}, avant la dernière keyframe (niveau ${dernier}) — tout ce qui suit est rogné.`, c.id);
        break;
      }
    }

    if (!aTaux(c) && !niveauxEcrits(c).length) bad(`${nomDe(c)} : aucun niveau écrit — cette colonne ne bougera jamais.`, c.id);
    if (c.rythme?.mode === 'regulier' && Math.round(c.rythme.x || 0) < 1) bad(`${nomDe(c)} : « 1 sur ${c.rythme.x} » n’a pas de sens — il faut au moins 1.`, c.id);
  });

  // Toutes epuisees avant la fin : les derniers niveaux se repeteraient.
  if (dev.sortie.length && dev.sortie.every(Boolean)) {
    const derniere = Math.max(...dev.sortieAu.map(L => L ?? dev.fin));
    bad(`Toutes les colonnes sont épuisées au niveau ${derniere}, alors que l’horizon va jusqu’à ${dev.fin} : `
      + `les ${dev.fin - derniere} derniers niveaux ne changent plus rien. Rallonge une courbe, ou raccourcis l’horizon.`);
  }

  // LE FILET : une ligne identique a la precedente, quoi qu'il arrive. Une seule fois —
  // la cause est toujours plus haut dans la liste, et vingt lignes de plus la noieraient.
  for (let i = 1; i < dev.lignes.length; i++) {
    const a = dev.lignes[i - 1].valeurs, b = dev.lignes[i].valeurs;
    if (a.every((v, j) => v === b[j])) {
      bad(`Niveau ${dev.lignes[i].niveau} : ligne identique à la précédente — ce niveau ne se sentira pas.`);
      break;
    }
  }
  return out;
}

// ---------- LES SORTIES ----------

/**
 * TSV, a coller dans une feuille de calcul : une ligne d'en-tete, puis une ligne par
 * niveau. Plusieurs profils se suivent dans le meme tableau, d'ou la colonne `id`.
 * ⚠ Une colonne qu'un profil n'utilise pas reste VIDE, pas a zero : zero est une valeur,
 * le vide dit « pas concerne », et une formule de feuille ne les lit pas pareil.
 */
export function versTSV(profils) {
  const liste = Array.isArray(profils) ? profils : [profils];
  const ids = [...new Set(liste.flatMap(p => (p.colonnes || []).map(c => c.id)))];
  const lignes = [['id', 'level', ...ids].join('\t')];
  for (const p of liste) {
    const dev = developpe(p);
    const base = (p.colonnes || []).map((c, i) => dev.lignes[0].valeurs[i]);
    for (const l of dev.lignes) {
      lignes.push([p.id, l.niveau, ...ids.map(id => {
        const i = (p.colonnes || []).findIndex(c => c.id === id);
        return i < 0 ? '' : String(valeurRangee(p.colonnes[i], l.valeurs[i], base[i]));
      })].join('\t'));
    }
  }
  return lignes.join('\n') + '\n';
}

/**
 * Le JSON du profil pour le moteur : les keyframes et les rythmes, JAMAIS les valeurs
 * developpees. Le moteur a ce fichier et ce module, il recalcule a la volee — une table
 * de 40 niveaux figee dans les donnees serait fausse le jour ou on touche une keyframe,
 * et fausse sans le dire.
 */
export function versJSON(profils) {
  const liste = Array.isArray(profils) ? profils : [profils];
  return JSON.stringify({ version: 1, profils: liste }, null, 2) + '\n';
}

/** Relire ce JSON, en comblant ce qui manque : un fichier plus vieux reste lisible. */
export function depuisJSON(texte) {
  const brut = JSON.parse(texte);
  const liste = Array.isArray(brut) ? brut : (brut.profils || [brut]);
  const modele = colonneVide();
  return liste.map(p => ({
    ...profilVide(p.id || 'profil', p.nom || p.id || 'Profil'),
    ...p,
    colonnes: (p.colonnes || []).map(c => ({
      ...colonneVide(c.id, c.nom), ...c,
      rythme: { ...modele.rythme, ...(c.rythme || {}) },
      courbe: { ...modele.courbe, ...(c.courbe || {}) }
    }))
  }));
}

// ---------- DE QUOI L'ECRIRE EN CLAIR ----------

/** « 1 sur 3, 8 tours au plus » — ce que le rythme dit, en francais. */
export function resumeRythme(col) {
  const m = col.rythme?.mode || 'regulier';
  const cap = Math.round(col.rythme?.cap || 0);
  const suite = cap > 0 ? `, ${cap} tour${cap > 1 ? 's' : ''} au plus` : '';
  if (m === 'liste') return `niveaux ${niveauxEcrits(col).join(', ') || '—'}`;
  if (m === 'toujours') return `à chaque niveau${suite}`;
  return `1 sur ${Math.max(1, Math.round(col.rythme?.x || 1))}${suite}`;
}

/** « 10 → 40, linéaire additif, prolongée » — ce que la courbe dit. */
export function resumeCourbe(col) {
  const ks = keyframes(col);
  if (ks.length < 2) return 'courbe incomplète';
  const formes = [...new Set(ks.slice(0, -1).map(k => (FORMES[k.forme] || FORMES.lineaire).label.split(' ')[0].toLowerCase()))];
  const ech = [...new Set(ks.slice(0, -1).map(k => (echelleDe(k) === 'proportionnelle' ? 'proportionnel' : 'additif')))];
  const d = decalageDeBoucle(col);
  const queue = col.courbe.prolonger !== false ? 'prolongée'
    : `bouclée (${d.echelle === 'proportionnelle' ? `×${+d.pas.toFixed(2)}` : `${d.pas >= 0 ? '+' : ''}${d.pas}`} par cycle)`;
  return `${ks[0].valeur} → ${ks[ks.length - 1].valeur}, ${formes.join('/')} ${ech.join('/')}, ${queue}`;
}
