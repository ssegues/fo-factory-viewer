// Product icons drawn as labels on crates and boxes. Shared by the factory and warehouse pages.
// Pictograms are drawn on a canvas at run time: no image files, nothing fetched. Presentation only.
import * as THREE from 'three';
export { ICON_NAMES, iconResolver, iconFromName } from './icon-rules.js';

const S = 128;
// Each pictogram draws in a 128 × 128 box with the label's ink colour already set as stroke and fill.
const DRAW = {
  speaker(g) { ring(g, 64, 64, 36); ring(g, 64, 64, 19); dot(g, 64, 64, 7); },
  cable(g) {
    g.beginPath(); g.moveTo(34, 92); g.bezierCurveTo(34, 50, 94, 78, 94, 36); g.stroke();
    g.fillRect(24, 90, 20, 18); g.fillRect(84, 20, 20, 18);
    line(g, 29, 108, 29, 116); line(g, 39, 108, 39, 116); line(g, 89, 20, 89, 12); line(g, 99, 20, 99, 12);
  },
  board(g) {
    g.strokeRect(36, 36, 56, 56); g.fillRect(52, 52, 24, 24);
    for (const p of [46, 64, 82]) { line(g, p, 36, p, 22); line(g, p, 92, p, 106); line(g, 36, p, 22, p); line(g, 92, p, 106, p); }
  },
  magnet(g) {
    g.lineWidth = 16; g.lineCap = 'butt'; g.beginPath(); g.moveTo(40, 34); g.lineTo(40, 66); g.arc(64, 66, 24, Math.PI, 0, true); g.lineTo(88, 34); g.stroke();
    g.lineWidth = 9; g.fillRect(31, 22, 18, 12); g.fillRect(79, 22, 18, 12);
  },
  coil(g) { line(g, 18, 64, 30, 64); line(g, 98, 64, 110, 64); for (let x = 36; x <= 92; x += 14) { g.beginPath(); g.ellipse(x, 64, 8, 26, 0, 0, Math.PI * 2); g.stroke(); } },
  laser(g) {
    g.fillRect(16, 52, 30, 24); line(g, 46, 64, 82, 64);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; line(g, 94 + Math.cos(a) * 8, 64 + Math.sin(a) * 8, 94 + Math.cos(a) * 18, 64 + Math.sin(a) * 18); }
  },
  screen(g) { g.strokeRect(20, 28, 88, 56); line(g, 64, 84, 64, 100); line(g, 44, 102, 84, 102); },
  foam(g) { for (const y of [40, 64, 88]) { g.beginPath(); for (let x = 20; x <= 108; x += 2) g[x === 20 ? 'moveTo' : 'lineTo'](x, y + Math.sin((x - 20) / 7) * 6); g.stroke(); } },
  casing(g) { g.strokeRect(32, 20, 64, 88); line(g, 32, 46, 96, 46); for (const [x, y] of [[42, 30], [86, 30], [42, 98], [86, 98]]) dot(g, x, y, 4); ring(g, 64, 76, 14); },
  metal(g) { g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; g[k ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * 40, 64 + Math.sin(a) * 40); } g.stroke(); ring(g, 64, 64, 17); },
  packaging(g) {
    g.beginPath(); g.moveTo(64, 18); g.lineTo(104, 38); g.lineTo(104, 88); g.lineTo(64, 108); g.lineTo(24, 88); g.lineTo(24, 38); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(24, 38); g.lineTo(64, 58); g.lineTo(104, 38); g.moveTo(64, 58); g.lineTo(64, 108); g.stroke(); line(g, 44, 28, 84, 48);
  },
  liquid(g) { g.beginPath(); g.moveTo(64, 16); g.bezierCurveTo(78, 42, 96, 58, 96, 78); g.arc(64, 78, 32, 0, Math.PI); g.bezierCurveTo(32, 58, 50, 42, 64, 16); g.closePath(); g.stroke(); g.beginPath(); g.arc(64, 80, 18, Math.PI * 0.55, Math.PI * 0.95); g.stroke(); },
  kit(g) { for (const [x, y] of [[22, 22], [68, 22], [22, 68], [68, 68]]) g.strokeRect(x, y, 38, 38); dot(g, 41, 41, 8); dot(g, 87, 87, 8); },
};
function line(g, x0, y0, x1, y1) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function ring(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

const cache = new Map();
/** A label with the pictogram: a pale sticker in the middle of a transparent face. */
export function iconTexture(icon) {
  if (!DRAW[icon]) return null;
  if (cache.has(icon)) return cache.get(icon);
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#efe7ff'; g.beginPath(); g.roundRect(24, 24, S - 48, S - 48, 10); g.fill();
  g.save(); g.translate(S / 2, S / 2); g.scale(0.56, 0.56); g.translate(-S / 2, -S / 2);
  g.strokeStyle = g.fillStyle = '#2a1846'; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
  DRAW[icon](g); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; cache.set(icon, t); return t;
}

const materials = new Map();
function iconMaterial(icon) {
  if (!materials.has(icon)) materials.set(icon, new THREE.MeshBasicMaterial({ map: iconTexture(icon), transparent: true, alphaTest: 0.1, toneMapped: false }));
  return materials.get(icon);
}
const unit = new THREE.BoxGeometry(1, 1, 1);
/** A box just larger than the crate, carrying the label on every face. Scale it to the crate; hidden for a plain box. */
export function iconDecal() { const m = new THREE.Mesh(unit, iconMaterial('speaker')); m.raycast = () => {}; m.visible = false; m.userData.iconDecal = true; return m; }
export function setIcon(decal, icon) {
  if (!icon || !DRAW[icon]) { decal.visible = false; decal.userData.icon = null; return; }
  decal.material = iconMaterial(icon); decal.visible = true; decal.userData.icon = icon;
}
