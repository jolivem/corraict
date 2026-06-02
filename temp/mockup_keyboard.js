// Génère une maquette du clavier aicorrect (style Samsung) -> PNG via sharp
const path = require('path');
const sharp = require(path.join('/home/michel/github/aicorrect/web/node_modules/sharp'));

const W = 1080;
const PAD = 8;       // marge latérale
const GAP = 12;      // espace entre touches

// Couleurs (reprises des captures Samsung sombre)
const C = {
  kbBg: '#0a0a0c',        // fond clavier
  toolbarBg: '#141417',   // fond barre d'outils
  key: '#2b2e3b',         // touche normale
  keyDark: '#1d1f29',     // touche secondaire (shift, del, !#1...)
  keyText: '#f2f3f5',
  keySub: '#8a8d99',      // petits caractères / labels gris
  accent: '#3b82f6',      // bleu accent pour Corriger
  accentText: '#ffffff',
  smiley: '#262833',      // smiley fondu/grisé
  smileyStroke: '#4a4d5a',
};

let svg = '';

function rrect(x, y, w, h, r, fill, opts = {}) {
  const stroke = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw || 1.5}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${fill}"${stroke}/>`;
}
function text(x, y, str, size, fill, opts = {}) {
  const anchor = opts.anchor || 'middle';
  const weight = opts.weight || '400';
  return `<text x="${x}" y="${y}" font-family="Roboto, 'Segoe UI', Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="central">${str}</text>`;
}

// ---- dimensions verticales ----
const TOOLBAR_Y = 0,  TOOLBAR_H = 118;
const ROW_H = 132;
const ROW_GAP = 10;
let y = TOOLBAR_Y + TOOLBAR_H + 8;
const numY = y;            y += ROW_H + ROW_GAP;
const row1Y = y;           y += ROW_H + ROW_GAP;
const row2Y = y;           y += ROW_H + ROW_GAP;
const row3Y = y;           y += ROW_H + ROW_GAP;
const bottomY = y;         y += ROW_H + ROW_GAP;
const H = y + 6;

// helper: rangée de touches uniformément réparties (n touches sur toute la largeur)
function fullRow(yy, labels, opts = {}) {
  const n = labels.length;
  const usable = W - 2 * PAD - (n - 1) * GAP;
  const kw = usable / n;
  let out = '';
  for (let i = 0; i < n; i++) {
    const kx = PAD + i * (kw + GAP);
    out += rrect(kx, yy, kw, ROW_H, 14, opts.fill || C.key);
    out += text(kx + kw / 2, yy + ROW_H / 2, labels[i], opts.size || 44, C.keyText, { weight: '400' });
  }
  return out;
}

// =================== FOND ===================
svg += rrect(0, 0, W, H, 0, C.kbBg);

// =================== BARRE D'OUTILS (Corriger + smiley) ===================
svg += rrect(0, TOOLBAR_Y, W, TOOLBAR_H, 0, C.toolbarBg);
const tbMid = TOOLBAR_Y + TOOLBAR_H / 2;

// Bouton CORRIGER (pill bleu, mis en avant) à gauche
const corrX = PAD + 6, corrW = 360, corrH = 80;
const corrY = tbMid - corrH / 2;
svg += rrect(corrX, corrY, corrW, corrH, corrH / 2, C.accent);
// icône coche ✓
const ix = corrX + 56, iy = tbMid;
svg += `<g stroke="${C.accentText}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
  <path d="M ${ix-20} ${iy+2} L ${ix-6} ${iy+18} L ${ix+22} ${iy-18}"/>
</g>`;
svg += text(corrX + 130, tbMid, 'Corriger', 42, C.accentText, { anchor: 'start', weight: '600' });

// Bouton SMILEY (pastille grise, fondue dans le clavier) — tout à droite
const smR = 40;
const smCx = W - PAD - 6 - smR, smCy = tbMid;
svg += `<circle cx="${smCx}" cy="${smCy}" r="${smR}" fill="${C.smiley}" stroke="${C.smileyStroke}" stroke-width="1.5"/>`;
svg += `<g stroke="${C.keySub}" stroke-width="4" stroke-linecap="round" fill="none">
  <path d="M ${smCx-16} ${smCy+8} Q ${smCx} ${smCy+24} ${smCx+16} ${smCy+8}"/>
</g>`;
svg += `<g fill="${C.keySub}"><circle cx="${smCx-13}" cy="${smCy-10}" r="4.5"/><circle cx="${smCx+13}" cy="${smCy-10}" r="4.5"/></g>`;

// Bouton UNDO (↶) gris, discret, à gauche du smiley
const unCx = smCx - 2 * smR - 14, unCy = tbMid;
svg += `<circle cx="${unCx}" cy="${unCy}" r="${smR}" fill="${C.smiley}" stroke="${C.smileyStroke}" stroke-width="1.5"/>`;
svg += text(unCx, unCy - 2, '↶', 46, C.keySub, { weight: '400' });

// =================== RANGÉES ===================
// chiffres
svg += fullRow(numY, ['1','2','3','4','5','6','7','8','9','0']);
// AZERTY rangée 1
svg += fullRow(row1Y, ['a','z','e','r','t','y','u','i','o','p']);
// AZERTY rangée 2
svg += fullRow(row2Y, ['q','s','d','f','g','h','j','k','l','m']);

// rangée 3 : shift + w x c v b n + backspace
(function () {
  const yy = row3Y;
  const n = 10; // même grille que dessus
  const usable = W - 2 * PAD - (n - 1) * GAP;
  const kw = usable / n;
  const wideW = kw * 1.5 + GAP * 0.5; // shift et del ~1.5 touche
  // shift
  svg += rrect(PAD, yy, wideW, ROW_H, 14, C.keyDark);
  svg += `<g stroke="${C.keyText}" stroke-width="5" stroke-linejoin="round" fill="none">
    <path d="M ${PAD+wideW/2} ${yy+ROW_H/2-26} L ${PAD+wideW/2-26} ${yy+ROW_H/2+4} L ${PAD+wideW/2-12} ${yy+ROW_H/2+4} L ${PAD+wideW/2-12} ${yy+ROW_H/2+24} L ${PAD+wideW/2+12} ${yy+ROW_H/2+24} L ${PAD+wideW/2+12} ${yy+ROW_H/2+4} L ${PAD+wideW/2+26} ${yy+ROW_H/2+4} Z"/>
  </g>`;
  // lettres
  const letters = ['w','x','c','v','b','n'];
  let lx = PAD + wideW + GAP;
  for (const l of letters) {
    svg += rrect(lx, yy, kw, ROW_H, 14, C.key);
    svg += text(lx + kw / 2, yy + ROW_H / 2, l, 44, C.keyText);
    lx += kw + GAP;
  }
  // backspace
  const delX = W - PAD - wideW;
  svg += rrect(delX, yy, wideW, ROW_H, 14, C.keyDark);
  const dcx = delX + wideW / 2, dcy = yy + ROW_H / 2;
  svg += `<g stroke="${C.keyText}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none">
    <path d="M ${dcx-30} ${dcy} L ${dcx-12} ${dcy-22} L ${dcx+30} ${dcy-22} L ${dcx+30} ${dcy+22} L ${dcx-12} ${dcy+22} Z"/>
    <line x1="${dcx-2}" y1="${dcy-10}" x2="${dcx+18}" y2="${dcy+10}"/>
    <line x1="${dcx+18}" y1="${dcy-10}" x2="${dcx-2}" y2="${dcy+10}"/>
  </g>`;
})();

// rangée bas : !#1, virgule, espace (Français FR), point, entrée
(function () {
  const yy = bottomY;
  const n = 10;
  const usable = W - 2 * PAD - (n - 1) * GAP;
  const kw = usable / n;
  const sideW = kw * 1.5 + GAP * 0.5;
  let cx = PAD;
  // !#1
  svg += rrect(cx, yy, sideW, ROW_H, 14, C.keyDark);
  svg += text(cx + sideW / 2, yy + ROW_H / 2, '!#1', 36, C.keyText); cx += sideW + GAP;
  // virgule
  svg += rrect(cx, yy, kw, ROW_H, 14, C.keyDark);
  svg += text(cx + kw / 2, yy + ROW_H / 2, ',', 44, C.keyText, { weight: '600' }); cx += kw + GAP;
  // espace
  const enterW = sideW;
  const pointW = kw;
  const spaceW = W - PAD - enterW - GAP - pointW - GAP - cx;
  svg += rrect(cx, yy, spaceW, ROW_H, 14, C.key);
  svg += text(cx + spaceW / 2, yy + ROW_H / 2, 'Français (FR)', 34, C.keySub); cx += spaceW + GAP;
  // point
  svg += rrect(cx, yy, pointW, ROW_H, 14, C.keyDark);
  svg += text(cx + pointW / 2, yy + ROW_H / 2, '.', 44, C.keyText, { weight: '600' }); cx += pointW + GAP;
  // entrée
  svg += rrect(cx, yy, enterW, ROW_H, 14, C.keyDark);
  const ecx = cx + enterW / 2, ecy = yy + ROW_H / 2;
  svg += `<g stroke="${C.keyText}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M ${ecx+24} ${ecy-20} L ${ecx+24} ${ecy+6} L ${ecx-24} ${ecy+6}"/>
    <path d="M ${ecx-24} ${ecy+6} L ${ecx-6} ${ecy-12} M ${ecx-24} ${ecy+6} L ${ecx-6} ${ecy+24}"/>
  </g>`;
})();

const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`;

const out = path.join('/home/michel/github/aicorrect', 'mockup_keyboard.png');
sharp(Buffer.from(full)).png().toFile(out)
  .then(() => console.log('OK ->', out))
  .catch(e => { console.error(e); process.exit(1); });
