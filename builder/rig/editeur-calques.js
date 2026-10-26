// LE MODE ✂ CALQUES de l'Atelier Rig & Anim (builder/rig.html) : decouper l'image en calques
// (lasso polygonal ou libre, lissage, accroche au trait, « inclure le trait »), gomme et
// pinceau de restauration, le panneau des calques et celui des zones a combler.
//
// Toutes les operations sur les pixels et le JSON sont dans ./calques.js (les memes que
// scripts/rig-decoupe.mjs) ; ce module ne fait que l'interface. La page lui donne `api` :
//   E (l'etat), toast, modifie(f) (une photo pour annuler, puis f ; f rend les ids des calques
//   dont l'image a change), debutTrait(id) (photo avant un coup de pinceau), finTrait(id),
//   rafraichitRect(id, rect), versEcran, versMonde, reprepare, marque.

import {
  accroche, lisse, masquePolygone, inclutTrait, extraitCalque, combleZone, gomme, restaure,
  nomDeCalqueLibre, renommeCalque, dupliqueCalque, fusionneVersLeBas, supprimeCalque, reordonne,
  calqueDessous, reimporteZone, rectExport, recadre, masqueEnImage, mailleCalque, recalculePoids, transfereVers,
} from './calques.js';

export function installeCalques(api) {
  const { E, toast } = api;
  const $ = s => document.querySelector(s);
  const T = { outil: 'poly', pts: [], ferme: false, trace: null, curseur: null };
  const opt = () => ({
    lissage: +$('#cLissage').value, contour: $('#cContour').checked, rayonContour: +$('#cRayonContour').value,
    trait: +$('#cTrait').value, rayon: +$('#cRayon').value, durete: +$('#cDurete').value / 100, force: +$('#cForce').value / 100,
  });

  // ---------------------------------------------------------------- le panneau
  const sec = document.createElement('section');
  sec.id = 'secCalques';
  sec.innerHTML = `
    <h2>Calques</h2>
    <div class="ligne" id="cOutils">
      <button data-outil="poly" class="on" title="Lasso polygonal : un clic par sommet ; double-clic, Entrée ou clic sur le premier point pour fermer ; Retour arrière efface le dernier">⬠ Polygone</button>
      <button data-outil="libre" title="Lasso libre : glisser autour de la partie">〰 Libre</button>
      <button data-outil="gomme" title="Gomme : efface le calque sélectionné">🧽 Gomme</button>
      <button data-outil="restaure" title="Pinceau de restauration : ramène les pixels de l'image d'origine sur le calque sélectionné">🖌 Restaurer</button>
    </div>
    <div class="ligne" data-pour="lasso"><label>lissage</label><input type="number" id="cLissage" value="1" min="0" max="5" />
      <label title="Chaque point posé s'accroche au trait noir le plus proche"><input type="checkbox" id="cContour" checked /> suivre le contour</label>
      <input type="number" id="cRayonContour" value="8" min="2" max="40" title="rayon d'accroche (px)" /></div>
    <div class="ligne" data-pour="lasso"><label title="La sélection s'étend sur le trait noir qui la borde : l'objet emporte tout son contour">inclure le trait</label><input type="number" id="cTrait" value="0" min="0" max="30" /><span class="muet">px</span></div>
    <div class="ligne" data-pour="lasso"><label>nouveau calque</label><input id="cNom" placeholder="nom" style="width:110px" />
      <select id="cOs" title="Rigide sur un os, ou maillé"></select>
      <button id="cExtraire" class="principal" disabled>Extraire en calque</button>
      <button id="cTransfere" disabled title="Tout ce que la boucle couvre sur les autres calques passe sur le calque sélectionné">↪ Transférer vers le calque</button></div>
    <div class="ligne" data-pour="pinceau" hidden><label>rayon</label><input type="number" id="cRayon" value="16" min="1" max="300" />
      <label>dureté</label><input type="number" id="cDurete" value="60" min="0" max="100" /><label>force</label><input type="number" id="cForce" value="100" min="1" max="100" /><span class="muet">%</span></div>
    <ul id="cListe" class="liste-calques"></ul>
    <div class="ligne"><button id="cDup">Dupliquer</button><button id="cFus">Fusionner vers le bas</button><button id="cSup">Supprimer</button><button id="cMaille">Mailler</button></div>
    <div id="cZones"></div>`;
  const avant = document.querySelector('aside section:nth-of-type(2)');
  avant.parentNode.insertBefore(sec, avant);
  const style = document.createElement('style');
  style.textContent = `
    .liste-calques { list-style: none; padding: 0; margin: 6px 0; }
    .liste-calques li { display: flex; align-items: center; gap: 4px; padding: 3px 4px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
    .liste-calques li:hover { background: var(--bg-3); }
    .liste-calques li.sel { background: #24325a; }
    .liste-calques li.dessus { border-top-color: var(--accent); }
    .liste-calques li .nom { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .liste-calques li button, .liste-calques li select { padding: 1px 5px; font-size: 12px; }
    .liste-calques li input[type=range] { width: 52px; }
    .zone { font-size: 12px; background: var(--bg-3); border-radius: 6px; padding: 5px 6px; margin: 4px 0; }
    .zone .etat-a-combler { color: var(--warn); } .zone .etat-provisoire { color: #f0d060; } .zone .etat-comblee { color: var(--accent-2); }
    .zone button { padding: 1px 6px; font-size: 12px; margin: 2px 2px 0 0; }`;
  document.head.appendChild(style);

  sec.querySelectorAll('[data-outil]').forEach(b => b.onclick = () => {
    T.outil = b.dataset.outil; T.pts = []; T.ferme = false;
    sec.querySelectorAll('[data-outil]').forEach(x => x.classList.toggle('on', x === b));
    const pinceau = T.outil === 'gomme' || T.outil === 'restaure';
    sec.querySelectorAll('[data-pour=lasso]').forEach(x => x.hidden = pinceau);
    sec.querySelectorAll('[data-pour=pinceau]').forEach(x => x.hidden = !pinceau);
    majBoutons();
  });

  const calque = () => E.rig?.calques.find(c => c.id === E.calque) || null;
  const verrouille = c => { if (c?.verrou) { toast('« ' + c.id + ' » est verrouillé'); return true; } return false; };

  function majBoutons() {
    $('#cExtraire').disabled = !(T.ferme && calque());
    $('#cTransfere').disabled = !(T.ferme && calque());
    const c = calque();
    $('#cFus').disabled = !c || !calqueDessous(E.rig, c.id);
    for (const id of ['#cDup', '#cSup', '#cMaille']) $(id).disabled = !c;
  }

  function dessineListe() {
    const ul = $('#cListe');
    if (!E.rig) { ul.innerHTML = ''; return; }
    if (!E.calque || !E.rig.calques.some(c => c.id === E.calque)) E.calque = E.rig.calques.slice().sort((a, b) => (b.ordre || 0) - (a.ordre || 0))[0]?.id || null;
    const os = E.rig.os.map(o => o.id);
    ul.innerHTML = '';
    for (const c of E.rig.calques.slice().sort((a, b) => (b.ordre || 0) - (a.ordre || 0))) {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.id = c.id;
      li.classList.toggle('sel', c.id === E.calque);
      const zones = (c.zones || []).filter(z => z.etat !== 'comblee').length;
      li.innerHTML = `<button data-a="vis" title="Visible">${c.visible === false ? '◌' : '👁'}</button><button data-a="verrou" title="Verrou">${c.verrou ? '🔒' : '🔓'}</button>
        <span class="nom" title="Double-clic : renommer">${c.id}${zones ? ` <span style="color:var(--warn)">◐${zones}</span>` : ''}</span>
        <select data-a="os" title="Rigide sur un os, ou maillé"><option value="">maillé</option>${os.map(o => `<option ${c.os === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
        <input type="range" data-a="op" min="0" max="100" value="${Math.round((E.opacites[c.id] ?? 1) * 100)}" title="Opacité d'aperçu (pas enregistrée)" />`;
      // (on ne redessine que si la selection change : sinon le double-clic du renommage tomberait dans le vide)
      li.onclick = e => { if (e.target.closest('button, select, input') || E.calque === c.id) return; E.calque = c.id; dessineListe(); dessineZones(); majBoutons(); api.marque(); };
      li.querySelector('.nom').ondblclick = () => {
        const champ = document.createElement('input'); champ.value = c.id; champ.style.width = '100px';
        li.querySelector('.nom').replaceWith(champ); champ.focus(); champ.select();
        const fin = () => {
          const nv = champ.value.trim().replace(/\s+/g, '_');
          if (nv && nv !== c.id) {
            try { api.modifie(r => renommeCalque(r, E.px, E.masques, c.id, nv)); if (E.calque === c.id) E.calque = nv; if (c.id in E.opacites) { E.opacites[nv] = E.opacites[c.id]; } }
            catch (er) { toast(er.message); }
          }
          dessineListe(); dessineZones();
        };
        champ.onblur = fin; champ.onkeydown = e => { if (e.key === 'Enter') champ.blur(); if (e.key === 'Escape') { champ.value = c.id; champ.blur(); } };
      };
      li.querySelector('[data-a=vis]').onclick = () => { api.modifie(r => { const k = r.calques.find(q => q.id === c.id); if (k.visible === false) delete k.visible; else k.visible = false; }); dessineListe(); };
      li.querySelector('[data-a=verrou]').onclick = () => { api.modifie(r => { const k = r.calques.find(q => q.id === c.id); if (k.verrou) delete k.verrou; else k.verrou = true; }); dessineListe(); };
      li.querySelector('[data-a=os]').onchange = e => {
        const v = e.target.value;
        api.modifie(r => {
          const k = r.calques.find(q => q.id === c.id);
          if (v) { k.os = v; delete k.mesh; } else { delete k.os; mailleCalque(r, E.px, k.id); }
          recalculePoids(r);
        });
        dessineListe();
      };
      li.querySelector('[data-a=op]').oninput = e => { E.opacites[c.id] = +e.target.value / 100; };
      // glisser-deposer : l'ordre de dessin
      li.ondragstart = e => { e.dataTransfer.setData('text/plain', c.id); };
      li.ondragover = e => { e.preventDefault(); li.classList.add('dessus'); };
      li.ondragleave = () => li.classList.remove('dessus');
      li.ondrop = e => {
        e.preventDefault(); li.classList.remove('dessus');
        const id = e.dataTransfer.getData('text/plain');
        if (!id || id === c.id) return;
        // la liste est du dessus vers le fond : deposer SUR un calque = passer juste au-dessus de lui
        const haut = E.rig.calques.slice().sort((a, b) => (b.ordre || 0) - (a.ordre || 0)).map(k => k.id).filter(k => k !== id);
        haut.splice(haut.indexOf(c.id), 0, id);
        api.modifie(r => reordonne(r, haut.slice().reverse()));
        dessineListe();
      };
      ul.appendChild(li);
    }
    const sel = $('#cOs');
    const avant = sel.value;
    sel.innerHTML = `<option value="">maillé</option>${os.map(o => `<option>${o}</option>`).join('')}`;
    sel.value = avant;
    majBoutons();
  }

  $('#cDup').onclick = () => { const c = calque(); if (!c) return; let n; api.modifie(r => { const ids = dupliqueCalque(r, E.px, c.id); n = ids[0]; return ids; }); E.calque = n; dessineListe(); };
  $('#cFus').onclick = () => {
    const c = calque(); if (!c || verrouille(c)) return;
    const b = calqueDessous(E.rig, c.id);
    if (!confirm(`Fusionner « ${c.id} » dans « ${b.id} » ?`)) return;
    api.modifie(r => fusionneVersLeBas(r, E.px, E.masques, c.id)); E.calque = b.id; dessineListe(); dessineZones();
  };
  $('#cSup').onclick = () => {
    const c = calque(); if (!c) return;
    if (E.rig.calques.length < 2) { toast('il faut garder un calque'); return; }
    if (!confirm(`Supprimer le calque « ${c.id} » ? (Ctrl+Z pour revenir)`)) return;
    api.modifie(r => supprimeCalque(r, E.px, E.masques, c.id)); E.calque = null; dessineListe(); dessineZones();
  };
  $('#cMaille').onclick = () => { const c = calque(); if (!c) return; api.modifie(r => { mailleCalque(r, E.px, c.id); recalculePoids(r); }); toast('« ' + c.id + ' » maillé'); };

  // ---------------------------------------------------------------- les zones a combler
  const ETATS = { 'a-combler': 'à combler', provisoire: 'comblée provisoirement', comblee: 'comblée' };
  function dessineZones() {
    const div = $('#cZones');
    const c = calque();
    if (!c || !(c.zones || []).length) { div.innerHTML = c ? '<div class="muet">Aucune zone à combler sur ce calque.</div>' : ''; return; }
    div.innerHTML = '<div class="muet" style="margin-top:6px">Zones à combler de « ' + c.id + ' » (les trous laissés par une extraction) :</div>' + c.zones.map(z => `
      <div class="zone" data-z="${z.id}"><b>${z.id}</b> · <span class="etat-${z.etat || 'a-combler'}">${ETATS[z.etat || 'a-combler']}</span> · ${z.largeur} × ${z.hauteur} px${z.par ? ` · laissée par « ${z.par} »` : ''}<br>
        <button data-a="exp" title="Télécharger le calque et le masque (blanc = à combler) pour un outil d'inpainting">⬇ Exporter</button>
        <button data-a="imp" title="Réimporter le calque complété (le fichier exporté, rempli)">⬆ Réimporter</button>
        <button data-a="prov" title="Remplir avec les couleurs voisines, sans IA (provisoire)">Combler (provisoire)</button>
        <input type="number" data-a="dist" value="32" min="4" max="400" style="width:56px" title="distance (px) jusqu'où remplir depuis la matière" />
        <button data-a="ok">${z.etat === 'comblee' ? 'Rouvrir' : 'Marquer comblée'}</button></div>`).join('');
    div.querySelectorAll('.zone').forEach(el => {
      const z = c.zones.find(q => q.id === el.dataset.z);
      el.onmouseenter = () => { T.zoneVue = { calque: c.id, zone: z }; };
      el.onmouseleave = () => { T.zoneVue = null; };
      el.querySelector('[data-a=exp]').onclick = () => exporteZone(c, z);
      el.querySelector('[data-a=imp]').onclick = () => reimporte(c, z);
      el.querySelector('[data-a=prov]').onclick = () => {
        const d = +el.querySelector('[data-a=dist]').value || 32;
        api.modifie(r => { combleZone(r, E.px, E.masques, c.id, z.id, d); return [c.id]; });
        dessineListe(); dessineZones(); toast(`zone ${z.id} comblée provisoirement`);
      };
      el.querySelector('[data-a=ok]').onclick = () => {
        api.modifie(r => { const q = r.calques.find(k => k.id === c.id).zones.find(k => k.id === z.id); q.etat = q.etat === 'comblee' ? 'a-combler' : 'comblee'; });
        dessineListe(); dessineZones();
      };
    });
  }

  function telecharge(nom, pixels) {
    const t = document.createElement('canvas'); t.width = pixels.largeur; t.height = pixels.hauteur;
    t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels.data), pixels.largeur, pixels.hauteur), 0, 0);
    t.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
  }
  function exporteZone(c, z) {
    const R = rectExport(E.rig, E.px, c.id, z), m = E.masques[`${c.id}/${z.id}`];
    if (!m) { toast('masque introuvable pour ' + z.id); return; }
    api.modifie(r => { r.calques.find(k => k.id === c.id).zones.find(k => k.id === z.id).export = { x: R[0], y: R[1], largeur: R[2], hauteur: R[3] }; });
    telecharge(`${E.id}-${c.id}-${z.id}.png`, recadre(E.px[c.id], R));
    telecharge(`${E.id}-${c.id}-${z.id}-masque.png`, masqueEnImage(m, E.rig.source.largeur, E.rig.source.hauteur, R));
    toast(`exporté : le calque et son masque (${R[2]} × ${R[3]} px) — à remplir, puis « Réimporter »`);
  }
  function reimporte(c, z) {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/png';
    f.onchange = async () => {
      const bm = await createImageBitmap(f.files[0]);
      const t = document.createElement('canvas'); t.width = bm.width; t.height = bm.height;
      const g = t.getContext('2d'); g.drawImage(bm, 0, 0);
      const im = { largeur: bm.width, hauteur: bm.height, data: g.getImageData(0, 0, bm.width, bm.height).data };
      const R = z.export ? [z.export.x, z.export.y, z.export.largeur, z.export.hauteur] : rectExport(E.rig, E.px, c.id, z);
      try { api.modifie(r => reimporteZone(r, E.px, c.id, z.id, im, R)); toast(`« ${c.id} » réimporté, zone ${z.id} comblée`); }
      catch (e) { toast(e.message); }
      dessineListe(); dessineZones();
    };
    f.click();
  }

  // ---------------------------------------------------------------- la souris (mode calques)
  const point = (wx, wy) => {
    const c = calque(), o = opt();
    if (T.outil === 'poly' && o.contour && c && E.px[c.id]) return accroche(E.px[c.id], wx, wy, o.rayonContour);
    return [wx, wy];
  };
  function ferme() {
    if (T.pts.length < 3) { T.pts = []; return; }
    T.ferme = true;
    if (!$('#cNom').value) $('#cNom').value = nomDeCalqueLibre(E.rig, 'calque');
    majBoutons();
  }
  function dab(wx, wy) {
    const c = calque(), o = opt();
    const rect = T.outil === 'gomme' ? gomme(E.px[c.id], wx, wy, o.rayon, o.durete, o.force) : restaure(E.px[c.id], E.source, wx, wy, o.rayon, o.durete, o.force);
    api.rafraichitRect(c.id, rect);
  }
  const souris = {
    // rend true si le mode calques a pris le geste
    bas(e, wx, wy, px, py) {
      if (T.outil === 'poly') {
        if (T.ferme) { T.pts = []; T.ferme = false; majBoutons(); }
        if (T.pts.length >= 3) {
          const [ax, ay] = api.versEcran(...T.pts[0]);
          if (Math.hypot(px - ax, py - ay) < 9) { ferme(); return true; }
        }
        if (e.detail >= 2 && T.pts.length >= 3) { ferme(); return true; }
        T.pts.push(point(wx, wy));
        return true;
      }
      if (T.outil === 'libre') { T.pts = [[wx, wy]]; T.ferme = false; T.trace = { px, py }; majBoutons(); return true; }
      const c = calque();
      if (!c) { toast('choisir un calque'); return true; }
      if (verrouille(c)) return true;
      api.debutTrait(c.id);
      T.trace = { px, py, wx, wy, pinceau: true };
      dab(wx, wy);
      return true;
    },
    bouge(e, wx, wy, px, py) {
      T.curseur = [wx, wy];
      if (!T.trace) return false;
      if (T.outil === 'libre') {
        if (Math.hypot(px - T.trace.px, py - T.trace.py) >= 3) { T.pts.push([wx, wy]); T.trace.px = px; T.trace.py = py; }
        return true;
      }
      if (T.trace.pinceau) {
        const o = opt(), pas = Math.max(1, o.rayon / 4), d = Math.hypot(wx - T.trace.wx, wy - T.trace.wy);
        for (let k = 1; k <= Math.floor(d / pas); k++) dab(T.trace.wx + (wx - T.trace.wx) * k * pas / d, T.trace.wy + (wy - T.trace.wy) * k * pas / d);
        if (d >= pas) { T.trace.wx = wx; T.trace.wy = wy; }
        return true;
      }
      return false;
    },
    haut() {
      const t = T.trace; T.trace = null;
      if (!t) return false;
      if (T.outil === 'libre') { ferme(); return true; }
      if (t.pinceau) api.finTrait(E.calque);
      return true;
    },
    touche(e) {
      if (T.outil !== 'poly' || T.ferme) return false;
      if (e.key === 'Enter') { ferme(); return true; }
      if (e.key === 'Backspace') { T.pts.pop(); return true; }
      if (e.key === 'Escape') { T.pts = []; return true; }
      return false;
    },
  };
  addEventListener('keydown', e => { if (E.mode === 'calques' && T.outil !== 'poly' && e.key === 'Escape') { T.pts = []; T.ferme = false; majBoutons(); } });

  $('#cExtraire').onclick = () => {
    const c = calque();
    if (!c || verrouille(c)) return;
    const o = opt(), W = E.rig.source.largeur, H = E.rig.source.hauteur;
    let m = masquePolygone(lisse(T.pts, o.lissage), W, H);
    if (o.trait > 0) m = inclutTrait(m, E.px[c.id], o.trait);
    const nom = ($('#cNom').value || '').trim().replace(/\s+/g, '_') || nomDeCalqueLibre(E.rig, 'calque');
    try {
      let zone;
      api.modifie(r => { zone = extraitCalque(r, E.px, E.masques, { depuis: c.id, nom, masque: m, os: $('#cOs').value || null }); return [c.id, nom]; });
      E.calque = nom; T.pts = []; T.ferme = false; $('#cNom').value = '';
      toast(`« ${nom} » extrait de « ${c.id} »` + (zone ? ` — zone à combler ${zone.id} sur « ${c.id} »` : ''));
    } catch (e) { toast(e.message); }
    dessineListe(); dessineZones();
  };

  $('#cTransfere').onclick = () => {
    const c = calque();
    if (!c || verrouille(c)) return;
    const o = opt(), W = E.rig.source.largeur, H = E.rig.source.hauteur;
    const m = masquePolygone(lisse(T.pts, o.lissage), W, H);
    try {
      let touches;
      api.modifie(r => { touches = transfereVers(r, E.px, E.masques, { vers: c.id, masque: m }); return [c.id, ...touches]; });
      T.pts = []; T.ferme = false;
      toast(`Transféré vers « ${c.id} » depuis ${touches.map(t => '« ' + t + ' »').join(', ')}`);
    } catch (e) { toast(e.message); }
    dessineListe(); dessineZones();
  };

  // ---------------------------------------------------------------- le dessin par-dessus la vue
  function dessine(g) {
    if (T.zoneVue) {
      const z = T.zoneVue.zone, [x0, y0] = api.versEcran(z.x, z.y), [x1, y1] = api.versEcran(z.x + z.largeur, z.y + z.hauteur);
      g.setLineDash([6, 4]); g.strokeStyle = '#f5a623'; g.lineWidth = 2; g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.setLineDash([]);
    }
    if (T.pts.length) {
      const o = opt(), pts = T.ferme ? lisse(T.pts, o.lissage) : T.pts;
      g.beginPath();
      pts.forEach((p, i) => { const [x, y] = api.versEcran(...p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (T.ferme) { g.closePath(); g.fillStyle = 'rgba(122,162,255,.18)'; g.fill(); }
      g.setLineDash([5, 4]); g.lineDashOffset = -(performance.now() / 60) % 9;
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); g.setLineDash([]);
      if (!T.ferme) for (const p of T.pts) { const [x, y] = api.versEcran(...p); g.fillStyle = '#fff'; g.fillRect(x - 2, y - 2, 4, 4); }
    }
    if ((T.outil === 'gomme' || T.outil === 'restaure') && T.curseur) {
      const [x, y] = api.versEcran(...T.curseur), r = opt().rayon * E.vue.z;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.strokeStyle = T.outil === 'gomme' ? '#ff6b81' : '#79e3c5'; g.lineWidth = 1.5; g.stroke();
    }
  }

  return { dessineListe, dessineZones, souris, dessine, aide: () => ({
    poly: 'Lasso polygonal : un clic par sommet (accroché au trait si « suivre le contour »), double-clic ou clic sur le premier point pour fermer, Retour arrière : dernier point, Échap : annuler. Puis « Extraire en calque ».',
    libre: 'Lasso libre : glisser autour de la partie, relâcher pour fermer. Puis « Extraire en calque ».',
    gomme: 'Gomme : glisser sur le calque sélectionné (dans la liste).',
    restaure: 'Restaurer : glisser pour ramener les pixels de l\'image d\'origine sur le calque sélectionné.',
  })[T.outil] };
}
