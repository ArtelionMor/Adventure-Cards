// L'ecriture des JSON du rig, lisibles et stables (les memes regles que l'Atelier :
// builder/rig/json.js — les deux doivent rendre le meme texte).
//   - un tableau de nombres ou de chaines tient sur une ligne (les sommets d'un mesh) ;
//   - un petit objet de valeurs simples aussi (une cle : { "t": 0.5, "v": 2 }) ;
//   - le reste s'indente de deux espaces.
// Le fichier garde ses fins de ligne s'il existe (cf. CLAUDE.md racine : CRLF ou LF, fichier
// par fichier).

import fs from 'node:fs';
import { formateJson } from '../../builder/rig/json.js';

export function ecrisJson(chemin, objet) {
  let texte = formateJson(objet) + '\n';
  if (fs.existsSync(chemin) && fs.readFileSync(chemin, 'utf8').includes('\r\n')) texte = texte.replace(/\n/g, '\r\n');
  fs.writeFileSync(chemin, texte, 'utf8');
}
