'use strict';
// ============================================================================
// Rendering: pixel terrain, political overlay, routes, ships, armies, and the
// city construction scene.
// ============================================================================
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (rgb, k) => rgb.map((v) => clamp(Math.round(v * k), 0, 255));
const rgbs = (a) => 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')';
let terrC, polC, colC, SPARK = [];
const TCOL = { 1: ['#8ea45a', '#97ad62'], 2: ['#b4a968', '#bdb06e'], 3: ['#4b6e3b', '#557a42'], 4: ['#8d8a5a', '#9a9563'], 5: ['#786e61', '#958a7a'], 6: ['#d8c38a', '#d0b97c'], 7: ['#a9ab6a', '#b2b36f'], 8: ['#5f9a4a', '#6aa652'] };

function buildTerrainCanvas() {
  terrC = document.createElement('canvas'); terrC.width = W; terrC.height = H;
  const ctx = terrC.getContext('2d'), im = ctx.createImageData(W, H), d = im.data;
  const elev = (i) => (terr[i] === T.MTN ? 2 : terr[i] === T.HILLS ? 1 : 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, h = hash2(x, y), [lon, lat] = cellLL(x, y); let c;
    if (!land[i]) {
      const cd = coastD[i]; c = hex(cd <= 1 ? '#3f7f9c' : cd === 2 ? '#35718f' : cd <= 4 ? '#2c6282' : cd <= 8 ? '#255470' : '#1f4763');
      if (((x + y) & 1) && cd > 2 && cd < 9 && h > 0.5) c = shade(c, 1.04);
      if (cd > 1 && cd < 6 && Math.random() < 0.02) SPARK.push(i);
    } else {
      const t = terr[i], pal = TCOL[t]; c = hex(pal[h > 0.55 ? 1 : 0]);
      if (t === T.MTN) { const n = vnoise(x / 2, y / 2); c = hex(n > 0.55 ? '#a19684' : n < 0.35 ? '#675e52' : '#7c7264'); if (lat > 43 && n > 0.72) c = hex('#e3e0d6'); }
      if (t === T.FOREST && h > 0.8) c = hex('#3e5e33');
      if (coastD[i] === 1 && lat < 46 && (t === T.PLAIN || t === T.DRY || t === T.DESERT) && h > 0.3) c = hex('#cdbd8a');
      if (river[i]) c = hex('#4a86ad');
      const ex = elev(i) - (x > 0 && y > 0 ? elev(i - W - 1) : 0); if (ex > 0) c = shade(c, 1.12); else if (ex < 0) c = shade(c, 0.86);
      if (lat > 52 && t !== T.MTN) c = shade(c, 0.94);
    }
    const o = i * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  polC = document.createElement('canvas'); polC.width = W; polC.height = H;
}
function buildPolitical() {
  const ctx = polC.getContext('2d'), im = ctx.createImageData(W, H), d = im.data; const cols = {};
  for (const f of FIDS) cols[f] = hex(FAC[f].col);
  for (let i = 0; i < N; i++) {
    const cid = cellCity[i]; if (cid < 0) continue; const c = G.cities[cid], f = c.owner; if (!f) continue; const x = i % W, y = (i / W) | 0;
    let border = false, prov = false;
    for (const [dx, dy] of NB4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!land[j]) continue; const o = cellCity[j]; if (o < 0 || G.cities[o].owner !== f) border = true; else if (o !== cid) prov = true; }
    const col = cols[f], o = i * 4, mine = f === G.player;
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = border ? 235 : prov ? 135 : mine ? 125 : 100;
    if (border) { d[o] = col[0] * 0.8; d[o + 1] = col[1] * 0.8; d[o + 2] = col[2] * 0.8; }
  }
  ctx.putImageData(im, 0, 0);
}
let relC = null;
function buildRelations(f) {
  if (!relC) { relC = document.createElement('canvas'); relC.width = W; relC.height = H; }
  const ctx = relC.getContext('2d'), im = ctx.createImageData(W, H), d = im.data, col = {};
  for (const o of FIDS) col[o] = hex(o === f ? '#f2e6c8' : atWar(f, o) ? '#d0402a' : allied(f, o) ? '#5fb04a' : rights(f, o) ? '#d9b54a' : '#8a8a80');
  for (let i = 0; i < N; i++) {
    const cid = cellCity[i]; if (cid < 0) continue; const o = G.cities[cid].owner; if (!o) continue; const x = i % W, y = (i / W) | 0; let border = false;
    for (const [dx, dy] of NB4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!land[j]) continue; const q = cellCity[j]; if (q < 0 || G.cities[q].owner !== o) border = true; }
    const c = col[o], k = i * 4, neutral = o !== f && !atWar(f, o) && !allied(f, o) && !rights(f, o);
    d[k] = c[0] * (border ? 0.7 : 1); d[k + 1] = c[1] * (border ? 0.7 : 1); d[k + 2] = c[2] * (border ? 0.7 : 1); d[k + 3] = border ? 230 : o === f ? 170 : neutral ? 60 : 140;
  }
  ctx.putImageData(im, 0, 0); relC._f = f;
}
function onTerritory() { if (polC) buildPolitical(); if (relC && UI.mapMode === 'dip') buildRelations(relC._f || G.player); }
function buildColonyOverlay(origin) {
  colC = document.createElement('canvas'); colC.width = W; colC.height = H; const ctx = colC.getContext('2d'), im = ctx.createImageData(W, H), d = im.data;
  const f = origin.port ? colonyField(origin) : null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!land[i] || cellCity[i] >= 0 || terr[i] === T.MTN) continue; let ok = false;
    if (f) for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (!land[j] && f[j] < 65535) { ok = true; break; } }
    if (!ok && landComp[i] === origin.lc && Math.hypot(origin.x - x, origin.y - y) <= 26) ok = true;
    if (!ok) continue; if (G.cities.some((c) => c.owner && Math.abs(c.x - x) < 5 && Math.abs(c.y - y) < 5 && Math.hypot(c.x - x, c.y - y) < 5)) continue;
    const o = i * 4; d[o] = 120; d[o + 1] = 230; d[o + 2] = 140; d[o + 3] = (x + y) & 1 ? 150 : 90;
  }
  ctx.putImageData(im, 0, 0);
}

// ---- camera -------------------------------------------------------------------
const cam = { x: W * 0.52, y: H * 0.62, z: 3 };
let VW = 800, VH = 600, DPR = 1;
const ZOOMS = [2, 3, 4, 5, 6, 8, 10, 12, 16];
const w2s = (x, y) => [VW / 2 + (x - cam.x) * cam.z, VH / 2 + (y - cam.y) * cam.z];
const s2w = (sx, sy) => [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y];
function clampCam() { cam.x = clamp(cam.x, VW / 2 / cam.z - 20, W - VW / 2 / cam.z + 20); cam.y = clamp(cam.y, VH / 2 / cam.z - 20, H - VH / 2 / cam.z + 20); if (W * cam.z < VW) cam.x = W / 2; if (H * cam.z < VH) cam.y = H / 2; }

const LEN_CACHE = new WeakMap();
function pointAt(path, frac) {
  let L = LEN_CACHE.get(path); if (!L) { L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])); LEN_CACHE.set(path, L); }
  const tot = L[L.length - 1], target = clamp(frac, 0, 1) * tot; let i = 1; while (i < L.length - 1 && L[i] < target) i++;
  const seg = L[i] - L[i - 1] || 1, k = (target - L[i - 1]) / seg; const a = path[i - 1], b = path[i] || a;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[0] - a[0]];
}
function creep(ts) { const dt = (performance.now() - (ts || 0)) / 1000; return 0.85 * (1 - Math.exp(-dt / 14)); }

// ---- map drawing --------------------------------------------------------------
function visibleRoutes() {
  if (!G) return []; const mode = UI.mapMode, sel = UI.sel, p = G.player;
  if (mode === 'trade') return G.routes;
  return G.routes.filter((r) => { const a = C(r.a), b = C(r.b); if (a.owner === p || b.owner === p) return true; if (sel && sel.type === 'city' && (r.a === sel.id || r.b === sel.id)) return true; if (sel && sel.type === 'route' && sel.id === r.id) return true; return false; });
}
function mainGood(r) { let best = null, bv = 0; for (const f of r.flows || []) if (f.v > bv) { bv = f.v; best = f.g; } return best; }

function drawMap(t) {
  const ctx = MAPCTX; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#1b3f59'; ctx.fillRect(0, 0, VW, VH);
  const z = cam.z, [ox, oy] = w2s(0, 0);
  ctx.drawImage(terrC, ox, oy, W * z, H * z);
  // glinting water
  ctx.fillStyle = 'rgba(190,225,240,0.55)'; const pz = Math.max(1, Math.floor(z / 2));
  for (let k = 0; k < SPARK.length; k++) { const i = SPARK[k], ph = hash2(i, 7) * 50 + t * 0.0009; if ((ph % 6) > 0.35) continue; const [sx, sy] = w2s(i % W, (i / W) | 0); if (sx < -10 || sy < -10 || sx > VW + 10 || sy > VH + 10) continue; ctx.fillRect(Math.round(sx), Math.round(sy), pz * 2, pz); }
  if (!G) return;
  if (UI.mapMode === 'dip' && relC) ctx.drawImage(relC, ox, oy, W * z, H * z);
  else if (UI.mapMode !== 'terrain') { ctx.globalAlpha = UI.mapMode === 'trade' ? 0.45 : 1; ctx.drawImage(polC, ox, oy, W * z, H * z); ctx.globalAlpha = 1; }
  if (UI.mode && UI.mode.type === 'colony' && colC) { ctx.globalAlpha = 0.6 + 0.25 * Math.sin(t / 300); ctx.drawImage(colC, ox, oy, W * z, H * z); ctx.globalAlpha = 1; }
  const u = Math.max(1, Math.round(z / 3));
  // routes
  const vr = visibleRoutes(), selR = UI.sel && UI.sel.type === 'route' ? UI.sel.id : -1, selC = UI.sel && UI.sel.type === 'city' ? UI.sel.id : -1;
  UI._drawnRoutes = vr;
  for (const r of vr) {
    const a = C(r.a), b = C(r.b), path = pathBetween(a, b, r.k), g = mainGood(r), col = g ? GD[g].c : '#cbbd96';
    const hi = r.id === selR || r.a === selC || r.b === selC, mine = a.owner === G.player || b.owner === G.player;
    ctx.globalAlpha = hi ? 1 : selC >= 0 ? 0.18 : UI.mapMode === 'trade' ? (mine ? 0.9 : 0.55) : 0.75;
    ctx.lineWidth = Math.max(1, z / (hi ? 2.2 : 4)); ctx.strokeStyle = r.id === selR ? '#fff4c8' : col;
    ctx.setLineDash(r.k === 'sea' ? [Math.max(2, z), Math.max(2, z)] : [Math.max(1, z / 2), Math.max(2, z)]); ctx.lineDashOffset = -t / 60;
    ctx.beginPath(); path.forEach((p, i) => { const [sx, sy] = w2s(p[0], p[1]); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (r.flows && r.flows.length && z >= 3) {
      const n = r.k === 'sea' ? 1 + (r.val > 25 ? 1 : 0) : 1;
      for (let k = 0; k < n; k++) {
        const ph = ((t / (9000 + r.d * 60) + r.id * 0.37 + k * 0.5) % 2), fr = ph < 1 ? ph : 2 - ph, [x, y, dx] = pointAt(path, fr), [sx, sy] = w2s(x, y);
        const dir = ph < 1 ? 1 : -1; const f0 = r.flows.find((f) => f.dir === (ph < 1 ? 0 : 1)) || r.flows[0];
        if (r.k === 'sea') drawBoat(ctx, sx, sy, u, dx * dir >= 0, FAC[(ph < 1 ? a : b).owner].col, GD[f0.g].c, t + r.id * 100);
        else drawCart(ctx, sx, sy, u, GD[f0.g].c, dx * dir >= 0);
      }
    }
  }
  // colony fleets
  for (const fl of G.fleets) {
    const fr = (fl.done + creep(fl.ts)) / fl.turns, [x, y, dx] = pointAt(fl.path, fr), [sx, sy] = w2s(x, y);
    if (fl.k === 'sea') { drawBoat(ctx, sx - 2 * u, sy, u, dx >= 0, FAC[fl.f].col, '#9fe0a0', t); drawBoat(ctx, sx + 3 * u, sy + 2 * u, u, dx >= 0, FAC[fl.f].col, '#9fe0a0', t + 400); }
    else drawCart(ctx, sx, sy, u, '#9fe0a0', dx >= 0);
    const [tx, ty] = w2s(fl.x + 0.5, fl.y + 0.5); ctx.strokeStyle = 'rgba(159,224,160,0.8)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeRect(tx - 3 * u, ty - 3 * u, 6 * u, 6 * u); ctx.setLineDash([]);
    if (z >= 4) label(ctx, fl.name + ' (colonists)', sx, sy - 6 * u, '#bff0bf', 11);
  }
  // cities
  for (const c of G.cities) {
    if (!c.owner) continue; const [sx, sy] = w2s(c.x + 0.5, c.y + 0.5); if (sx < -60 || sy < -60 || sx > VW + 60 || sy > VH + 60) continue;
    drawCityIcon(ctx, c, Math.round(sx), Math.round(sy), u, t);
    const partner = selC >= 0 && G.routes.some((r) => (r.a === selC && r.b === c.id) || (r.b === selC && r.a === c.id));
    const showName = partner || z >= 8 || (z >= 6 && c.pop >= 3) || (z >= 3 && (c.capital || c.pop >= 9 || c.owner === G.player)) || c.id === selC || (UI.hover && UI.hover.type === 'city' && UI.hover.id === c.id);
    if (showName) label(ctx, c.name, sx, sy + 5 * u + 6, c.owner === G.player ? '#fff1c4' : '#f1e8d2', c.capital ? 12 : 11, c.capital);
    if (UI.mapMode === 'goods' && z >= 3) {
      const top = Object.entries(c.P || {}).sort((p, q) => q[1] * price(q[0]) - p[1] * price(p[0])).slice(0, 3);
      top.forEach(([g], k) => { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(sx - 9 * u + k * 6 * u - 1, sy - 11 * u - 1, 5 * u + 2, 5 * u + 2); ctx.fillStyle = GD[g].c; ctx.fillRect(sx - 9 * u + k * 6 * u, sy - 11 * u, 5 * u, 5 * u); });
    }
  }
  // armies
  for (const a of G.armies) {
    let x, y;
    if (a.mv) { const f = C(a.mv.from), to = C(a.mv.to), path = pathBetween(f, to, a.mv.k); const [px, py] = pointAt(path, (a.mv.done + creep(a.mv.ts)) / a.mv.turns); [x, y] = w2s(px, py); }
    else if (a.at != null) { const c = C(a.at); [x, y] = w2s(c.x + 0.5, c.y + 0.5); x += 6 * u; y -= 2 * u; } else continue;
    drawBanner(ctx, x, y, u, a, t);
  }
  // recent battlefields
  for (const b of G.battles || []) {
    if (b.turn < G.turn - 2) continue; const [bx, by] = w2s(b.x + 0.5, b.y + 0.5), x = Math.round(bx - 9 * u), y = Math.round(by - 9 * u), fl = Math.sin(t / 250) > 0;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 3 * u, y - 3 * u, 7 * u, 7 * u);
    for (let k = -2; k <= 2; k++) { ctx.fillStyle = fl ? '#ffe08a' : '#e8e0c8'; ctx.fillRect(x + k * u, y + k * u, u, u); ctx.fillRect(x - k * u, y + k * u, u, u); }
    ctx.fillStyle = FAC[b.sides[b.winner].f].col; ctx.fillRect(x - 3 * u, y + 3 * u, 7 * u, u);
  }
  // highlight the player's forces while the armies list is open
  if (UI.sel && (UI.sel.type === 'armies' || UI.sel.type === 'army')) for (const a of G.armies) {
    if (a.f !== G.player || (UI.sel.type === 'army' && UI.sel.id !== a.id)) continue; let x, y;
    if (a.mv) { const f = C(a.mv.from), to = C(a.mv.to), pp = pointAt(pathBetween(f, to, a.mv.k), (a.mv.done + creep(a.mv.ts)) / a.mv.turns); [x, y] = w2s(pp[0], pp[1]); } else { const c = C(a.at); [x, y] = w2s(c.x + 0.5, c.y + 0.5); x += 6 * u; y -= 2 * u; }
    ctx.strokeStyle = 'rgba(255,224,138,' + (0.55 + 0.45 * Math.sin(t / 220)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 3 * u, y - 5 * u, 7 * u + 3, 0, 7); ctx.stroke();
    if (a.mv) { const to = C(a.mv.to), [tx, ty] = w2s(to.x + 0.5, to.y + 0.5); ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t / 60; ctx.strokeStyle = a.mv.order === 'move' ? 'rgba(159,208,255,0.8)' : 'rgba(255,110,80,0.85)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
  }
  // mode targets
  if (UI.mode && (UI.mode.type === 'march' || UI.mode.type === 'route')) {
    for (const id of UI.mode.targets || []) { const c = C(id), [sx, sy] = w2s(c.x + 0.5, c.y + 0.5); ctx.strokeStyle = UI.mode.type === 'march' ? (UI.mode.order === 'move' ? '#9fd0ff' : '#ff8a6a') : '#ffe08a'; ctx.lineWidth = 2; const r = 7 * u + 3 + Math.sin(t / 200) * 2; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.stroke(); }
  }
  if (UI.sel && UI.sel.type === 'land') { const [sx, sy] = w2s(UI.sel.x + 0.5, UI.sel.y + 0.5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(sx - 4 * u, sy - 4 * u, 8 * u, 8 * u); }
  if (selC >= 0) { const c = C(selC), [sx, sy] = w2s(c.x + 0.5, c.y + 0.5); ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.lineDashOffset = t / 80; ctx.beginPath(); ctx.arc(sx, sy, 9 * u + 4, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
}
function label(ctx, s, x, y, col, size, bold) {
  ctx.font = (bold ? '600 ' : '') + size + 'px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,18,22,0.85)'; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function drawBoat(ctx, x, y, u, right, col, cargo, t) {
  x = Math.round(x); y = Math.round(y + Math.sin(t / 400) * u * 0.5); const s = right ? 1 : -1;
  ctx.fillStyle = '#2b1e14'; ctx.fillRect(x - 3 * u, y, 6 * u, u); ctx.fillRect(x - 2 * u, y + u, 4 * u, u);
  ctx.fillRect(x + s * 3 * u - (s < 0 ? u : 0), y - u, u, u);
  ctx.fillStyle = '#efe6cf'; ctx.fillRect(x - u, y - 4 * u, 3 * u, 3 * u); ctx.fillStyle = col; ctx.fillRect(x - u, y - 3 * u, 3 * u, u);
  ctx.fillStyle = cargo; ctx.fillRect(x - 2 * u, y - u, 2 * u, u);
}
function drawCart(ctx, x, y, u, cargo, right) {
  x = Math.round(x); y = Math.round(y); const s = right ? 1 : -1;
  ctx.fillStyle = '#5a3a20'; ctx.fillRect(x - 2 * u, y - u, 4 * u, 2 * u); ctx.fillStyle = cargo; ctx.fillRect(x - 2 * u, y - 2 * u, 4 * u, u);
  ctx.fillStyle = '#b08a5a'; ctx.fillRect(x + s * 3 * u - (s < 0 ? 2 * u : 0), y - u, 2 * u, 2 * u); ctx.fillStyle = '#222'; ctx.fillRect(x - 2 * u, y + u, u, u); ctx.fillRect(x + u, y + u, u, u);
}
function drawBanner(ctx, x, y, u, a, t) {
  x = Math.round(x); y = Math.round(y); const col = FAC[a.f].col;
  ctx.fillStyle = '#20160e'; ctx.fillRect(x, y - 9 * u, u, 10 * u);
  const wave = Math.sin(t / 250 + a.id) > 0 ? u : 0;
  ctx.fillStyle = '#0d0d0d'; ctx.fillRect(x + u - 1, y - 9 * u - 1, 5 * u + 2, 4 * u + 2);
  ctx.fillStyle = col; ctx.fillRect(x + u, y - 9 * u, 5 * u, 4 * u - wave); ctx.fillRect(x + u, y - 9 * u, 3 * u, 4 * u);
  if (FAC[a.f].cul === 'roman') { ctx.fillStyle = '#f2c83c'; ctx.fillRect(x - u, y - 11 * u, 3 * u, u); ctx.fillRect(x, y - 12 * u, u, u); }
  if (cam.z >= 4) { ctx.font = '600 10px "VT323", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0d0d0d'; ctx.fillRect(x + 7 * u - 1, y - 8 * u - 5, 16, 11); ctx.fillStyle = '#fff'; ctx.fillText(Math.round(a.str), x + 7 * u + 1, y - 8 * u); }
  if (a.mv && a.mv.order !== 'move') { ctx.fillStyle = a.mv.order === 'raid' ? '#ffb040' : '#ff5a3a'; ctx.fillRect(x + u, y - 4 * u, u, u); }
}
function drawCityIcon(ctx, c, x, y, u, t) {
  const P = CULT[c.culture].pal, st = CULT[c.culture].st, tier = c.pop < 3 ? 0 : c.pop < 8 ? 1 : c.pop < 18 ? 2 : 3, col = FAC[c.owner].col, b = c.b;
  const R = (dx, dy, w, h, cc) => { ctx.fillStyle = cc; ctx.fillRect(x + dx * u, y + dy * u, w * u, h * u); };
  const wooden = st === 'long' || st === 'yurt' || st === 'hut';
  if (cam.z >= 4) drawSurroundings(ctx, c, x, y, u, t, P);
  if (c.port && b.harbor) drawHarbor(ctx, c, x, y, u, t, P);
  if (b.road) { const rc = '#b8a47a'; for (let k = 0; k < b.road * 2; k++) { const a = k * (Math.PI / b.road) + 0.4; for (let s = 7; s < 12 + b.road * 2; s++) R(Math.round(Math.cos(a) * s), Math.round(Math.sin(a) * s * 0.7) + 1, 1, 1, rc); } }
  R(-6, 2, 12, 2, '#141414'); R(-5, 2, 10, 1, col);
  if (b.aqueduct) { const n = 3 + b.aqueduct * 3; R(-7 - n * 2, -4, n * 2, 1, P.stone); for (let k = 0; k < n; k++) R(-7 - n * 2 + k * 2, -3, 1, 2, P.stone); if (b.aqueduct > 1) R(-7 - n * 2, -5, n * 2, 1, P.stone); }
  const wl = b.walls || 0;
  if (wl) {
    const s = wooden && st !== 'hut' ? P.wood : P.stone, ww = 6 + (tier > 2 ? 1 : 0);
    R(-ww, -6, 2 * ww, 1, s); R(-ww, -6, 1, 8, s); R(ww - 1, -6, 1, 8, s);
    if (wl > 1) { R(-ww - 1, -7, 2, 2, s); R(ww - 1, -7, 2, 2, s); R(-ww - 1, 0, 2, 2, s); R(ww - 1, 0, 2, 2, s); }
    if (wl > 2) { R(-ww - 2, -9, 2 * ww + 4, 1, s); R(-ww - 2, -9, 1, 11, s); R(ww + 1, -9, 1, 11, s); R(-1, -9, 2, 1, '#2a1a10'); }
  }
  const spots = [[-3, -1], [1, -1], [-1, -3], [3, -3], [-4, -3], [0, -5], [2, 0], [-5, 0], [4, -1]].slice(0, 2 + tier + (tier > 2 ? 4 : tier > 1 ? 1 : 0));
  for (const [dx, dy] of spots) {
    if (st === 'hut' || st === 'yurt') { R(dx, dy, 3, 2, st === 'yurt' ? P.wall : P.wall2); R(dx, dy - 1, 3, 1, P.roof); R(dx + 1, dy - 2, 1, 1, P.roof); }
    else if (st === 'long') { R(dx - 1, dy, 4, 2, P.wall); R(dx - 1, dy - 1, 4, 1, P.roof); }
    else { R(dx, dy, 2, 2, P.wall); R(dx, dy - 1, 2, 1, st === 'punic' || st === 'egypt' ? P.roof2 : P.roof); }
  }
  if (b.granary) { R(3, -6, 2, 3 + b.granary, P.wall); R(3, -7, 2, 1, P.roof); }
  if (b.barracks) { R(-6, -4, 3, 2, P.wall2); R(-6, -5, 3, 1, P.roof2); R(-4, -8, 1, 3, '#2a1a10'); R(-3, -8, 2, 1, col); }
  if (b.market) for (let k = 0; k < b.market + 1; k++) R(-3 + k * 2, 1, 1, 1, k % 2 ? P.acc : '#f0e2b8');
  if (b.temple) {
    const L = b.temple, g = L > 2 ? '#f2c83c' : P.roof;
    if (st === 'classic') { const w = 3 + L * 2, x0 = -Math.floor(w / 2); R(x0, -8, w, 1, g); R(x0 + 1, -9, w - 2, 1, g); for (let k = 0; k < w; k += 2) R(x0 + k, -7, 1, 3, P.trim); if (L > 1) R(x0, -4, w, 1, P.stone); }
    else if (st === 'punic' || st === 'egypt') { R(-2, -8, 5, 4, P.wall); R(-1, -9, 3, 1, P.wall2); R(0, -6, 1, 2, '#3a2a1a'); if (L > 1) { R(-3, -9, 1, 5, P.stone); R(3, -9, 1, 5, P.stone); } if (L > 2) R(0, -10, 1, 1, '#f2c83c'); }
    else { R(-1, -8, 3, 3, P.wood); R(-2, -9, 5, 1, P.roof); if (L > 1) { R(-4, -6, 1, 2, P.wood); R(4, -6, 1, 2, P.wood); } if (L > 2) R(0, -10, 1, 1, '#f2c83c'); }
  }
  if (b.forge || b.workshop) { const ph = (t / 90) % 8; ctx.fillStyle = b.forge ? 'rgba(60,55,50,' + (0.8 - ph / 10) + ')' : 'rgba(225,225,225,' + (0.8 - ph / 10) + ')'; ctx.fillRect(x + 5 * u, y - (5 + ph) * u, u, u); }
  if (c.capital) { R(4, -11, 1, 5, '#2a1a10'); R(5, -11, 3, 2, col); }
  if (c.q.length) { const sw = Math.round(Math.sin(t / 300) * 1); R(-8, -10, 1, 9, P.wood); R(-8, -10, 5, 1, P.wood); R(-4 + sw, -9, 1, 3, '#d8d0b8'); R(-5 + sw, -6, 3, 1, P.stone); }
  if (c.flash && c.owner === G.player && performance.now() - c.flash.t < 4000) { const k = (performance.now() - c.flash.t) / 4000; ctx.strokeStyle = 'rgba(255,230,140,' + (1 - k) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 2 * u, (6 + k * 14) * u, 0, 7); ctx.stroke(); }
}
// Production buildings appear as fields, vines, groves, pastures, timber and mines around the town.
function drawSurroundings(ctx, c, x, y, u, t, P) {
  const items = [];
  for (const [bk, kind] of [['farm', 'farm'], ['vineyard', 'vine'], ['olive', 'olive'], ['pasture', 'past'], ['lumber', 'wood'], ['mine', 'mine']]) for (let k = 0; k < (c.b[bk] || 0); k++) items.push(kind);
  let slot = 0;
  for (const kind of items) {
    let px, py, ok = false;
    for (let tries = 0; tries < 6 && !ok; tries++, slot++) {
      const a = slot * 2.39996 + c.id * 1.7, r = 10 + 2.6 * Math.sqrt(slot + 1);
      px = x + Math.cos(a) * r * u; py = y + Math.sin(a) * r * u * 0.75;
      const [wx, wy] = s2w(px, py), i = Math.floor(wy) * W + Math.floor(wx); ok = wx >= 0 && wy >= 0 && wx < W && wy < H && land[i] === 1;
    }
    if (!ok) continue; slot++;
    const R = (dx, dy, w, h, cc) => { ctx.fillStyle = cc; ctx.fillRect(Math.round(px + dx * u), Math.round(py + dy * u), w * u, h * u); };
    if (kind === 'farm') { R(-2, -1, 5, 1, '#d9b54a'); R(-2, 0, 5, 1, '#b8913a'); R(-2, 1, 5, 1, '#d9b54a'); }
    else if (kind === 'vine') { for (let k = 0; k < 3; k++) { R(-2 + k * 2, -1, 1, 3, '#4f8a38'); R(-2 + k * 2, 0, 1, 1, '#6b2a5a'); } }
    else if (kind === 'olive') { R(-2, -1, 2, 2, '#8a9a60'); R(1, 0, 2, 2, '#7e8f5a'); R(-1, 1, 1, 1, '#5a4430'); R(2, 2, 1, 1, '#5a4430'); }
    else if (kind === 'past') { R(-2, -1, 5, 3, '#7fa855'); R(-1 + ((t / 900) % 3), 0, 1, 1, '#f0ece0'); R(1, -1, 1, 1, '#f0ece0'); }
    else if (kind === 'wood') { R(-1, -2, 1, 1, '#2f5a2a'); R(-2, -1, 3, 2, '#2f5a2a'); R(1, -1, 1, 1, '#3a6a32'); R(0, 0, 3, 2, '#3a6a32'); R(-2, 1, 3, 1, '#9a6a35'); }
    else { R(-2, 0, 5, 2, '#7c7263'); R(-1, -1, 3, 1, '#8a8070'); R(0, 0, 1, 2, '#1c1814'); }
  }
}
// Harbour grows from a wooden jetty (I) to a pier with shipping (II), a stone mole and lighthouse (III)
// and a great enclosed harbour like Carthage's cothon or Alexandria's Pharos (IV).
function drawHarbor(ctx, c, x, y, u, t, P) {
  const L = c.b.harbor; let dx = 1, dy = 0;
  if (c.w >= 0) { dx = (c.w % W) - c.x; dy = ((c.w / W) | 0) - c.y; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; }
  const px = -dy, py = dx, at = (k, off) => [x + (dx * k + px * off) * u, y + (dy * k + py * off) * u];
  const sq = (k, off, cc, s) => { const [a, b] = at(k, off); ctx.fillStyle = cc; ctx.fillRect(Math.round(a - (s || 1) * u / 2), Math.round(b - (s || 1) * u / 2), (s || 1) * u, (s || 1) * u); };
  const len = [0, 4, 7, 9, 11][L];
  for (let k = 6; k < 6 + len; k++) sq(k, 0, L >= 3 ? P.stone : P.wood);
  if (L >= 2) for (let k = 7; k < 6 + len; k += 2) sq(k, 1, P.wood);
  if (L >= 3) for (let o = 1; o <= 4; o++) sq(6 + len, o, P.stone);
  if (L >= 4) { const [cx, cy] = at(5 + len / 2, -4.5); ctx.strokeStyle = P.stone; ctx.lineWidth = u; ctx.beginPath(); ctx.arc(cx, cy, 3.4 * u, 0.5, 6.0); ctx.stroke(); ctx.fillStyle = P.wall; ctx.fillRect(cx - u, cy - u, 2 * u, 2 * u); ctx.fillStyle = FAC[c.owner].col; ctx.fillRect(cx - u / 2, cy - 2 * u, u, u); }
  const boats = [0, 0, 1, 2, 4][L], bu = Math.max(1, Math.round(u * 0.75));
  for (let k = 0; k < boats; k++) { const [bx, by] = at(7 + (k % 3) * 3, k % 2 ? 2.8 : -2.4 - (k > 2 ? 2 : 0)); drawBoat(ctx, bx, by, bu, dx >= 0, FAC[c.owner].col, '#b89a60', t + k * 300); }
  if (L >= 3) { const [lx, ly] = at(6 + len, 0), big = L >= 4 ? 1.6 : 1; ctx.fillStyle = P.stone; ctx.fillRect(lx - u * big / 2, ly - 5 * u * big, u * big, 5 * u * big); ctx.fillStyle = Math.sin(t / 200) > 0 ? '#ffd24a' : '#ff8a2a'; ctx.fillRect(lx - u * big / 2 - u / 2, ly - 6 * u * big, u * big + u, u * big); }
}

// ---- city scene ------------------------------------------------------------------
// A 200x100 pixel diorama of the selected city. Buildings rise from their
// foundations while scaffolding, a treadwheel crane and workers do the work.
const SLOT = {
  aqueduct: { x: 3, by: 60, w: 42, h: 17 }, temple: { x: 48, by: 60, w: 26, h: 21 }, market: { x: 78, by: 60, w: 22, h: 11 }, granary: { x: 103, by: 60, w: 12, h: 15 }, barracks: { x: 118, by: 60, w: 22, h: 12 },
  farm: { x: 2, by: 91, w: 24, h: 7 }, vineyard: { x: 28, by: 91, w: 18, h: 8 }, olive: { x: 48, by: 91, w: 18, h: 10 }, pasture: { x: 68, by: 91, w: 18, h: 8 }, lumber: { x: 88, by: 91, w: 14, h: 11 },
  mine: { x: 104, by: 91, w: 16, h: 12 }, workshop: { x: 122, by: 91, w: 14, h: 13 }, forge: { x: 139, by: 91, w: 14, h: 13 }, harbor: { x: 160, by: 76, w: 38, h: 12 },
  road: { x: 0, by: 79, w: 156, h: 2 }, walls: { x: 0, by: 99, w: 200, h: 7 },
};
function drawScene(sc, c, t) {
  const P = CULT[c.culture].pal, st = CULT[c.culture].st, win = G.season === 3;
  const r = (x, y, w, h, col) => { sc.fillStyle = col; sc.fillRect(Math.round(x), Math.round(y), w, h); };
  const sky = win ? ['#8ea0b0', '#a4b4c0', '#b8c4cc'] : G.season === 1 ? ['#6fb0d8', '#8cc4e2', '#aad6ea'] : ['#7eb4d4', '#98c6de', '#b4d6e6'];
  r(0, 0, 200, 22, sky[0]); r(0, 22, 200, 18, sky[1]); r(0, 40, 200, 22, sky[2]);
  r(168, 10, 8, 8, win ? '#e8e8e0' : '#ffe79a'); r(169, 9, 6, 10, win ? '#e8e8e0' : '#ffe79a');
  for (let k = 0; k < 3; k++) { const cx = ((t / (220 + k * 90)) + k * 70) % 240 - 30; r(cx, 12 + k * 9, 16, 3, 'rgba(255,255,255,0.8)'); r(cx + 4, 10 + k * 9, 8, 2, 'rgba(255,255,255,0.8)'); }
  const hillC = c.culture === 'egyptian' ? '#c9b27a' : c.lat > 48 ? '#4f7048' : '#6f8a5a';
  for (let x = 0; x < 200; x++) { const h = 8 + Math.sin(x / 17 + c.id) * 4 + Math.sin(x / 7 + c.id * 3) * 2; r(x, 60 - h, 1, h, hillC); }
  const gc = terr[c.y * W + c.x] === T.DESERT || c.culture === 'egyptian' ? '#c8b27a' : win ? '#9aa488' : P.ground;
  const landW = c.port ? 156 : 200;
  r(0, 60, landW, 40, gc); r(0, 60, landW, 1, shade(hex(gc), 1.15).length ? rgbs(shade(hex(gc), 1.12)) : gc);
  for (let k = 0; k < 60; k++) { const hx = hash2(k, c.id) * landW, hy = 62 + hash2(c.id, k) * 36; r(hx, hy, 1, 1, rgbs(shade(hex(gc), 0.88))); }
  if (c.port) {
    r(156, 60, 44, 40, '#3a7898'); r(156, 60, 44, 2, '#5c98b4');
    for (let k = 0; k < 14; k++) { const wx = 158 + ((k * 13 + t / 90) % 42), wy = 64 + ((k * 7) % 32); r(wx, wy, 3, 1, '#7ab4cc'); }
    r(154, 60, 3, 40, '#cdbd8a');
  }
  // town houses (middle row)
  const nh = Math.min(22, 3 + Math.floor(c.pop * 0.7));
  for (let k = 0; k < nh; k++) {
    const hx = 2 + ((k * 37 + c.id * 11) % 148), w = 5 + Math.floor(hash2(k, c.id + 3) * 4), h = 4 + Math.floor(hash2(c.id, k + 9) * 4), by = 74 + (k % 3);
    if (st === 'hut') { r(hx, by - h + 2, w, h - 2, P.wall2); r(hx - 1, by - h, w + 2, 2, P.roof); r(hx + 1, by - h - 1, w - 2, 1, P.roof); r(hx + Math.floor(w / 2), by - 2, 1, 2, '#2a1a10'); }
    else if (st === 'yurt') { r(hx, by - h + 1, w, h - 1, P.wall); r(hx + 1, by - h, w - 2, 1, P.wall); r(hx + 1, by - h + 2, w - 2, 1, P.acc); }
    else if (st === 'long') { r(hx, by - 4, w + 4, 4, P.wall); r(hx - 1, by - 6, w + 6, 2, P.roof); }
    else { r(hx, by - h, w, h, k % 2 ? P.wall : P.wall2); r(hx - 1, by - h - 1, w + 2, 1, st === 'classic' ? P.roof : P.roof2); r(hx + 1, by - h + 1, 1, 1, '#3a2a1a'); if (w > 6) r(hx + w - 2, by - h + 1, 1, 1, '#3a2a1a'); }
  }
  // life in the town: chimney smoke, birds, festival garlands or riot fires
  for (let k = 0; k < Math.min(6, nh); k += 2) { const hx = 2 + ((k * 37 + c.id * 11) % 148) + 2, ph = (t / 70 + k * 13) % 14; r(hx + Math.sin((t / 400) + k) * 1.5, 66 - ph, 1, 1, 'rgba(220,220,215,' + (0.7 - ph / 20) + ')'); }
  for (let k = 0; k < 3; k++) { const bx = ((t / (40 + k * 9)) + k * 70) % 230 - 15, by = 16 + k * 7 + Math.sin(t / 300 + k) * 3, w = Math.floor(t / 180 + k) % 2; r(bx, by, 1, 1, '#2a2a30'); r(bx - 1, by - w, 1, 1, '#2a2a30'); r(bx + 1, by - w, 1, 1, '#2a2a30'); }
  if (c.order > 75) { for (let x = 4; x < 150; x += 3) { const y = 64 + Math.round(Math.sin(x / 9) * 1.5); r(x, y, 1, 1, ['#d04a3a', '#e8c040', '#3a8ac0', '#f0f0e0'][(x / 3) % 4 | 0]); } r(30, 58, 1, 8, P.wood); r(31, 58, 3, 2, FAC[c.owner].col); r(120, 58, 1, 8, P.wood); r(121, 58, 3, 2, FAC[c.owner].col); }
  if (c.order < 30) for (let k = 0; k < 2; k++) { const hx = 2 + (((k * 2 + 1) * 37 + c.id * 11) % 148) + 1, fl = Math.floor(t / 90 + k) % 3; r(hx, 70 - fl, 3, 3 + fl, ['#ff8a2a', '#ffb040', '#e0521e'][fl]); for (let q = 0; q < 4; q++) { const ph = (t / 50 + q * 5 + k * 9) % 18; r(hx + 1 + Math.sin(t / 200 + q) * 2, 66 - ph, 2, 2, 'rgba(40,36,34,' + (0.8 - ph / 24) + ')'); } }
  if ((c.fl.grain ?? 1) < 0.8) for (let k = 0; k < 3; k++) r(20 + k * 40 + ((t / 90) % 6), 77, 1, 3, '#8a8078');
  // people walking on the road
  const people = Math.min(10, 2 + Math.floor(c.pop / 3));
  const pp = Object.entries(c.ppl || {}).sort((p, q) => q[1] - p[1]); const dress = (k) => { let h = hash2(k, c.id * 7 + 3), acc = 0; for (const [p, v] of pp) { acc += v; if (h <= acc) return PEOPLES[p][1]; } return P.acc; };
  for (let k = 0; k < people + 2; k++) { const px = ((t / (60 + k * 7) + k * 31) % 170) - 8, dir = k % 2 ? 1 : -1, x = dir > 0 ? px : 156 - px, bob = Math.floor(t / 180 + k) % 2; r(x, 75 + bob * 0, 1, 1, '#e3b98c'); r(x, 76, 1, 2, dress(k)); r(x, 78, 1, 1, bob ? '#3a2a1a' : dress(k)); }
  // one ship per sea route, one cart per land route, sailing out to each partner
  const rts = G.routes.filter((q) => q.a === c.id || q.b === c.id); let si = 0, li = 0;
  for (const q of rts) {
    const o = C(q.a === c.id ? q.b : q.a), g = mainGood(q), gc = g ? GD[g].c : '#b89a60', ph = ((t / (5200 + q.id % 7 * 600)) + q.id * 0.31) % 2, fr = ph < 1 ? ph : 2 - ph, out = ph < 1;
    if (q.k === 'sea' && c.port && si < 5) { const y0 = 84 + (si % 3) * 5 + (si > 2 ? 2 : 0), bx = 162 + fr * 44, bob = Math.sin(t / 300 + si) > 0 ? 1 : 0; r(bx, y0 + bob, 7, 2, '#3a2a1a'); r(bx + 1, y0 + 2 + bob, 5, 1, '#3a2a1a'); r(bx + 3, y0 - 6 + bob, 1, 6, '#5a3a20'); r(bx + 1, y0 - 5 + bob, 5, 4, '#efe6cf'); r(bx + 1, y0 - 3 + bob, 5, 1, FAC[o.owner].col); r(bx + (out ? 5 : 0), y0 - 1 + bob, 2, 1, gc); si++; }
    else if (q.k === 'land' && li < 4) { const yy = 78 + (li % 2) * 2, cx = 150 - fr * 160; r(cx, yy - 2, 4, 2, '#6a4a2a'); r(cx, yy - 3, 4, 1, gc); r(cx - 3, yy - 2, 2, 2, '#b08a5a'); r(cx, yy, 1, 1, '#222'); r(cx + 3, yy, 1, 1, '#222'); li++; }
  }
  // buildings
  const q = c.q[0];
  for (const b of BORDER) {
    const L = c.b[b] || 0, building = q && q.b === b, s = SLOT[b]; if (!L && !building) continue; if (b === 'harbor' && !c.port) continue;
    const lv = building ? L + 1 : L;
    if (building) {
      const target = clamp((q.done + creep(q.ts) * (0.6 + 0.4 * (c.fl.timber ?? 1))) / q.need, 0, 1);
      c._disp = c._disp && c._disp.b === b ? c._disp : { b, v: q.done / q.need }; c._disp.v += (target - c._disp.v) * 0.05; const p = c._disp.v;
      if (L) drawB(sc, b, s, L, P, st, c, t); // existing level stays
      drawConstruction(sc, b, s, lv, P, st, c, t, p);
    } else drawB(sc, b, s, L, P, st, c, t);
  }
  if (c.flash && performance.now() - c.flash.t < 3500) {
    const s = SLOT[c.flash.b], k = (performance.now() - c.flash.t) / 3500;
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, d = 4 + k * 22; r(s.x + s.w / 2 + Math.cos(a) * d, s.by - s.h / 2 + Math.sin(a) * d * 0.6, 1, 1, i % 2 ? '#ffe28a' : '#fff'); }
  }
}
function drawConstruction(sc, b, s, lv, P, st, c, t, p) {
  const r = (x, y, w, h, col) => { sc.fillStyle = col; sc.fillRect(Math.round(x), Math.round(y), w, h); };
  const flat = b === 'road' || b === 'walls' || b === 'farm' || b === 'vineyard' || b === 'pasture';
  // ghost blueprint
  sc.globalAlpha = 0.22; drawB(sc, b, s, lv, P, st, c, t); sc.globalAlpha = 1;
  sc.save(); sc.beginPath();
  if (flat) sc.rect(s.x - 2, s.by - s.h - 8, (s.w + 4) * p, s.h + 12); else sc.rect(s.x - 3, s.by - (s.h + 4) * p, s.w + 6, (s.h + 4) * p + 1);
  sc.clip(); drawB(sc, b, s, lv, P, st, c, t); sc.restore();
  const wood = '#8a6238';
  if (!flat) {
    const top = s.by - Math.min(s.h + 3, (s.h + 3) * (p + 0.3));
    for (let x = s.x - 1; x <= s.x + s.w; x += 5) r(x, top, 1, s.by - top, wood);
    for (let y = s.by - 4; y > top; y -= 4) r(s.x - 1, y, s.w + 2, 1, wood);
    // treadwheel crane
    const cx = s.x + s.w + 3, ch = s.h + 9;
    r(cx, s.by - ch, 1, ch, wood); r(cx + 3, s.by - ch + 3, 1, ch - 3, wood); r(cx - 8, s.by - ch, 12, 1, wood);
    r(cx + 1, s.by - 5, 4, 4, '#6a4a2a'); r(cx + 2, s.by - 4, 2, 2, '#b89060');
    const swing = Math.sin(t / 500) * 2, lift = (Math.sin(t / 900) + 1) / 2, ry = s.by - ch + 1 + lift * (ch - 8);
    r(cx - 7 + swing, s.by - ch + 1, 1, ry - (s.by - ch + 1), '#e8e0c8'); r(cx - 8 + swing, ry, 3, 2, P.stone);
  } else {
    const fx = s.x + (s.w) * p; r(fx, s.by - s.h - 2, 1, s.h + 2, '#e8e0c8');
  }
  // workers ferrying material from a pile
  const pile = s.x - 5; r(pile, s.by - 2, 4, 2, P.stone); r(pile + 1, s.by - 3, 2, 1, wood);
  for (let k = 0; k < 3; k++) {
    const ph = ((t / (1400 + k * 230)) + k / 3) % 2, fr = ph < 1 ? ph : 2 - ph, wx = pile + 2 + fr * (s.w * 0.6 + 4), bob = Math.floor(t / 150 + k) % 2;
    r(wx, s.by - 4 - bob, 1, 1, '#e3b98c'); r(wx, s.by - 3, 1, 2, k === 1 ? P.acc : '#c8b894'); if (ph < 1) r(wx + 1, s.by - 5, 2, 1, P.stone);
  }
  if (Math.floor(t / 90) % 7 === 0) r(s.x + hash2(Math.floor(t / 90), 3) * s.w, s.by - 2 - hash2(3, Math.floor(t / 90)) * 5, 1, 1, '#e8dcc0');
}
function drawB(sc, b, s, L, P, st, c, t) {
  const r = (x, y, w, h, col) => { sc.fillStyle = col; sc.fillRect(Math.round(x), Math.round(y), w, h); };
  const x = s.x, by = s.by, w = s.w, h = s.h;
  switch (b) {
    case 'farm': { const rows = Math.min(4, Math.max(1, L)) + 2; for (let k = 0; k < rows; k++) { r(x, by - 1 - k, w - 6, 1, k % 2 ? '#d9b54a' : '#b8913a'); } for (let k = 0; k < w - 6; k += 3) r(x + k, by - rows - 1 + (Math.floor(t / 400 + k) % 2), 1, 1, '#f0d070'); r(x + w - 5, by - 5, 4, 4, P.wall); r(x + w - 6, by - 6, 6, 1, P.roof); r(x + w - 4, by - 3, 1, 2, '#3a2a1a'); break; }
    case 'vineyard': for (let k = 0; k < 2 + L; k++) { const px = x + 1 + k * 5; for (let j = 0; j < 3; j++) { r(px, by - 2 - j * 2, 3, 1, '#4f8a38'); r(px + 1, by - 1 - j * 2, 1, 1, '#6b2a5a'); } r(px + 1, by - 7, 1, 7, P.wood); } break;
    case 'olive': for (let k = 0; k < 1 + L; k++) { const tx = x + k * 5; r(tx + 2, by - 4, 1, 4, '#5a4430'); r(tx, by - 8, 5, 4, '#7e8f5a'); r(tx + 1, by - 9, 3, 1, '#97a66e'); r(tx + 1, by - 6, 1, 1, '#4a5a32'); } r(x + w - 5, by - 4, 5, 4, P.stone); r(x + w - 4, by - 6, 3, 2, '#8a8a80'); break;
    case 'pasture': { r(x, by - 3, w, 1, P.wood); for (let k = 0; k <= w; k += 4) r(x + k, by - 4, 1, 4, P.wood); const n = 2 + L * 2; for (let k = 0; k < n; k++) { const sx = x + 1 + ((k * 5 + t / (700 + k * 90)) % (w - 3)), horse = c.res.horses && k % 3 === 0; r(sx, by - 2, 2, 1, horse ? '#8a5a34' : '#f0ece0'); r(sx + (horse ? 2 : 1), by - 3, 1, 1, horse ? '#6a4024' : '#d8d4c8'); } break; }
    case 'lumber': { for (let k = 0; k < 1 + L; k++) { const tx = x + 7 + k * 3; r(tx, by - 10, 1, 2, '#2f5a2a'); r(tx - 1, by - 8, 3, 2, '#2f5a2a'); r(tx - 2, by - 6, 5, 2, '#3a6a32'); r(tx, by - 4, 1, 4, '#5a3a20'); } r(x, by - 2, 7, 2, '#9a6a35'); r(x, by - 3, 6, 1, '#b07a40'); r(x + 6, by - 2, 1, 1, '#d9b070'); r(x + 6, by - 1, 1, 1, '#d9b070'); break; }
    case 'mine': { r(x, by - 6, w, 6, '#7c7263'); r(x + 2, by - 9, w - 4, 3, '#8a8070'); r(x + 5, by - 12, w - 10, 3, '#968b7a'); r(x + 6, by - 6, 4, 6, '#1c1814'); r(x + 5, by - 7, 6, 1, P.wood); r(x + 5, by - 7, 1, 7, P.wood); r(x + 10, by - 7, 1, 7, P.wood); const cx = x + 1 + ((t / 300) % 4); r(cx, by - 2, 3, 2, '#5a4a3a'); r(cx, by - 3, 3, 1, METALS.find((m) => c.res[m]) ? GD[METALS.find((m) => c.res[m])].c : '#888'); if (L > 1) r(x + 12, by - 4, 3, 4, P.wood); break; }
    case 'workshop': { r(x, by - 9, w - 4, 9, P.wall); r(x - 1, by - 11, w - 2, 2, P.roof); r(x + 2, by - 5, 2, 5, '#3a2a1a'); r(x + w - 5, by - 5, 5, 5, '#a3563a'); r(x + w - 4, by - 6, 3, 1, '#a3563a'); const sy = (t / 60) % 12; r(x + w - 3 + Math.sin(t / 300), by - 7 - sy, 2, 2, 'rgba(220,220,220,' + (1 - sy / 12) + ')'); if (c.res.purple) r(x + 5, by - 7, 3, 2, '#8a3aa0'); if (L > 1) r(x + 6, by - 7, 2, 2, '#3a2a1a'); break; }
    case 'forge': { r(x, by - 9, w, 9, P.wall2); r(x - 1, by - 11, w + 2, 2, P.roof2); r(x + w - 3, by - 14, 2, 4, P.stone); const fl = Math.floor(t / 120) % 3; r(x + 2, by - 5, 4, 5, ['#ff8a2a', '#e0521e', '#ffb040'][fl]); r(x + 8, by - 3, 3, 1, '#444'); r(x + 9, by - 2, 1, 2, '#444'); if (Math.floor(t / 200) % 4 === 0) { r(x + w - 2, by - 16, 1, 1, '#ffb040'); r(x + w - 3, by - 18, 1, 1, '#ff8a2a'); } break; }
    case 'market': { for (let k = 0; k < 2 + L; k++) { const sx = x + k * 6; if (sx + 6 > x + w + 6) break; r(sx, by - 5, 5, 5, P.wall2); r(sx - 1, by - 7, 7, 2, k % 2 ? P.acc : '#e8d9b0'); r(sx + 1, by - 4, 3, 1, Object.keys(c.P || {})[k] ? GD[Object.keys(c.P)[k]].c : '#ccc'); } r(x + 3 + ((t / 400) % (w - 4)), by - 2, 1, 2, '#e3b98c'); break; }
    case 'temple': {
      if (st === 'classic') { r(x, by - 3, w, 3, P.stone); r(x + 1, by - 4, w - 2, 1, P.trim); const n = 4 + L; const gap = (w - 4) / (n - 1); for (let k = 0; k < n; k++) r(x + 2 + k * gap, by - 15, 2, 11, P.trim); r(x + 1, by - 17, w - 2, 2, P.stone); for (let i = 0; i < 4; i++) r(x + 2 + i * 2, by - 18 - i, w - 4 - i * 4, 1, P.roof); r(x + w / 2 - 1, by - 13, 2, 9, '#5a4a3a'); if (L > 2) { r(x + w / 2 - 1, by - 23, 2, 2, '#f2c83c'); r(x + 1, by - 19, 1, 1, '#f2c83c'); r(x + w - 2, by - 19, 1, 1, '#f2c83c'); } }
      else if (st === 'punic') { r(x + 2, by - 14, w - 4, 14, P.wall); r(x + 4, by - 16, w - 8, 2, P.wall2); r(x + 7, by - 18, w - 14, 2, P.wall2); r(x + w / 2 - 2, by - 7, 4, 7, '#3a2a1a'); r(x, by - 12, 2, 12, P.stone); r(x + w - 2, by - 12, 2, 12, P.stone); r(x - 1, by - 13, 4, 1, P.acc); r(x + w - 3, by - 13, 4, 1, P.acc); if (L > 1) r(x + w / 2 - 1, by - 20, 2, 2, '#f2c83c'); }
      else if (st === 'egypt') { r(x, by - 16, 9, 16, P.wall); r(x + w - 9, by - 16, 9, 16, P.wall); r(x + 1, by - 17, 7, 1, P.wall2); r(x + w - 8, by - 17, 7, 1, P.wall2); r(x + 9, by - 10, w - 18, 10, P.wall2); r(x + w / 2 - 2, by - 8, 4, 8, '#3a2a1a'); r(x + 2, by - 13, 5, 2, P.acc); r(x + w - 7, by - 13, 5, 2, P.acc); }
      else if (st === 'yurt') { r(x + 2, by - 6, w - 4, 6, '#8a9a5a'); r(x + 5, by - 9, w - 10, 3, '#95a562'); r(x + 9, by - 11, w - 18, 2, '#a0b06a'); r(x + w / 2, by - 16, 2, 5, '#c8c0b0'); r(x + w / 2 - 1, by - 15, 1, 1, '#c8c0b0'); }
      else { const n = 6 + L * 2; for (let k = 0; k < n; k++) { const a = k / n * 6.28; r(x + w / 2 + Math.cos(a) * (w / 2 - 2), by - 3 + Math.sin(a) * 2 - 6, 1, 6, P.wood); } r(x + w / 2 - 4, by - 9, 8, 7, P.wall2); r(x + w / 2 - 6, by - 12, 12, 3, P.roof); r(x + w / 2 - 3, by - 14, 6, 2, P.roof); r(x + w / 2 - 1, by - 5, 2, 3, '#2a1a10'); if (st === 'long') r(x + 2, by - 17, 1, 17, '#3a5a2a'); }
      break;
    }
    case 'granary': { if (st === 'classic' || st === 'punic' || st === 'egypt') { r(x, by - 13, w, 13, P.wall); r(x - 1, by - 15, w + 2, 2, P.roof); r(x + 4, by - 10, 3, 2, '#3a2a1a'); r(x + 4, by - 4, 4, 4, '#5a4a3a'); if (L > 1) r(x + w, by - 8, 3, 8, P.wall2); } else { for (let k = 0; k < 4; k++) r(x + 1 + k * 3, by - 3, 1, 3, P.wood); r(x, by - 9, w, 6, P.wall2); r(x - 1, by - 12, w + 2, 3, P.roof); } break; }
    case 'barracks': { const fc = FAC[c.owner].col; if (st === 'classic' || st === 'punic' || st === 'egypt') { r(x, by - 9, w, 9, P.wall2); r(x - 1, by - 10, w + 2, 1, P.stone); for (let k = 0; k < w; k += 3) r(x + k, by - 11, 2, 1, P.stone); r(x + w / 2 - 2, by - 5, 4, 5, '#3a2a1a'); } else { r(x, by - 7, w, 7, P.wall); r(x - 2, by - 10, w + 4, 3, P.roof); } r(x + w - 2, by - 20, 1, 12, '#2a1a10'); const wv = Math.floor(t / 250) % 2; r(x + w - 1, by - 20, 5, 3 - wv, fc); if (FAC[c.owner].cul === 'roman') r(x + w - 3, by - 22, 3, 1, '#f2c83c'); for (let k = 0; k < L + 1; k++) { const sx = x + 2 + ((t / 500 + k * 5) % (w - 4)); r(sx, by - 3, 1, 1, '#e3b98c'); r(sx, by - 2, 1, 2, fc); } break; }
    case 'aqueduct': { r(x, by - h, w, 3, P.stone); r(x, by - h - 1, w, 1, '#6a9ab0'); for (let k = 0; k <= w - 2; k += 6) { r(x + k, by - h + 3, 2, h - 3, P.stone); } for (let k = 2; k < w - 2; k += 6) { r(x + k, by - h + 3, 4, 1, P.stone); r(x + k + 1, by - h + 4, 2, 1, P.stone); } if (L > 1) for (let k = 3; k < w - 3; k += 3) r(x + k, by - h + 1, 1, 1, P.wall2); break; }
    case 'harbor': { r(x, by - 2, w, 2, P.wood); for (let k = 0; k < w; k += 5) r(x + k, by, 1, 5, '#4a3420'); if (c.culture === 'punic' && L > 1) { r(x + 6, by + 4, w - 12, 1, P.stone); r(x + w / 2 - 3, by + 2, 6, 2, P.wall); } for (let k = 0; k < Math.min(3, L + 1); k++) { const bx = x + 4 + k * 11, bob = Math.sin(t / 400 + k) > 0 ? 1 : 0; r(bx, by + 3 + bob, 8, 2, '#3a2a1a'); r(bx + 1, by + 5 + bob, 6, 1, '#3a2a1a'); r(bx + 3, by - 5 + bob, 1, 8, '#5a3a20'); r(bx + 1, by - 4 + bob, 5, 5, '#efe6cf'); r(bx + 1, by - 2 + bob, 5, 1, FAC[c.owner].col); } if (L > 3) { r(x + 2, by + 6, w - 4, 2, P.stone); r(x + 2, by + 2, 2, 4, P.stone); r(x + w / 2 - 4, by + 1, 8, 3, P.wall); r(x + w / 2 - 1, by - 2, 2, 3, P.trim); }
      if (L > 2) { r(x + w - 4, by - 14, 4, 12, P.stone); r(x + w - 5, by - 15, 6, 1, P.trim); r(x + w - 3, by - 17, 2, 2, Math.floor(t / 250) % 2 ? '#ffd24a' : '#ff8a2a'); } r(x + 2, by - 9, 1, 7, P.wood); r(x + 2, by - 9, 6, 1, P.wood); r(x + 7, by - 8, 1, 3, '#e8e0c8'); break; }
    case 'road': { r(x, by, w, 2, '#a8a08a'); for (let k = 0; k < w; k += 3) r(x + k, by, 1, 1, '#8e8672'); if (L > 1) { r(x, by - 1, w, 1, '#9a9280'); r(x + 40, by - 4, 1, 4, P.stone); } break; }
    case 'walls': { if (st === 'long' || st === 'yurt') { for (let k = 0; k < w; k += 2) r(x + k, by - 5 - (k % 4 ? 0 : 1), 1, 6, P.wood); } else { r(x, by - 4, w, 5, P.stone); for (let k = 0; k < w; k += 4) r(x + k, by - 6, 2, 2, P.stone); if (st === 'hut') for (let k = 1; k < w; k += 5) r(x + k, by - 2, 2, 1, P.wood); for (let k = 0; k < L + 1; k++) { const tx = 20 + k * 60; r(tx, by - 9, 7, 10, P.stone); r(tx - 1, by - 10, 9, 1, P.stone); r(tx + 3, by - 5, 1, 2, '#2a1a10'); } r(96, by - 5, 8, 6, '#3a2a1a'); } break; }
  }
}
