// LA DECOUPE AUTO de l'Atelier Rig & Anim (bouton « ✨ Découpe auto » du panneau Calques) : SAM 2 (Meta)
// trouve les regions d'un personnage (oreille, casque, bouclier, queue…), on clique celles qui forment une
// partie, et « Extraire en calque » en fait un calque, comme le lasso.
//
// Le calcul se fait sur une machine a carte graphique (scripts/sam-serveur.py), jointe PAR LE SERVEUR du
// jeu (scripts/devserver.js, /api/sam*) : la page ne parle jamais directement a la machine (HTTPS de
// l'Atelier du Pi, pas de CORS). La fenetre dit ou le calcul tourne :
//   - « Exporter le calcul » decoche : sur la machine du serveur (127.0.0.1:7340) ;
//   - coche : vers les machines de la liste, par leur nom Tailscale (+ le reseau Tailscale si on le donne).
// Les reglages vivent sur le serveur (~/.adventure-card/sam.json), pas dans le navigateur.
//
// Les fonctions pures (union de regions, regions sous un point) n'ont pas de DOM : test-rig.mjs les joue.

import { extraitCalque, inclutTrait, masquePolygone } from './calques.js';

// ------------------------------------------------------------------ pur (sans DOM)

/** Une region : { id, aire, x, y, w, h, bits } ; `bits` = w * h octets, 1 = dans la region. */
export function regionContient(r, x, y) {
  if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return false;
  return r.bits[(y - r.y) * r.w + (x - r.x)] === 1;
}

/** Les regions qui couvrent le point (x, y), de la plus petite a la plus grande. */
export function regionsSous(regions, x, y) {
  return regions.filter(r => regionContient(r, x, y)).sort((a, b) => a.aire - b.aire);
}

/** Le masque (Float32Array W * H, 0 ou 1) de l'union des regions d'ids donnes. */
export function unionRegions(regions, ids, W, H) {
  const m = new Float32Array(W * H), choix = new Set(ids);
  for (const r of regions) {
    if (!choix.has(r.id)) continue;
    for (let j = 0; j < r.h; j++) {
      const y = r.y + j;
      if (y < 0 || y >= H) continue;
      for (let i = 0; i < r.w; i++) if (r.bits[j * r.w + i] === 1 && r.x + i >= 0 && r.x + i < W) m[y * W + r.x + i] = 1;
    }
  }
  return m;
}

/**
 * AFFINER DES ZONES GROSSIERES avec les regions de SAM.
 *   zones   : [ { pts: [[x, y], …] } ] — des contours dessines a la main, sans precision
 *   alpha   : Uint8Array W * H, 1 = pixel du personnage (seuls ceux-la sont repartis)
 *   rend    : { masques: [Float32Array W * H par zone], pixels: [nombre de pixels par zone] }
 * Chaque pixel est rattache a la PLUS PETITE region SAM qui le contient. Une region dont `seuil` (70 %) des
 * pixels tombent dans une meme zone va TOUTE ENTIERE a cette zone : le bord de la partie suit alors celui
 * de SAM, pas le trait grossier. Une region a cheval sur plusieurs zones, et les pixels sans region (le trait
 * noir…), suivent le contour dessine (la plus petite zone qui les couvre). Hors de toute zone : rien, le pixel
 * reste sur le calque d'origine.
 */
export function affineZones(regions, zones, W, H, alpha, seuil = 0.7) {
  const n = zones.length, N = W * H;
  const couv = zones.map(z => masquePolygone(z.pts, W, H));
  const aire = couv.map(c => { let a = 0; for (let p = 0; p < N; p++) if (c[p] > 0.5) a++; return a; });
  // la plus petite region de chaque pixel : on peint du plus grand au plus petit
  const fin = new Int32Array(N).fill(-1);
  const ordre = [...regions].sort((a, b) => b.aire - a.aire);
  for (const r of ordre) {
    for (let j = 0; j < r.h; j++) {
      const y = r.y + j; if (y < 0 || y >= H) continue;
      for (let i = 0; i < r.w; i++) if (r.bits[j * r.w + i] === 1 && r.x + i >= 0 && r.x + i < W) fin[y * W + r.x + i] = r.id;
    }
  }
  // le vote de chaque region
  const total = new Map(), dedans = new Map();
  for (let p = 0; p < N; p++) {
    const id = fin[p];
    if (id < 0 || !alpha[p]) continue;
    total.set(id, (total.get(id) || 0) + 1);
    for (let z = 0; z < n; z++) if (couv[z][p] > 0.5) {
      let t = dedans.get(id); if (!t) dedans.set(id, t = new Array(n).fill(0));
      t[z]++;
    }
  }
  const vers = new Map();
  for (const [id, t] of total) {
    const d = dedans.get(id);
    if (!d) continue;
    let mieux = 0; for (let z = 1; z < n; z++) if (d[z] > d[mieux]) mieux = z;
    if (d[mieux] / t >= seuil) vers.set(id, mieux);
  }
  // les pixels
  const masques = zones.map(() => new Float32Array(N)), pixels = new Array(n).fill(0);
  for (let p = 0; p < N; p++) {
    if (!alpha[p]) continue;
    let z = fin[p] >= 0 && vers.has(fin[p]) ? vers.get(fin[p]) : -1;
    if (z < 0) {
      for (let k = 0; k < n; k++) if (couv[k][p] > 0.5 && (z < 0 || aire[k] < aire[z])) z = k;
    }
    if (z >= 0) { masques[z][p] = 1; pixels[z]++; }
  }
  return { masques, pixels };
}

// ------------------------------------------------------------------ l'interface

const CSS = `
#samFond { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: none; z-index: 50; align-items: center; justify-content: center; }
#samFond.ouvert { display: flex; }
#samBoite { background: var(--panneau, #1b1f2a); color: var(--texte, #e6e8ee); border: 1px solid #394057; border-radius: 10px; width: min(1100px, 96vw); max-height: 94vh; overflow: auto; padding: 14px 16px; display: grid; grid-template-columns: minmax(280px, 340px) 1fr; gap: 14px; }
#samBoite h3 { margin: 0 0 6px; font-size: 14px; }
#samBoite .ligne { display: flex; gap: 6px; align-items: center; margin: 5px 0; flex-wrap: wrap; }
#samBoite input[type=text], #samBoite input[type=number], #samBoite select { background: #11141c; color: inherit; border: 1px solid #394057; border-radius: 5px; padding: 3px 6px; }
#samBoite .machine { display: grid; grid-template-columns: auto 1fr 62px auto auto; gap: 6px; align-items: center; margin: 3px 0; }
#samBoite .point { width: 10px; height: 10px; border-radius: 50%; background: #666; display: inline-block; }
#samBoite .point.ok { background: #4ec36b; } #samBoite .point.ko { background: #d9534f; }
#samBoite .muet { opacity: .65; font-size: 12px; }
#samTitre { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; }
#samBarre { margin: 6px 0 2px; }
#samBarreFond { height: 10px; background: #11141c; border: 1px solid #394057; border-radius: 6px; overflow: hidden; }
#samBarreVal { height: 100%; width: 0; background: #4e8cff; transition: width .4s ease; }
#samBarreVal.indetermine { width: 100% !important; background: repeating-linear-gradient(45deg, #4e8cff 0 10px, #2f5fc0 10px 20px); background-size: 28px 28px; animation: samDefile 1s linear infinite; }
@keyframes samDefile { to { background-position: 28px 0; } }
#samMode { display: flex; gap: 14px; margin: 0 0 6px; font-size: 13px; }
#samZones .zone { display: grid; grid-template-columns: 14px 1fr auto; gap: 6px; align-items: center; margin: 3px 0; }
#samZones .zone i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
#samToile.zones { cursor: copy; }
#samToile { max-width: 100%; border: 1px solid #394057; border-radius: 6px; cursor: crosshair; background: repeating-conic-gradient(#2a2f3d 0 25%, #20242f 0 50%) 0 0 / 16px 16px; }
`;

export function installeSam(api) {
  const { E, toast } = api;
  const $ = s => document.querySelector(s);
  const S = { regions: [], choix: new Set(), pris: null, W: 0, H: 0, survol: null, occupe: false, mode: 'regions', zones: [], trace: null, affine: null };

  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const fond = document.createElement('div');
  fond.id = 'samFond';
  fond.innerHTML = `
    <div id="samBoite" role="dialog" aria-label="Découpe automatique">
      <div id="samTitre"><strong>✨ Découpe auto (SAM 2)</strong><button id="samFerme">✕ Fermer</button></div>
      <div>
        <h3>Où faire le calcul</h3>
        <div class="ligne"><label><input type="checkbox" id="samExporter" /> Exporter le calcul vers d'autres machines</label></div>
        <div id="samLocal" class="muet">Le calcul se fait sur la machine de ce serveur (127.0.0.1, port 7340) : le serveur SAM doit y tourner.</div>
        <div id="samReseauBloc" style="display:none">
          <div class="ligne"><label for="samReseau">Réseau Tailscale</label><input type="text" id="samReseau" placeholder="ex. tailc8e047.ts.net" style="flex:1" /></div>
          <div class="muet">Un nom de machine sans point est complété en « nom.réseau ». Vide : le nom court tel quel.</div>
          <div class="ligne"><strong style="font-size:12px">Machines</strong><span class="muet">la première qui répond travaille</span></div>
          <div id="samMachines"></div>
          <div class="ligne"><button id="samDetecte" title="Lit les machines de votre réseau Tailscale et sonde chacune : celles qui font tourner le serveur SAM sont ajoutées">🔍 Détecter</button><button id="samAjoute">+ Machine</button><button id="samSonde">Tester</button></div>
          <div class="muet" id="samDetecteTxt"></div>
        </div>
        <div class="ligne"><label for="samFinesse">Finesse</label>
          <select id="samFinesse"><option value="16">grossière (rapide)</option><option value="32" selected>normale</option><option value="48">fine (lente)</option></select></div>
        <div class="ligne"><button id="samAnalyse" class="primaire">Analyser le personnage</button><span id="samEtat" class="muet"></span></div>
        <div id="samBarre" style="display:none"><div id="samBarreFond"><div id="samBarreVal"></div></div><div class="muet" id="samBarreTxt"></div></div>
        <h3 style="margin-top:12px">La partie à extraire</h3>
        <div class="muet">Clic : ajouter ou retirer la plus petite région sous le curseur. Alt + clic : l'élargir à la région d'au-dessus. Les parties déjà extraites sont grisées.</div>
        <div class="ligne"><label for="samDepuis" title="Le calque dont la partie est retirée">Extraire depuis</label><select id="samDepuis" style="flex:1"></select></div>
        <div class="ligne"><label for="samNom">Nom du calque</label><input type="text" id="samNom" placeholder="oreille_g" style="flex:1" /></div>
        <div class="ligne"><label for="samTrait" title="Le contour noir qui borde la partie part avec elle">Inclure le trait</label><input type="number" id="samTrait" value="6" min="0" max="30" style="width:56px" /><span class="muet">px</span></div>
        <div class="ligne"><button id="samExtrait" class="primaire">Extraire en calque</button><button id="samEfface">Vider la sélection</button><span id="samCompte" class="muet"></span></div>
      </div>
      <div>
        <div id="samMode"><label><input type="radio" name="samMode" value="regions" checked /> Régions (clics)</label>
          <label title="Entourer chaque partie à main levée, sans précision : SAM refait les bords"><input type="radio" name="samMode" value="zones" /> Zones grossières (à main levée)</label></div>
        <canvas id="samToile" width="640" height="640"></canvas><div class="muet" id="samAide">Lancer l'analyse pour voir les régions.</div>
        <div id="samZonesBloc" style="display:none">
          <div class="muet">Entoure chaque partie en glissant la souris, sans précision (une boucle par partie). Ce qui n'est dans aucune boucle reste sur le calque d'origine.</div>
          <div id="samZones"></div>
          <div class="ligne"><button id="samAffine" class="primaire">Affiner avec SAM</button><button id="samExtraitZones" class="primaire">Extraire toutes les zones</button><button id="samEffaceZones">Effacer les zones</button><span class="muet" id="samZonesTxt"></span></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(fond);

  // ---------------------------------------------------------------- reglages et machines
  let machines = [];
  function dessineMachines(etats = []) {
    const div = $('#samMachines'); div.innerHTML = '';
    machines.forEach((m, i) => {
      const e = etats.find(x => x.nom === m.nom)?.etat;
      const l = document.createElement('div'); l.className = 'machine';
      l.innerHTML = `<input type="checkbox" ${m.actif !== false ? 'checked' : ''} title="utiliser cette machine" />
        <input type="text" value="${m.nom}" placeholder="nom Tailscale (ex. mon-mien)" />
        <input type="number" value="${m.port || 7340}" min="1" max="65535" title="port du serveur SAM" />
        <span class="point ${e ? (e.ok ? 'ok' : 'ko') : ''}" title="${e ? (e.ok ? ('prête' + (e.gpu ? ' · ' + e.gpu : '')) : e.raison) : 'pas testée'}"></span>
        <button title="retirer">✕</button>`;
      const [ck, nom, port] = l.querySelectorAll('input');
      ck.onchange = () => { m.actif = ck.checked; };
      nom.oninput = () => { m.nom = nom.value.trim(); };
      port.oninput = () => { m.port = +port.value || 7340; };
      l.querySelector('button').onclick = () => { machines.splice(i, 1); dessineMachines(etats); };
      div.appendChild(l);
    });
    if (!machines.length) div.innerHTML = '<div class="muet">Aucune machine : « + Machine ».</div>';
  }
  const lisForm = () => ({
    exporter: $('#samExporter').checked, reseau: $('#samReseau').value.trim(), points: +$('#samFinesse').value,
    machines: machines.filter(m => m.nom),
  });
  function montreReseau() {
    const ex = $('#samExporter').checked;
    $('#samReseauBloc').style.display = ex ? '' : 'none';
    $('#samLocal').style.display = ex ? 'none' : '';
  }
  async function enregistreReglages() {
    const r = await fetch('/api/sam/reglages', { method: 'POST', body: JSON.stringify(lisForm()) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur || 'réglages refusés');
    return r.json();
  }
  async function charge() {
    try {
      const r = await (await fetch('/api/sam', { cache: 'no-store' })).json();
      const g = r.reglages;
      $('#samExporter').checked = g.exporter; $('#samReseau').value = g.reseau || ''; $('#samFinesse').value = String(g.points || 32);
      machines = g.machines.map(m => ({ ...m }));
      montreReseau(); dessineMachines(r.machines);
    } catch { montreReseau(); dessineMachines(); $('#samEtat').textContent = 'serveur de réglages injoignable (l\'exe sans Node n\'a pas cette fonction)'; }
  }
  $('#samExporter').onchange = montreReseau;
  $('#samDetecte').onclick = async () => {
    const txt = $('#samDetecteTxt'), b = $('#samDetecte');
    b.disabled = true; txt.textContent = 'Recherche des machines du réseau Tailscale…';
    try {
      const r = await fetch('/api/sam/detecte', { cache: 'no-store' }), d = await r.json();
      if (!r.ok) throw new Error(d.erreur || 'échec');
      if (d.reseau && !$('#samReseau').value.trim()) $('#samReseau').value = d.reseau;
      const reponds = d.machines.filter(m => m.sam && !m.moi);
      let ajoutees = 0;
      for (const m of reponds) {
        const connue = machines.find(x => x.nom === m.nom);
        if (connue) connue.actif = true; else { machines.push({ nom: m.nom, port: 7340, actif: true }); ajoutees++; }
      }
      dessineMachines(reponds.map(m => ({ nom: m.nom, etat: m.sam })));
      const autres = d.machines.filter(m => m.enLigne && !m.sam && !m.moi).map(m => m.nom);
      const eteintes = d.machines.filter(m => !m.enLigne).length;
      txt.textContent = `${d.machines.length} machine(s) sur le réseau · ${reponds.length} avec un serveur SAM`
        + (reponds.length ? ` (${reponds.map(m => m.nom + (m.sam.gpu ? ' · ' + m.sam.gpu : '')).join(', ')})` : '')
        + (autres.length ? ` · en ligne sans serveur SAM : ${autres.join(', ')}` : '')
        + (eteintes ? ` · éteintes : ${eteintes}` : '')
        + (ajoutees || reponds.length ? '' : ' — lancer scripts/installe-sam.ps1 sur la machine à carte graphique');
      if (reponds.length) $('#samExporter').checked = true, montreReseau();
    } catch (e) { txt.textContent = e.message; }
    b.disabled = false;
  };
  $('#samAjoute').onclick = () => { machines.push({ nom: '', port: 7340, actif: true }); dessineMachines(); };
  $('#samSonde').onclick = async () => {
    try { const r = await enregistreReglages(); dessineMachines(r.machines); $('#samEtat').textContent = 'machines sondées'; }
    catch (e) { $('#samEtat').textContent = e.message; }
  };

  function remplisCalques() {
    const sel = $('#samDepuis'), avant = sel.value || E.calque;
    sel.innerHTML = E.rig.calques.map(c => `<option>${c.id}</option>`).join('');
    sel.value = E.rig.calques.some(c => c.id === avant) ? avant : (E.calque || E.rig.calques[0]?.id);
  }
  $('#samDepuis').onchange = () => dessine();

  // ---------------------------------------------------------------- l'analyse
  const decode = (r) => new Promise((ok, ko) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, r.w, r.h).data, bits = new Uint8Array(r.w * r.h);
      for (let p = 0; p < bits.length; p++) bits[p] = d[p * 4] > 127 ? 1 : 0;
      ok({ id: r.id, aire: r.aire, x: r.x, y: r.y, w: r.w, h: r.h, bits });
    };
    im.onerror = () => ko(new Error('masque illisible'));
    im.src = 'data:image/png;base64,' + r.png;
  });

  // La barre : l'etape que dit la machine (GET /etat, relaye par /api/sam), ou une estimation faite sur la
  // duree du dernier calcul. Le chargement du modele (une fois par demarrage) est de duree inconnue : barre animee.
  function barre(pct, texte, indetermine = false) {
    $('#samBarre').style.display = '';
    const v = $('#samBarreVal');
    v.classList.toggle('indetermine', indetermine);
    v.style.width = Math.max(0, Math.min(100, pct)) + '%';
    $('#samBarreTxt').textContent = texte;
  }
  function avancement(machines, t0) {
    const m = machines.map(x => x.etat).find(e => e && e.ok && e.occupe);
    const depuis = Math.round((Date.now() - t0) / 1000);
    if (!m) return [3, 'Envoi du personnage… ' + depuis + ' s', false];
    if (m.etape === 'lecture') return [5, 'Le serveur reçoit le personnage…', false];
    if (m.etape === 'chargement') return [100, 'Chargement du modèle sur la machine (une fois par démarrage, plusieurs minutes) · ' + Math.round(m.ecoule) + ' s', true];
    if (m.etape === 'calcul') {
      const est = m.calcul_dernier || 10;
      return [10 + 78 * Math.min(1, m.ecoule / est), `Calcul des régions · ${Math.round(m.ecoule)} s (habituellement ~${Math.round(est)} s)`, false];
    }
    return [92, 'Mise en forme des régions…', false];
  }

  $('#samAnalyse').onclick = async () => {
    if (S.occupe || !E.id) return;
    S.occupe = true; $('#samAnalyse').disabled = true;
    $('#samEtat').textContent = '';
    const t0 = Date.now();
    barre(3, 'Envoi du personnage…');
    let sonde = false;
    const tic = setInterval(async () => {
      if (sonde) return; sonde = true;
      try { const r = await (await fetch('/api/sam', { cache: 'no-store' })).json(); barre(...avancement(r.machines || [], t0)); } catch { /* le serveur est occupe a relayer */ }
      sonde = false;
    }, 1000);
    try {
      await enregistreReglages();
      const r = await fetch('/api/sam/segmente?id=' + encodeURIComponent(E.id), { method: 'POST' });
      const rep = await r.json();
      if (!r.ok) throw new Error(rep.erreur || 'échec');
      S.W = rep.largeur; S.H = rep.hauteur;
      clearInterval(tic);
      barre(96, 'Lecture des ' + rep.masques.length + ' régions…');
      S.regions = await Promise.all(rep.masques.map(decode));
      barre(100, 'Terminé en ' + Math.round((Date.now() - t0) / 1000) + ' s');
      S.choix = new Set(); S.pris = new Uint8Array(S.W * S.H);
      $('#samEtat').textContent = `${S.regions.length} régions · ${rep.machine} · ${Math.round((Date.now() - t0) / 1000)} s`;
      $('#samAide').textContent = 'Cliquer sur une partie du personnage.';
      dessine(); majCompte();
    } catch (e) { $('#samEtat').textContent = e.message; $('#samBarre').style.display = 'none'; toast(e.message); }
    clearInterval(tic); S.occupe = false; $('#samAnalyse').disabled = false;
  };

  // ---------------------------------------------------------------- le dessin et les clics
  const toile = $('#samToile'), g = toile.getContext('2d');
  const couleur = id => `hsl(${(id * 67) % 360} 85% 55%)`;
  function pose(x) { return { x: Math.floor(x.offsetX * S.W / toile.clientWidth), y: Math.floor(x.offsetY * S.H / toile.clientHeight) }; }
  function dessine() {
    if (!S.W) return;
    toile.width = S.W; toile.height = S.H;
    // le personnage entier, assombri, et le calque choisi en clair par-dessus
    const fondIm = E.source || E.px[E.rig.calques[0]?.id], im = E.px[$('#samDepuis').value];
    g.clearRect(0, 0, S.W, S.H);
    if (fondIm) {
      const d0 = new Uint8ClampedArray(fondIm.data);
      for (let o = 0; o < d0.length; o += 4) { d0[o] *= 0.35; d0[o + 1] *= 0.35; d0[o + 2] *= 0.35; }
      g.putImageData(new ImageData(d0, fondIm.largeur, fondIm.hauteur), 0, 0);
    }
    if (im) {
      const t = document.createElement('canvas'); t.width = im.largeur; t.height = im.hauteur;
      t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data), im.largeur, im.hauteur), 0, 0);
      g.drawImage(t, 0, 0);
    }
    const over = g.getImageData(0, 0, S.W, S.H), d = over.data;
    const teinte = (r, a, c) => {
      const [cr, cg, cb] = c;
      for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) if (r.bits[j * r.w + i]) {
        const o = ((r.y + j) * S.W + r.x + i) * 4;
        d[o] = d[o] * (1 - a) + cr * a; d[o + 1] = d[o + 1] * (1 - a) + cg * a; d[o + 2] = d[o + 2] * (1 - a) + cb * a;
      }
    };
    for (let p = 0; p < S.pris.length; p++) if (S.pris[p]) { const o = p * 4; d[o] = d[o] * 0.4 + 80; d[o + 1] = d[o + 1] * 0.4 + 80; d[o + 2] = d[o + 2] * 0.4 + 80; }
    const rgb = id => { const h = (id * 67) % 360, c = document.createElement('canvas').getContext('2d'); c.fillStyle = `hsl(${h} 85% 55%)`; c.fillRect(0, 0, 1, 1); const x = c.fillStyle; return [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)]; };
    for (const r of S.regions) if (S.choix.has(r.id)) teinte(r, 0.6, rgb(r.id));
    if (S.survol != null) { const r = S.regions.find(x => x.id === S.survol); if (r) teinte(r, 0.35, [255, 255, 255]); }
    // l'apercu des zones affinees par SAM : chaque zone dans sa couleur
    if (S.affine) {
      S.affine.masques.forEach((m, z) => {
        const [cr, cg, cb] = couleurZone(z);
        for (let p = 0; p < m.length; p++) if (m[p] > 0.5) { const o = p * 4; d[o] = d[o] * 0.4 + cr * 0.6; d[o + 1] = d[o + 1] * 0.4 + cg * 0.6; d[o + 2] = d[o + 2] * 0.4 + cb * 0.6; }
      });
    }
    g.putImageData(over, 0, 0);
    // les contours dessines
    const trait = Math.max(2, S.W / 300);
    const ligne = (pts, col, ferme) => {
      if (pts.length < 2) return;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts) g.lineTo(q[0], q[1]); if (ferme) g.closePath();
      g.lineWidth = trait; g.strokeStyle = col; g.stroke();
    };
    S.zones.forEach((z, k) => ligne(z.pts, `rgb(${couleurZone(k).join(',')})`, true));
    if (S.trace) ligne(S.trace, '#fff', false);
  }
  toile.addEventListener('pointermove', e => {
    if (!S.regions.length || S.mode !== 'regions') return;
    const { x, y } = pose(e), sous = regionsSous(S.regions, x, y)[0];
    const id = sous ? sous.id : null;
    if (id !== S.survol) { S.survol = id; dessine(); }
  });
  toile.addEventListener('pointerleave', () => { if (S.survol != null) { S.survol = null; dessine(); } });
  toile.addEventListener('click', e => {
    if (!S.regions.length || S.mode !== 'regions') return;
    const { x, y } = pose(e), sous = regionsSous(S.regions, x, y);
    if (!sous.length) return;
    if (e.altKey) {
      const suivante = sous.find(r => !S.choix.has(r.id));
      if (suivante) S.choix.add(suivante.id);
    } else if (S.choix.has(sous[0].id)) S.choix.delete(sous[0].id);
    else S.choix.add(sous[0].id);
    dessine(); majCompte();
  });
  function majCompte() { $('#samCompte').textContent = S.choix.size ? S.choix.size + ' région(s)' : ''; }
  $('#samEfface').onclick = () => { S.choix.clear(); dessine(); majCompte(); };

  // ---------------------------------------------------------------- zones grossieres
  const COULEURS = [[255, 80, 80], [80, 160, 255], [255, 200, 40], [90, 220, 120], [200, 110, 255], [255, 140, 60], [60, 220, 220], [255, 100, 190]];
  function couleurZone(k) { return COULEURS[k % COULEURS.length]; }
  function majMode() {
    S.mode = document.querySelector('input[name=samMode]:checked').value;
    $('#samZonesBloc').style.display = S.mode === 'zones' ? '' : 'none';
    toile.classList.toggle('zones', S.mode === 'zones');
    $('#samAide').textContent = S.mode === 'zones' ? 'Glisser autour d\'une partie, relâcher : la boucle se ferme.' : (S.regions.length ? 'Cliquer sur une partie du personnage.' : 'Lancer l\'analyse pour voir les régions.');
    dessine();
  }
  document.querySelectorAll('input[name=samMode]').forEach(r => { r.onchange = majMode; });
  function listeZones() {
    const div = $('#samZones'); div.innerHTML = '';
    S.zones.forEach((z, k) => {
      const l = document.createElement('div'); l.className = 'zone';
      l.innerHTML = `<i style="background:rgb(${couleurZone(k).join(',')})"></i><input type="text" value="${z.nom}" placeholder="nom du calque" /><button title="retirer">✕</button>`;
      l.querySelector('input').oninput = e => { z.nom = e.target.value; };
      l.querySelector('button').onclick = () => { S.zones.splice(k, 1); S.affine = null; listeZones(); dessine(); };
      div.appendChild(l);
    });
    $('#samZonesTxt').textContent = S.affine ? S.affine.pixels.map((n, k) => `${S.zones[k]?.nom || k} : ${n.toLocaleString('fr-FR')} px`).join(' · ') : '';
  }
  // le lasso a main levee : on glisse, on relache, la boucle se ferme
  toile.addEventListener('pointerdown', e => {
    if (S.mode !== 'zones' || !S.W) return;
    toile.setPointerCapture(e.pointerId);
    const q = pose(e); S.trace = [[q.x, q.y]];
  });
  toile.addEventListener('pointermove', e => {
    if (S.mode !== 'zones' || !S.trace) return;
    const q = pose(e), d = S.trace[S.trace.length - 1];
    if (Math.hypot(q.x - d[0], q.y - d[1]) > 3) { S.trace.push([q.x, q.y]); dessine(); }
  });
  toile.addEventListener('pointerup', () => {
    if (S.mode !== 'zones' || !S.trace) return;
    const pts = S.trace; S.trace = null;
    if (pts.length >= 8) {
      let k = S.zones.length + 1; while (S.zones.some(z => z.nom === 'zone_' + k)) k++;
      S.zones.push({ nom: 'zone_' + k, pts }); S.affine = null; listeZones();
    }
    dessine();
  });
  function alphaDe(calque) {
    const im = E.px[calque], a = new Uint8Array(S.W * S.H);
    if (im) for (let p = 0; p < a.length; p++) a[p] = im.data[p * 4 + 3] > 8 ? 1 : 0;
    return a;
  }
  function affine() {
    if (!S.regions.length) { toile.title = ''; toast('lancer d\'abord l\'analyse'); return null; }
    if (!S.zones.length) { toast('entourer au moins une partie'); return null; }
    S.affine = affineZones(S.regions, S.zones, S.W, S.H, alphaDe($('#samDepuis').value));
    listeZones(); dessine();
    return S.affine;
  }
  $('#samAffine').onclick = () => { affine(); };
  $('#samEffaceZones').onclick = () => { S.zones = []; S.affine = null; listeZones(); dessine(); };
  $('#samExtraitZones').onclick = () => {
    const r = S.affine || affine();
    if (!r) return;
    const depuis = $('#samDepuis').value, c = E.rig.calques.find(k => k.id === depuis);
    if (!c || c.verrou) { toast('calque introuvable ou verrouillé'); return; }
    const noms = S.zones.map(z => (z.nom || '').trim().replace(/\s+/g, '_'));
    if (noms.some(n => !/^[a-z0-9][a-z0-9_-]*$/i.test(n)) || new Set(noms).size !== noms.length) { toast('chaque zone a besoin d\'un nom différent (lettres, chiffres, _ et -)'); return; }
    const faits = [], vides = [];
    try {
      api.modifie(rig => {
        S.zones.forEach((z, k) => {
          if (!r.pixels[k]) { vides.push(noms[k]); return; }
          extraitCalque(rig, E.px, E.masques, { depuis, nom: noms[k], masque: r.masques[k] });
          faits.push(noms[k]);
        });
        return [depuis, ...faits];
      });
    } catch (e) { toast(e.message); return; }
    for (const m of r.masques) for (let p = 0; p < m.length; p++) if (m[p] > 0.5) S.pris[p] = 1;
    if (faits.length) E.calque = faits[faits.length - 1];
    S.zones = []; S.affine = null; listeZones(); remplisCalques(); dessine();
    toast(`${faits.length} calque(s) extrait(s) de « ${depuis} » : ${faits.join(', ')}` + (vides.length ? ` — zones vides ignorées : ${vides.join(', ')}` : ''));
  };

  // ---------------------------------------------------------------- extraire
  $('#samExtrait').onclick = () => {
    if (!S.choix.size) { toast('choisir au moins une région'); return; }
    const depuis = $('#samDepuis').value, c = E.rig.calques.find(k => k.id === depuis);
    if (!c) return;
    if (c.verrou) { toast('calque verrouillé'); return; }
    const nom = ($('#samNom').value || '').trim().replace(/\s+/g, '_');
    if (!nom) { toast('donner un nom au calque'); $('#samNom').focus(); return; }
    let m = unionRegions(S.regions, [...S.choix], S.W, S.H);
    const trait = +$('#samTrait').value || 0;
    if (trait > 0) m = inclutTrait(m, E.px[depuis], trait);
    try {
      let zone;
      api.modifie(r => { zone = extraitCalque(r, E.px, E.masques, { depuis, nom, masque: m }); return [depuis, nom]; });
      for (let p = 0; p < m.length; p++) if (m[p] > 0.5) S.pris[p] = 1;
      E.calque = nom; S.choix.clear(); $('#samNom').value = '';
      toast(`« ${nom} » extrait de « ${depuis} »` + (zone ? ` — zone à combler ${zone.id}` : ''));
      remplisCalques(); dessine(); majCompte();
    } catch (e) { toast(e.message); }
  };

  // ---------------------------------------------------------------- ouvrir, fermer
  function ouvre() { fond.classList.add('ouvert'); charge(); remplisCalques(); if (S.regions.length) dessine(); }
  const ferme = () => fond.classList.remove('ouvert');
  $('#samFerme').onclick = ferme;
  fond.addEventListener('pointerdown', e => { if (e.target === fond) ferme(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && fond.classList.contains('ouvert')) ferme(); }, true);

  // le bouton, en tete du panneau Calques
  const bouton = document.createElement('button');
  bouton.id = 'samOuvre'; bouton.textContent = '✨ Découpe auto (SAM)';
  bouton.title = 'Trouver les parties du personnage automatiquement (calcul sur une machine à carte graphique)';
  bouton.onclick = ouvre;
  const sec = document.querySelector('#secCalques');
  if (sec) sec.querySelector('h2')?.after(bouton); else document.body.appendChild(bouton);
  // l'etat en memoire : une nouvelle analyse repart de rien quand on change de personnage
  return { ouvre, ferme, nettoie() { S.regions = []; S.choix.clear(); S.W = 0; S.zones = []; S.affine = null; S.trace = null; } };
}
