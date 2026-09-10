// MESURER LE BROUILLON DU BUILDER, SANS TOUCHER AUX SCRIPTS.
//
// Tous les outils (simulate, matchups, check-decks, analyse-cartes) importent les
// cartes de game/data/characters.data.js, directement ou via game/src/config/. Pour
// qu'ils mesurent le brouillon envoye par la page « Lancer un calcul » plutot que le
// fichier applique au jeu, on ne modifie aucun d'eux : ce crochet de chargement
// redirige CE fichier-la vers celui que le serveur a ecrit a cote.
//
//   node --import ./scripts/lib/brouillon.mjs scripts/simulate.mjs
//   (avec ADVENTURE_BROUILLON=/chemin/du/brouillon.mjs dans l'environnement)
//
// Sans la variable, il ne fait rien. `--import` est rejoue dans chaque worker (ils
// heritent des options de Node), donc les outils qui parallelisent sur les coeurs
// mesurent le meme brouillon partout.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const fichier = process.env.ADVENTURE_BROUILLON;

if (fichier) {
  const cible = pathToFileURL(fichier).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const r = nextResolve(specifier, context);
      return r.url.split('?')[0].endsWith('/game/data/characters.data.js')
        ? { url: cible, format: 'module', shortCircuit: true }
        : r;
    }
  });
}
