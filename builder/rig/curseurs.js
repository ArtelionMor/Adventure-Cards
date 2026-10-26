// Les curseurs (input type=range) de l'Atelier : logarithmiques et CRANTES. Un curseur marque `data-log` garde son
// `.value` en valeur reelle (le code qui le lit ne change pas), mais la course est une liste de crans espaces en
// logarithme (1, 1.5, 2, 3, 5, 7, 10, 15… ; 0 en premier si le minimum est 0), avec des reperes (datalist).
const MANTISSES = [1, 1.5, 2, 3, 5, 7];

export function crans(min, max) {
  const v = new Set([min, max]);
  if (min <= 0) v.add(0);
  for (let e = -2; e <= 6; e++) for (const m of MANTISSES) {
    let x = m * 10 ** e;
    if (max >= 10) x = Math.round(x);
    if (x > Math.max(min, 0) && x < max) v.add(x);
  }
  return [...v].sort((a, b) => a - b);
}

let n = 0;
export function curseurLog(el) {
  if (el.dataset.logFait) return;
  el.dataset.logFait = '1';
  const natif = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');   // (pas au chargement : les tests tournent sous Node)
  const min = +el.min, max = +el.max, depart = +natif.get.call(el);
  const liste = crans(min, max);
  const plusProche = x => liste.reduce((b, c, i) => Math.abs(c - x) < Math.abs(liste[b] - x) ? i : b, 0);
  el.min = 0; el.max = liste.length - 1; el.step = 1;
  Object.defineProperty(el, 'value', {
    get() { return String(liste[+natif.get.call(el)] ?? liste[0]); },
    set(v) { natif.set.call(el, String(plusProche(+v))); },
  });
  const dl = document.createElement('datalist');
  dl.id = 'crans' + (++n);
  dl.innerHTML = liste.map((_, i) => `<option value="${i}"></option>`).join('');
  el.after(dl); el.setAttribute('list', dl.id);
  el.value = depart;
}

// Tous les curseurs `data-log` d'une zone (ceux qu'on n'a pas encore traites).
export function curseursLog(racine = document) {
  racine.querySelectorAll('input[type=range][data-log]').forEach(curseurLog);
}
