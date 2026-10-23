// LE RENDU WebGL d'un personnage anime. WebGL 1 (le plus repandu sur les telephones) : un
// seul programme, une texture par image, les sommets deformes envoyes a chaque image (la
// peau se calcule en JS : quelques centaines de sommets par personnage, c'est rien).
//
// Plusieurs personnages se dessinent dans le MEME canvas (un appel `dessine` par animateur).
// Un ecran qui dessine en Canvas 2D (l'overworld) peut recopier ce canvas avec drawImage.

const VS = `
attribute vec2 a_pos; attribute vec2 a_uv;
uniform vec2 u_ecran; uniform vec2 u_place; uniform vec2 u_origine; uniform float u_echelle;
varying vec2 v_uv;
void main() {
  vec2 p = (a_pos - u_origine) * u_echelle + u_place;
  gl_Position = vec4(p.x / u_ecran.x * 2.0 - 1.0, 1.0 - p.y / u_ecran.y * 2.0, 0.0, 1.0);
  v_uv = a_uv;
}`;
const FS = `
precision mediump float;
uniform sampler2D u_tex; uniform float u_alpha;
varying vec2 v_uv;
void main() { gl_FragColor = texture2D(u_tex, v_uv) * u_alpha; }`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

const puissanceDe2 = n => 2 ** Math.ceil(Math.log2(Math.max(1, n)));

export function creeRendu(canvas, { conserve = false } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: conserve });
  if (!gl) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const L = {
    pos: gl.getAttribLocation(prog, 'a_pos'), uv: gl.getAttribLocation(prog, 'a_uv'),
    ecran: gl.getUniformLocation(prog, 'u_ecran'), place: gl.getUniformLocation(prog, 'u_place'),
    origine: gl.getUniformLocation(prog, 'u_origine'), echelle: gl.getUniformLocation(prog, 'u_echelle'),
    tex: gl.getUniformLocation(prog, 'u_tex'), alpha: gl.getUniformLocation(prog, 'u_alpha'),
  };
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const textures = new Map();   // image -> texture
  const statiques = new WeakMap(); // calque prepare -> { uv, idx }
  const bufPos = gl.createBuffer();

  // ⚠ Une texture en puissance de 2 avec mipmaps : un personnage de 2000 px affiche a
  // 200 px sans mipmaps crenele ses contours noirs (un pixel sur dix echantillonne).
  function textureDe(image) {
    if (textures.has(image)) return textures.get(image);
    const cote = Math.min(maxTex, puissanceDe2(Math.max(image.width, image.height)));
    const c = document.createElement('canvas');
    c.width = c.height = cote;
    c.getContext('2d').drawImage(image, 0, 0, cote, cote);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.set(image, t);
    return t;
  }

  function statique(cal) {
    let s = statiques.get(cal);
    if (!s) {
      s = { uv: gl.createBuffer(), idx: gl.createBuffer() };
      gl.bindBuffer(gl.ARRAY_BUFFER, s.uv); gl.bufferData(gl.ARRAY_BUFFER, cal.uv, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cal.indices, gl.STATIC_DRAW);
      statiques.set(cal, s);
    }
    return s;
  }

  return {
    gl, canvas,
    // Vide le canvas (transparent, ou d'une couleur [r, g, b] en 0..1).
    efface(fond) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (fond) gl.clearColor(fond[0], fond[1], fond[2], 1); else gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    // Dessine un animateur deja calcule (`calcule()`). Le point `origine` de l'image source
    // (en pixels de la source) tombe au point `place` du canvas, a l'echelle `echelle`.
    // `opacites` : { idCalque: 0..1 } (apercu de l'editeur).
    dessine(anim, { place = [0, 0], origine = [0, 0], echelle = 1, opacites = null } = {}) {
      const rig = anim.rig;
      gl.useProgram(prog);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(L.ecran, canvas.width, canvas.height);
      gl.uniform2f(L.place, place[0], place[1]);
      gl.uniform2f(L.origine, origine[0], origine[1]);
      gl.uniform1f(L.echelle, echelle);
      gl.uniform1i(L.tex, 0);
      gl.activeTexture(gl.TEXTURE0);
      rig.calques.forEach((cal, k) => {
        const image = rig.images[cal.image || rig.json.source?.image || 'source.png'];
        if (!image) return;
        const alpha = opacites && cal.id in opacites ? opacites[cal.id] : 1;
        if (alpha <= 0) return;
        const s = statique(cal);
        gl.bindTexture(gl.TEXTURE_2D, textureDe(image));
        gl.uniform1f(L.alpha, alpha);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, anim.sommets[k], gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(L.pos);
        gl.vertexAttribPointer(L.pos, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, s.uv);
        gl.enableVertexAttribArray(L.uv);
        gl.vertexAttribPointer(L.uv, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.idx);
        gl.drawElements(gl.TRIANGLES, cal.indices.length, gl.UNSIGNED_SHORT, 0);
      });
    },
    // Oublie les textures (une image source remplacee dans l'editeur).
    oublie() { for (const t of textures.values()) gl.deleteTexture(t); textures.clear(); },
    // Une image a change (un calque gomme dans l'editeur) : sa texture sera refaite au prochain dessin.
    rafraichit(image) { const t = textures.get(image); if (t) { gl.deleteTexture(t); textures.delete(image); } },
  };
}
