// Floor shape shared by the factory and warehouse pages.
// A floor is a union of axis-aligned rectangles [x0, z0, x1, z1] in the page's floor coordinates. That keeps the
// shapes a plant really has (rectangle, L, T, U, an annex) easy to edit, and the outline exact.
// Presentation only: nothing here is read from or written to the ERP.
import * as THREE from 'three';

export const SNAP = 0.5, MIN_SIZE = 4;
const snap = (v) => Math.round(v / SNAP) * SNAP;

/** Cells of the grid spanned by the rectangle edges, with whether each one is floor. */
function grid(rects) {
  const xs = [...new Set(rects.flatMap((r) => [r[0], r[2]]))].sort((a, b) => a - b);
  const zs = [...new Set(rects.flatMap((r) => [r[1], r[3]]))].sort((a, b) => a - b);
  const inside = xs.slice(0, -1).map((x, i) => zs.slice(0, -1).map((z, j) => {
    const cx = (x + xs[i + 1]) / 2, cz = (z + zs[j + 1]) / 2;
    return rects.some((r) => cx > r[0] && cx < r[2] && cz > r[1] && cz < r[3]);
  }));
  return { xs, zs, inside };
}

export function bounds(rects) {
  return rects.reduce((b, r) => [Math.min(b[0], r[0]), Math.min(b[1], r[1]), Math.max(b[2], r[2]), Math.max(b[3], r[3])], [Infinity, Infinity, -Infinity, -Infinity]);
}
export const contains = (rects, x, z) => rects.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
export const area = (rects) => { const { xs, zs, inside } = grid(rects); let a = 0; inside.forEach((col, i) => col.forEach((f, j) => { if (f) a += (xs[i + 1] - xs[i]) * (zs[j + 1] - zs[j]); })); return a; };

/** Outline of the union as merged segments; `out` is the outward normal: [-1,0] left, [1,0] right, [0,-1] back, [0,1] front. */
export function outline(rects) {
  const { xs, zs, inside } = grid(rects), raw = [];
  const at = (i, j) => i >= 0 && j >= 0 && i < inside.length && j < inside[0].length && inside[i][j];
  inside.forEach((col, i) => col.forEach((f, j) => {
    if (!f) return;
    if (!at(i - 1, j)) raw.push({ out: [-1, 0], fixed: xs[i], from: zs[j], to: zs[j + 1] });
    if (!at(i + 1, j)) raw.push({ out: [1, 0], fixed: xs[i + 1], from: zs[j], to: zs[j + 1] });
    if (!at(i, j - 1)) raw.push({ out: [0, -1], fixed: zs[j], from: xs[i], to: xs[i + 1] });
    if (!at(i, j + 1)) raw.push({ out: [0, 1], fixed: zs[j + 1], from: xs[i], to: xs[i + 1] });
  }));
  const groups = new Map();
  for (const s of raw) { const k = s.out.join() + '|' + s.fixed; (groups.get(k) ?? groups.set(k, []).get(k)).push(s); }
  const merged = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.from - b.from);
    let cur = { ...list[0] };
    for (const s of list.slice(1)) { if (Math.abs(s.from - cur.to) < 1e-6) cur.to = s.to; else { merged.push(cur); cur = { ...s }; } }
    merged.push(cur);
  }
  return merged.map((s) => {
    const alongX = s.out[0] === 0;
    const a = alongX ? [s.from, s.fixed] : [s.fixed, s.from], b = alongX ? [s.to, s.fixed] : [s.fixed, s.to];
    return { a, b, out: s.out, length: s.to - s.from, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], alongX };
  });
}

/** The floor slab: a top surface with world-scaled texture coordinates (seamless across sections) and side faces. */
export function floorMesh(rects, { y, thickness = 0.24, top, side, uvScale = 8 }) {
  const { xs, zs, inside } = grid(rects), pos = [], uv = [], idx = [];
  inside.forEach((col, i) => col.forEach((f, j) => {
    if (!f) return;
    const n = pos.length / 3, x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
    pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
    uv.push(x0 / uvScale, -z0 / uvScale, x1 / uvScale, -z0 / uvScale, x1 / uvScale, -z1 / uvScale, x0 / uvScale, -z1 / uvScale);
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2);
  }));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const group = new THREE.Group(), surface = new THREE.Mesh(g, top); surface.receiveShadow = true; group.add(surface);
  const sp = [], si = [];
  for (const s of outline(rects)) {
    const n = sp.length / 3, [ax, az] = s.a, [bx, bz] = s.b, lo = y - thickness;
    sp.push(ax, lo, az, bx, lo, bz, bx, y, bz, ax, y, az);
    const facesOut = s.out[0] + s.out[1] > 0;   // keep the winding facing outward
    si.push(...(facesOut === s.alongX ? [n, n + 1, n + 2, n, n + 2, n + 3] : [n, n + 2, n + 1, n, n + 3, n + 2]));
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setIndex(si); sg.computeVertexNormals();
  group.add(new THREE.Mesh(sg, side));
  return group;
}

/**
 * Edits the rectangles in place: drag a section to move it, drag a corner or edge handle to resize it.
 * Pointer handling runs in the capture phase so a drag on the floor shape never orbits the camera.
 */
export class FloorEditor {
  constructor({ parent, camera, canvas, controls, y, onChange, onSelect }) {
    Object.assign(this, { parent, camera, canvas, controls, y, onChange, onSelect });
    this.rects = []; this.selected = 0; this.enabled = false; this.drag = null;
    this.layer = new THREE.Group(); this.layer.visible = false; parent.add(this.layer);
    this.ray = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    this.fill = new THREE.MeshBasicMaterial({ color: 0xffa23d, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
    this.fillOn = new THREE.MeshBasicMaterial({ color: 0xffa23d, transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide });
    this.line = new THREE.LineBasicMaterial({ color: new THREE.Color(0xffa23d).multiplyScalar(2.2) });
    this.knob = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd29a).multiplyScalar(1.6) });
    addEventListener('pointerdown', (e) => this.down(e), { capture: true });
    addEventListener('pointermove', (e) => this.move(e), { capture: true });
    addEventListener('pointerup', () => this.up(), { capture: true });
  }
  setRects(rects) { this.rects = rects.map((r) => [...r]); this.selected = Math.min(this.selected, this.rects.length - 1); this.draw(); }
  enable(on) { this.enabled = on; this.layer.visible = on; if (on) this.draw(); }
  draw() {
    for (const c of [...this.layer.children]) { this.layer.remove(c); c.geometry?.dispose(); }
    const y = this.y + 0.06;
    this.rects.forEach((r, k) => {
      const [x0, z0, x1, z1] = r, on = k === this.selected;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), on ? this.fillOn : this.fill);
      plane.rotation.x = -Math.PI / 2; plane.position.set((x0 + x1) / 2, y + k * 0.002, (z0 + z1) / 2); plane.userData.floor = { k, part: 'body' }; plane.renderOrder = 5; this.layer.add(plane);
      const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => new THREE.Vector3(x, y + 0.01, z))), this.line);
      edge.raycast = () => {}; this.layer.add(edge);
      if (!on) return;
      const size = Math.max(0.7, Math.min(x1 - x0, z1 - z0) * 0.05);
      for (const [px, pz, part] of [[x0, z0, 'x0z0'], [x1, z0, 'x1z0'], [x1, z1, 'x1z1'], [x0, z1, 'x0z1'], [(x0 + x1) / 2, z0, 'z0'], [(x0 + x1) / 2, z1, 'z1'], [x0, (z0 + z1) / 2, 'x0'], [x1, (z0 + z1) / 2, 'x1']]) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(size, 0.5, size), this.knob); h.position.set(px, y + 0.25, pz); h.userData.floor = { k, part }; h.renderOrder = 6; this.layer.add(h);
      }
    });
  }
  aim(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.pointer, this.camera);
  }
  point(e) { this.aim(e); const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3()); return p && this.parent.worldToLocal(p); }
  down(e) {
    if (!this.enabled || e.button !== 0 || e.target !== this.canvas) return;
    this.aim(e);
    const hits = this.ray.intersectObjects(this.layer.children, false).filter((h) => h.object.userData.floor);
    const hit = hits.find((h) => h.object.userData.floor.part !== 'body') ?? hits.find((h) => h.object.userData.floor.k === this.selected) ?? hits[0];
    const p = hit && this.point(e); if (!p) return;
    const { k, part } = hit.object.userData.floor;
    if (k !== this.selected) { this.selected = k; this.draw(); this.onSelect?.(k); }
    this.drag = { k, part, start: p, from: [...this.rects[k]], moved: false, before: this.rects.map((r) => [...r]) };
    this.controls.enabled = false; e.stopPropagation();
  }
  move(e) {
    if (!this.drag) return;
    const p = this.point(e); if (!p) return;
    const d = this.drag, dx = p.x - d.start.x, dz = p.z - d.start.z, [x0, z0, x1, z1] = d.from;
    let r;
    if (d.part === 'body') r = [snap(x0 + dx), snap(z0 + dz), snap(x0 + dx) + (x1 - x0), snap(z0 + dz) + (z1 - z0)];
    else {
      r = [...d.from];
      if (d.part.includes('x0')) r[0] = Math.min(snap(x0 + dx), x1 - MIN_SIZE);
      if (d.part.includes('x1')) r[2] = Math.max(snap(x1 + dx), x0 + MIN_SIZE);
      if (d.part.includes('z0')) r[1] = Math.min(snap(z0 + dz), z1 - MIN_SIZE);
      if (d.part.includes('z1')) r[3] = Math.max(snap(z1 + dz), z0 + MIN_SIZE);
    }
    if (r.every((v, i) => v === this.rects[d.k][i])) return;
    d.moved = true; this.rects[d.k] = r; this.draw(); this.onChange?.(this.rects, false);
  }
  up() {
    if (!this.drag) return;
    const d = this.drag; this.drag = null; this.controls.enabled = true;
    if (d.moved) this.onChange?.(this.rects, true, d.before);
  }
  add() {
    const b = bounds(this.rects), r = this.rects[this.selected] ?? b, w = Math.max(MIN_SIZE * 3, Math.round((r[2] - r[0]) / 3)), d = Math.max(MIN_SIZE * 3, Math.round((r[3] - r[1]) / 2));
    // A new section starts as an annex to the right of the selected one, aligned with its back edge.
    this.rects.push([r[2], r[1], r[2] + w, r[1] + d]); this.selected = this.rects.length - 1; this.draw();
  }
  remove() { if (this.rects.length < 2) return false; this.rects.splice(this.selected, 1); this.selected = 0; this.draw(); return true; }
}
