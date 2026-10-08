// Synchronise la game config avec la Google Sheet « Config Adventure-Cards » (l'outil du « patch »).
//
//   node scripts/sync-feuille.mjs            lit la feuille, ECRIT game/data/feuille.data.js, dit ce qui a change
//   node scripts/sync-feuille.mjs --apercu   lit la feuille et dit ce qui changerait, sans rien ecrire
//
// A lancer SUR LE PI (la cle du compte de service y est, voir scripts/lib/feuille.mjs). Tout ce qui
// commence par « ~ » dans la feuille (onglet, colonne, ligne) n'est pas exporte.
import { apercu, synchronise, FICHIER } from './lib/feuille.mjs';

const seulementApercu = process.argv.includes('--apercu');

function ecrit(a) {
  const change = a.plan.filter(p => p.etat === 'change');
  const invalides = a.plan.filter(p => p.etat === 'invalide');
  const inconnus = a.plan.filter(p => p.etat === 'inconnu');
  console.log(`Onglets exportes : ${a.onglets.join(', ') || '(aucun)'}`);
  if (a.ignores.length) console.log(`Onglets ignores (~) : ${a.ignores.join(', ')}`);
  if (a.sansEffet.length) console.log(`Exportes mais sans effet dans le jeu (rien ne les lit encore) : ${a.sansEffet.join(', ')}`);
  console.log(`\n${a.plan.length} ligne(s) dans « animations » : ${change.length} change(nt), ${a.plan.length - change.length - invalides.length - inconnus.length} identique(s)`);
  for (const p of change) console.log(`  ~ ${p.id.padEnd(20)} ${JSON.stringify(p.avant)} -> ${JSON.stringify(p.apres)}${p.nom ? '   (' + p.nom + ')' : ''}`);
  for (const p of invalides) console.log(`  ! ${p.id.padEnd(20)} IGNOREE : ${p.raison} (valeur lue : ${JSON.stringify(p.apres)})`);
  for (const p of inconnus) console.log(`  ? ${p.id.padEnd(20)} IGNOREE : ${p.raison}`);
  for (const id of a.retires) console.log(`  - ${id.padEnd(20)} n'est plus dans la feuille : retombe sur la valeur de balance.js`);
}

try {
  const a = seulementApercu ? await apercu() : await synchronise();
  ecrit(a);
  console.log(seulementApercu ? '\n(apercu : rien n\'a ete ecrit)' : `\nEcrit : ${FICHIER}`);
} catch (e) {
  console.error('Echec : ' + e.message);
  process.exit(1);
}
