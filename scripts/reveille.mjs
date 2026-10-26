// RÉVEILLE une machine du réseau local par Wake-on-LAN (un « paquet magique » UDP envoyé en diffusion), puis attend qu'elle
// réponde. Sans dépendance : tourne sur le PC comme sur le Pi (qui, lui, reste allumé quand le PC dort).
//
//   node scripts/reveille.mjs [mon-mien|mac|tout] [--attend 120]   (sans nom : tout)
//
// ⚠ Le paquet ne passe PAS par Tailscale : il faut le lancer depuis une machine du MÊME réseau local (192.168.1.x).
// ⚠ La machine doit accepter le réveil : mon-mien (carte Ethernet Realtek, « Wake on Magic Packet » activé) ; le Mac
// (« Réveil pour l'accès au réseau » : `pmset -g` → womp 1, sur secteur seulement) — selon l'adaptateur Ethernet USB,
// un Mac en veille peut ne pas se réveiller : à essayer.
// Une machine ÉTEINTE (pas en veille) ne se réveille pas ainsi sans réglage du BIOS.
import dgram from 'node:dgram';
import net from 'node:net';

// Les cartes réseau à réveiller (l'ADRESSE MAC de l'Ethernet, pas celle du Wi-Fi) et un port qui répond quand elles dorment pas.
const MACHINES = {
  'mon-mien': { mac: '04:42:1a:87:54:55', ip: '100.79.166.73', port: 22 },
  mac: { mac: '80:69:1a:b4:f2:35', ip: '100.119.195.112', port: 22 },
};
const BROADCAST = '192.168.1.255';

const args = process.argv.slice(2);
const attend = +(args[args.indexOf('--attend') + 1] || 120);
const noms = args.filter(a => !a.startsWith('--') && isNaN(+a));
const cibles = !noms.length || noms.includes('tout') ? Object.keys(MACHINES) : noms;

function paquetMagique(mac) {
  const octets = Buffer.from(mac.replace(/[:-]/g, ''), 'hex');
  return Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(octets)]);
}
const envoie = mac => new Promise((ok, ko) => {
  const s = dgram.createSocket('udp4');
  s.once('error', ko);
  s.bind(() => {
    s.setBroadcast(true);
    const p = paquetMagique(mac);
    // deux ports usuels, deux fois : un paquet UDP peut se perdre
    let n = 0;
    for (const port of [9, 7]) for (let k = 0; k < 2; k++) s.send(p, port, BROADCAST, () => { if (++n === 4) { s.close(); ok(); } });
  });
});
const repond = ({ ip, port }) => new Promise(ok => {
  const c = net.connect({ host: ip, port, timeout: 2500 });
  c.once('connect', () => { c.destroy(); ok(true); });
  c.once('timeout', () => { c.destroy(); ok(false); });
  c.once('error', () => ok(false));
});

let tous = true;
for (const nom of cibles) {
  const m = MACHINES[nom];
  if (!m) { console.log(`${nom} : inconnue (${Object.keys(MACHINES).join(', ')})`); tous = false; continue; }
  if (await repond(m)) { console.log(`${nom} : déjà réveillée`); continue; }
  await envoie(m.mac);
  const fin = Date.now() + attend * 1000;
  let vue = false;
  while (Date.now() < fin && !(vue = await repond(m))) await new Promise(r => setTimeout(r, 3000));
  console.log(vue ? `${nom} : réveillée` : `${nom} : pas de réponse après ${attend} s (veille profonde, éteinte, ou réveil réseau non activé ?)`);
  if (!vue) tous = false;
}
process.exit(tous ? 0 : 1);
