// La mise en forme des JSON du rig (rig.json, clips.json), partagee par l'Atelier et les
// scripts : un fichier reecrit par l'un ou l'autre ne change pas d'allure, et git ne
// montre que ce qui a vraiment change.

const simple = v => v === null || typeof v !== 'object';

export function formateJson(v, retrait = '') {
  if (simple(v)) return JSON.stringify(v);
  const dedans = retrait + '  ';
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (v.every(simple)) return '[' + v.map(x => JSON.stringify(x)).join(', ') + ']';
    return '[\n' + v.map(x => dedans + formateJson(x, dedans)).join(',\n') + '\n' + retrait + ']';
  }
  const cles = Object.keys(v).filter(k => v[k] !== undefined);
  if (!cles.length) return '{}';
  const court = cles.every(k => simple(v[k]) || (Array.isArray(v[k]) && v[k].length <= 4 && v[k].every(simple)));
  if (court) {
    const ligne = '{ ' + cles.map(k => JSON.stringify(k) + ': ' + formateJson(v[k])).join(', ') + ' }';
    if (ligne.length <= 100) return ligne;
  }
  return '{\n' + cles.map(k => dedans + JSON.stringify(k) + ': ' + formateJson(v[k], dedans)).join(',\n') + '\n' + retrait + '}';
}
