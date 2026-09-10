// LA PROGRESSION D'UN CALCUL — pour un terminal, ou pour le serveur.
//
// En terminal : une ligne « 12/351 cases… » reecrite sur place.
// Lance par le serveur (page « Lancer un calcul ») : la variable ADVENTURE_PROGRESSION
// est posee, et on ecrit a la place une ligne-marqueur « @@progression 12/351 », que le
// serveur retire de la sortie et garde en chiffres (barre, pourcentage, notification).
// Hors des deux (sortie redirigee dans un fichier) : rien, pour ne pas polluer.
const serveur = !!process.env.ADVENTURE_PROGRESSION;
let affichee = false;

export function progression(fait, total, unite = '') {
  if (serveur) { process.stdout.write(`@@progression ${fait}/${total}\n`); return; }
  if (!process.stdout.isTTY) return;
  process.stdout.write(`\r  ${fait}/${total} ${unite}…   `);
  affichee = true;
}

/** Efface la ligne de progression du terminal, avant d'y ecrire autre chose. */
export function finProgression() {
  if (!affichee) return;
  process.stdout.write('\r' + ' '.repeat(48) + '\r');
  affichee = false;
}
