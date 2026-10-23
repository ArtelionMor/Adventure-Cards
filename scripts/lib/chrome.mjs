// Piloter le Chrome (ou Edge, ou Chromium) installe, sans ecran et sans dependance : le
// protocole DevTools, parle par le WebSocket natif de Node (>= 22). Sert au rendu des
// animations (scripts/rig-rendu.mjs) : ce que Chrome dessine est ce que le jeu dessinera,
// avec le meme code WebGL.
//
//   const c = await lanceChrome();       // Chrome headless, profil jetable
//   const page = await c.page(url);      // un onglet, charge
//   const v = await page.evalue('1 + 1') // une expression (promesses attendues)
//   await c.ferme();

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATS = [
  process.env.ADVENTURE_CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export function trouveChrome() {
  const c = CANDIDATS.find(p => fs.existsSync(p));
  if (!c) throw new Error('aucun Chrome/Edge/Chromium trouvé (variable ADVENTURE_CHROME pour en donner un)');
  return c;
}

export async function lanceChrome({ executable = trouveChrome() } = {}) {
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-chrome-'));
  const proc = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profil}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  // Chrome ecrit son port dans le profil (DevToolsActivePort) une fois pret
  const port = await new Promise((ok, ko) => {
    const debut = Date.now();
    const t = setInterval(() => {
      try {
        const l = fs.readFileSync(path.join(profil, 'DevToolsActivePort'), 'utf8').split('\n');
        if (l[0]) { clearInterval(t); ok({ port: l[0].trim(), chemin: l[1].trim() }); }
      } catch { /* pas encore */ }
      if (Date.now() - debut > 20000) { clearInterval(t); ko(new Error('Chrome ne répond pas')); }
    }, 100);
    proc.on('exit', c => { clearInterval(t); ko(new Error('Chrome s\'est arrêté (code ' + c + ')')); });
  });
  const ws = new WebSocket(`ws://127.0.0.1:${port.port}${port.chemin}`);
  await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error('WebSocket DevTools')); });
  let n = 0;
  const attente = new Map(), ecoutes = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && attente.has(m.id)) {
      const { ok, ko } = attente.get(m.id); attente.delete(m.id);
      if (m.error) ko(new Error(m.error.message)); else ok(m.result);
    } else if (m.method) ecoutes.forEach(f => f(m));
  };
  const envoie = (method, params = {}, sessionId) => new Promise((ok, ko) => {
    const id = ++n;
    attente.set(id, { ok, ko });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  return {
    async page(url, { journal = true } = {}) {
      const { targetId } = await envoie('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await envoie('Target.attachToTarget', { targetId, flatten: true });
      const s = (m, p) => envoie(m, p, sessionId);
      await s('Runtime.enable');
      await s('Page.enable');
      if (journal) ecoutes.push(m => {
        if (m.sessionId !== sessionId) return;
        if (m.method === 'Runtime.consoleAPICalled') console.log('  [page] ' + m.params.args.map(a => a.value ?? a.description).join(' '));
        if (m.method === 'Runtime.exceptionThrown') console.log('  [page] ✗ ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
      });
      const charge = new Promise(ok => ecoutes.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') ok(); }));
      await s('Page.navigate', { url });
      await charge;
      return {
        async evalue(expression) {
          const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
          if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
          return r.result.value;
        },
      };
    },
    async ferme() {
      try { await envoie('Browser.close'); } catch { /* deja ferme */ }
      ws.close();
      await new Promise(ok => { if (proc.exitCode != null) ok(); else { proc.on('exit', ok); setTimeout(ok, 3000); } });
      try { fs.rmSync(profil, { recursive: true, force: true }); } catch { /* Windows garde parfois un verrou */ }
    },
  };
}
