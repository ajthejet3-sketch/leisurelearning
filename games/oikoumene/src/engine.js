'use strict';
// ============================================================================
// Map generation, economy, trade, war, colonies, AI.
// ============================================================================
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R1 = (v) => Math.round(v * 10) / 10;
function hash2(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => vnoise(x / 9, y / 9) * 0.6 + vnoise(x / 4, y / 4) * 0.3 + vnoise(x / 2, y / 2) * 0.1;

// ---- projection -------------------------------------------------------------
const LON0 = -12, LON1 = 43, LAT0 = 27, LAT1 = 58.5, CL = 0.125, KX = Math.cos((42 * Math.PI) / 180), CLON = CL / KX;
const W = Math.ceil((LON1 - LON0) / CLON), H = Math.ceil((LAT1 - LAT0) / CL), N = W * H;
const toCell = (lon, lat) => [(lon - LON0) / CLON, (LAT1 - lat) / CL];
const cellLL = (x, y) => [LON0 + (x + 0.5) * CLON, LAT1 - (y + 0.5) * CL];
const KM_PER_CELL = 14;

const T = { SEA: 0, PLAIN: 1, DRY: 2, FOREST: 3, HILLS: 4, MTN: 5, DESERT: 6, STEPPE: 7, MARSH: 8 };
const TNAME = ['Sea', 'Farmland plain', 'Dry plain', 'Forest', 'Hills', 'Mountains', 'Desert', 'Steppe', 'River delta'];
const land = new Uint8Array(N), terr = new Uint8Array(N), river = new Uint8Array(N), region = new Int8Array(N).fill(-1);
const coastD = new Uint8Array(N), waterComp = new Int32Array(N).fill(-1), landComp = new Int32Array(N).fill(-1);
const cellCity = new Int16Array(N).fill(-1);
let SEA_MAIN = -1;
const compSize = {};
const NB4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const NB8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

function fillPoly(flat, rid) {
  const n = flat.length / 2, xs = [], ys = [];
  for (let i = 0; i < n; i++) { const c = toCell(flat[2 * i], flat[2 * i + 1]); xs.push(c[0]); ys.push(c[1]); }
  for (let y = 0; y < H; y++) {
    const py = y + 0.5, xsec = [];
    for (let i = 0, j = n - 1; i < n; j = i++) if ((ys[i] > py) !== (ys[j] > py)) xsec.push(xs[i] + ((py - ys[i]) / (ys[j] - ys[i])) * (xs[j] - xs[i]));
    xsec.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xsec.length; k += 2) {
      const x0 = Math.max(0, Math.ceil(xsec[k] - 0.5)), x1 = Math.min(W - 1, Math.floor(xsec[k + 1] - 0.5));
      for (let x = x0; x <= x1; x++) { land[y * W + x] = 1; if (region[y * W + x] < 0) region[y * W + x] = rid; }
    }
  }
}
function polyCells(flat) { const out = []; for (let i = 0; i < flat.length; i += 2) out.push(toCell(flat[i], flat[i + 1])); return out; }
function eachLineCell(pts, step, fn) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / step));
    for (let k = 0; k <= n; k++) { const x = Math.floor(ax + ((bx - ax) * k) / n), y = Math.floor(ay + ((by - ay) * k) / n); if (x >= 0 && y >= 0 && x < W && y < H) fn(x, y); }
  }
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function polyDist(px, py, pts) { let m = 1e9; for (let i = 0; i + 1 < pts.length; i++) m = Math.min(m, segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return m; }

function bfsDist(isSrc, isPass, out, cap) {
  const q = new Int32Array(N); let h = 0, t = 0; out.fill(255);
  for (let i = 0; i < N; i++) if (isSrc(i)) { out[i] = 0; q[t++] = i; }
  while (h < t) {
    const i = q[h++], d = out[i]; if (d >= cap) continue; const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of NB4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (out[j] !== 255 || !isPass(j)) continue; out[j] = d + 1; q[t++] = j; }
  }
}
function labelComps(mask, out, nb) {
  let id = 0; const q = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (!mask(s) || out[s] >= 0) continue; let h = 0, t = 0; q[t++] = s; out[s] = id; let size = 0;
    while (h < t) { const i = q[h++]; size++; const x = i % W, y = (i / W) | 0; for (const [dx, dy] of nb) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (out[j] < 0 && mask(j)) { out[j] = id; q[t++] = j; } } }
    compSize[(mask === isLand ? 'L' : 'S') + id] = size; id++;
  }
}
const isLand = (i) => land[i] === 1;
const isWater = (i) => land[i] === 0;

const STRAITS = [[[26.1, 39.95, 26.5, 40.2, 26.9, 40.42, 27.3, 40.5]], [[28.95, 40.95, 29.05, 41.12, 29.12, 41.3]], [[36.55, 45.1, 36.7, 45.5]], [[-5.9, 35.93, -5.3, 36.0]], [[15.62, 37.95, 15.66, 38.35]], [[12.65, 55.3, 12.7, 56.1]], [[10.6, 55.9, 11.2, 56.3]]];
let NILE_PTS;

function buildMap() {
  let rid = 0; const RIDS = {};
  for (const k in POLYS) { RIDS[k] = rid; fillPoly(POLYS[k], rid++); }
  for (const s of STRAITS) eachLineCell(polyCells(s[0]), 0.3, (x, y) => { land[y * W + x] = 0; region[y * W + x] = -1; });
  // coastal distance for land and water
  const dl = new Uint8Array(N), dw = new Uint8Array(N);
  bfsDist(isWater, isLand, dl, 80); bfsDist(isLand, isWater, dw, 30);
  for (let i = 0; i < N; i++) coastD[i] = land[i] ? dl[i] : dw[i];
  labelComps(isWater, waterComp, NB4); labelComps(isLand, landComp, NB4);
  { const [mx, my] = toCell(18, 35); SEA_MAIN = waterComp[(my | 0) * W + (mx | 0)]; }
  const ranges = RANGES.map(([p, w]) => [polyCells(p), w]);
  NILE_PTS = polyCells(RIVERS[0]);
  const AF = RIDS.afroasia, SC = RIDS.scandza;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!land[i]) { terr[i] = T.SEA; continue; }
    const [lon, lat] = cellLL(x, y), n = fbm(x, y), cd = coastD[i];
    let t = T.PLAIN, md = 1e9;
    for (const [pts, w] of ranges) md = Math.min(md, polyDist(x + 0.5, y + 0.5, pts) - w * (0.7 + 0.6 * n));
    if (md < 0) t = T.MTN; else if (md < 2.4) t = T.HILLS;
    const africa = region[i] === AF && (lon < 32.4 || (lon < 34.4 && lat < 31.3));
    const nileD = polyDist(x + 0.5, y + 0.5, NILE_PTS);
    const delta = lat > 30.1 && lat < 31.6 && lon > 29.9 && lon < 32.4 && Math.abs(lon - 31.1) < (lat - 30.0) * 0.95;
    if (africa) {
      const lim = 5 + Math.max(0, lat - 31) * 11;
      if (nileD < 1.6 || delta) t = T.MARSH;
      else if (cd > lim) t = t === T.MTN ? T.MTN : T.DESERT;
      else if (lat < 33.4 && t === T.PLAIN) t = T.DRY;
    } else if (region[i] === AF) {
      if (lon > 36.7 && lat < 35.8 && cd > 5) t = t === T.MTN ? T.MTN : T.DESERT;
      else if (lat < 31.4 && lon > 34.3) t = T.DESERT;
      else if (lat > 37.8 && lat < 40.6 && lon > 30 && lon < 38 && t === T.PLAIN) t = T.DRY;
      else if (lat > 42.5 && t === T.PLAIN && n > 0.45) t = T.STEPPE;
      else if (lat < 37 && lon > 35.5 && t === T.PLAIN && n < 0.4) t = T.DRY;
    } else if (t === T.PLAIN) {
      if (lat > 45.5 && lon > 27.5 && lat < 51.5) t = T.STEPPE;
      else if (lat > 45.3 && lat < 48.2 && lon > 18.8 && lon < 22.5) t = T.STEPPE;
      else if (lat < 41.8 && lon < -1.5 && lon > -7.6 && cd > 5) t = T.DRY;
      else if (region[i] === SC && n > 0.3) t = T.FOREST;
      else if (lon > 6.5 && lat > 49.5 && n > 0.4) t = T.FOREST;
      else if (lat > 46.5 && n > 0.5) t = T.FOREST;
      else if (lat > 44.5 && n > 0.63) t = T.FOREST;
      else if (lat < 39.5 && n < 0.36) t = T.DRY;
    }
    if (lat > 51.5 && lon > 25 && t === T.STEPPE) t = T.FOREST;
    terr[i] = t;
  }
  for (let k = 1; k < RIVERS.length; k++) eachLineCell(polyCells(RIVERS[k]), 0.4, (x, y) => { if (land[y * W + x]) river[y * W + x] = 1; });
  eachLineCell(NILE_PTS, 0.4, (x, y) => { if (land[y * W + x]) river[y * W + x] = 1; });
}

// ---- sea pathfinding ------------------------------------------------------------
const MAXSEA = 330;
function seaField(start, maxD) {
  const dist = new Uint16Array(N).fill(65535), q = new Int32Array(N); let h = 0, t = 0;
  dist[start] = 0; q[t++] = start;
  while (h < t) {
    const i = q[h++], d = dist[i]; if (d >= maxD) continue; const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of NB8) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx;
      if (land[j] || dist[j] !== 65535) continue; if (dx && dy && land[y * W + nx] && land[ny * W + x]) continue;
      dist[j] = d + 1; q[t++] = j;
    }
  }
  return dist;
}
function lineWater(a, b) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d * 2.5); for (let k = 1; k < n; k++) { const x = Math.floor(a[0] + ((b[0] - a[0]) * k) / n), y = Math.floor(a[1] + ((b[1] - a[1]) * k) / n); if (land[y * W + x]) return false; } return true; }
function seaPathCells(field, target) {
  const out = []; let i = target, guard = 0;
  while (field[i] > 0 && guard++ < 6000) {
    out.push(i); const x = i % W, y = (i / W) | 0; let best = -1, bd = field[i], bs = 1e9;
    for (const [dx, dy] of NB8) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (field[j] < bd || (field[j] === bd && best >= 0 && coastD[j] > bs)) { bd = field[j]; best = j; bs = coastD[j]; } }
    if (best < 0) break; i = best;
  }
  out.push(i); return out.reverse();
}
function stringPull(cells) {
  const P = cells.map((i) => [(i % W) + 0.5, ((i / W) | 0) + 0.5]); if (P.length < 3) return P;
  const out = [P[0]]; let i = 0;
  while (i < P.length - 1) { let j = Math.min(P.length - 1, i + 90); while (j > i + 1 && !lineWater(P[i], P[j])) j--; out.push(P[j]); i = j; }
  return out;
}
const pathLen = (p) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };
function lineStats(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.ceil(d * 2)); let wtr = 0, mtn = 0;
  for (let k = 0; k <= n; k++) { const i = Math.floor(ay + ((by - ay) * k) / n) * W + Math.floor(ax + ((bx - ax) * k) / n); if (!land[i]) wtr++; else if (terr[i] === T.MTN) mtn++; }
  return { d, wtr: wtr / (n + 1), mtn: mtn / (n + 1) };
}

// ---- game state -----------------------------------------------------------------
let G = null; // saved state
const FAC = {}; FDEF.forEach(([id, name, short, col, cul, cur, ai, desc]) => (FAC[id] = { id, name, short, col, cul, cur, ai: { aggr: ai[0], merc: ai[1], colon: ai[2] }, desc }));
const FIDS = FDEF.map((f) => f[0]);
const C = (id) => G.cities[id];
const dk = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
const atWar = (a, b) => a !== b && !!G.war[dk(a, b)];
const allied = (a, b) => a !== b && !!G.ally[dk(a, b)];
const rights = (a, b) => a === b || !!G.rights[dk(a, b)];
const access = (a, b) => a === b || (rights(a, b) && !atWar(a, b));
const rel = (a, b) => (a === b ? 100 : G.rel[dk(a, b)] || 0);
const setRel = (a, b, v) => { G.rel[dk(a, b)] = clamp(Math.round(v), -100, 100); };
const addRel = (a, b, v) => setRel(a, b, rel(a, b) + v);
const price = (g) => G.prices[g] || GD[g].p;
const fname = (f) => FAC[f].name;
const citiesOf = (f) => G.cities.filter((c) => c.owner === f);
const seasonName = (s) => ['Spring', 'Summer', 'Autumn', 'Winter'][s];
const yearStr = (y) => (y < 0 ? -y + ' BC' : y + ' AD');
const dateStr = () => seasonName(G.season) + ', ' + yearStr(G.year);

function genRes(x, y, port) {
  const [lon, lat] = cellLL(x, y), res = {};
  for (const [g, zl, zt, r, a] of ZONES) { const d = Math.hypot((lon - zl) * KX, lat - zt); if (d < r) res[g] = (res[g] || 0) + a * (1 - (d / r) * 0.6); }
  let n = 0, fert = 0, forest = 0, hills = 0;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    if (dx * dx + dy * dy > 36) continue; const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const i = Y * W + X; if (!land[i]) continue;
    n++; const t = terr[i]; if (t === T.PLAIN || t === T.MARSH) fert += 1; else if (t === T.STEPPE) fert += 0.8; else if (t === T.DRY || t === T.HILLS) fert += 0.45;
    if (t === T.FOREST) forest++; if (t === T.HILLS || t === T.MTN) hills++; if (river[i]) fert += 0.4;
  }
  n = Math.max(1, n);
  res.grain = (res.grain || 0) + 0.6 + (3.2 * fert) / n;
  if (forest / n > 0.12) res.timber = (res.timber || 0) + (3 * forest) / n + 0.3;
  if (hills / n > 0.2) res.wool = (res.wool || 0) + (1.2 * hills) / n + 0.3;
  if (port) { res.fish = (res.fish || 0) + 0.8; res.salt = (res.salt || 0) + (lat < 45 ? 0.5 : 0.25); }
  for (const g in res) { res[g] = R1(res[g]); if (res[g] < 0.25) delete res[g]; }
  return res;
}
function snapLand(x, y) {
  let i = y * W + x; if (land[i]) return [x, y];
  for (let r = 1; r < 6; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; if (land[Y * W + X] && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = [X, Y]; } } if (best) return best; }
  return [x, y];
}
function findPortWater(x, y) {
  let best = -1, bd = 1e9;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (land[j]) continue; const sz = compSize['S' + waterComp[j]] || 0; if (sz < 300) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = j; } }
  return best;
}
function canWine(c) { return c.lat < 47 && terr[c.y * W + c.x] !== T.DESERT; }
function canOlive(c) { const t = terr[c.y * W + c.x]; return c.lat < 44.3 && coastD[c.y * W + c.x] < 18 && t !== T.STEPPE && t !== T.FOREST && t !== T.DESERT; }

function makeCity(name, lon, lat, owner, pop, cap, opt = {}) {
  let [x, y] = toCell(lon, lat); [x, y] = snapLand(Math.floor(x), Math.floor(y));
  const [clon, clat] = cellLL(x, y), w = findPortWater(x, y);
  const c = { id: G.cities.length, name, x, y, lon: clon, lat: clat, owner, culture: opt.culture || FAC[owner].cul, pop, pop0: pop, capital: !!cap,
    port: w >= 0, w, sea: w >= 0 ? waterComp[w] : -1, lc: landComp[y * W + x], res: genRes(x, y, w >= 0), b: {}, q: [], order: 62, stock: { grain: pop * 0.3 },
    fl: {}, imp: {}, exp: {}, P: {}, D: {}, colony: !!opt.colony, founded: G.turn, ratio: { textiles: 1, weapons: 1, bronze: 1 }, gar: 0 };
  c.gar = garMax(c);
  G.cities.push(c); return c;
}
function seedBuildings(c) {
  const p = c.pop, b = c.b, barb = isBarb(c.culture);
  if (p >= 3) b.farm = 1; if (c.port && p >= 3) b.harbor = 1; if (p >= 5) { b.market = 1; b.temple = 1; }
  if (p >= 8) { b.walls = 1; b.workshop = 1; if (c.port) b.harbor = 2; b.farm = 2; }
  if (p >= 15) { b.market = 2; b.temple = 2; b.walls = 2; b.granary = 1; }
  if (c.capital) { b.temple = Math.max(1, b.temple || 0); b.walls = Math.max(1, b.walls || 0); b.barracks = 1; }
  if (canWine(c) && !barb && p >= 4 && (c.res.wine || c.lat < 42)) b.vineyard = 1;
  if (canOlive(c) && !barb && p >= 4) b.olive = 1;
  if (METALS.some((m) => (c.res[m] || 0) > 0.8) && p >= 3) b.mine = 1;
  if ((c.res.timber || 0) > 1) b.lumber = 1;
  if ((c.res.wool || 0) > 0.8 || (c.res.horses || 0) > 1) b.pasture = 1;
  if (c.culture === 'roman' && p >= 4) b.road = 1;
  const S = { Carthago: { harbor: 3, market: 3, workshop: 2, walls: 3, olive: 2 }, Alexandreia: { harbor: 3, market: 3, workshop: 2, granary: 2, temple: 3 }, Roma: { market: 2, road: 2, temple: 3, aqueduct: 1 },
    Athenai: { temple: 3, workshop: 2, harbor: 2 }, Rhodos: { harbor: 3, market: 2 }, Antiocheia: { market: 3, workshop: 2 }, Syracusae: { harbor: 2, walls: 3 },
    Massalia: { harbor: 2, market: 2, vineyard: 2 }, Tyros: { workshop: 2, harbor: 2 }, Sidon: { workshop: 2 }, Byzantion: { harbor: 2, walls: 2 }, Korinthos: { walls: 3, harbor: 2, market: 2 },
    Pergamon: { temple: 2, workshop: 1 }, Gades: { harbor: 2 }, Memphis: { farm: 3, temple: 2 }, Krokodilopolis: { farm: 3 }, Numantia: { walls: 2 }, Petra: { market: 2 } };
  if (S[c.name]) Object.assign(b, S[c.name]);
  if (isBarb(c.culture)) delete b.aqueduct;
}
const garMax = (c) => c.pop * 0.9 + (c.b.walls || 0) * 5 + (c.b.barracks || 0) * 3 + 3;
function slots(c) { return 1 + (c.port ? 1 : 0) + (c.b.harbor || 0) + (c.b.market || 0) + (c.pop >= 15 ? 1 : 0); }
function popCap(c) { const b = c.b; return Math.max(c.pop0 * 1.15, 5 + 3 * (b.farm || 0) + 2 * (b.granary || 0) + 12 * (b.aqueduct || 0) + 2 * (b.harbor || 0) + 2 * (b.market || 0) + (c.port ? 2 : 0)); }
function levels(c) { let s = 0; for (const k in c.b) s += c.b[k]; return s; }

// ---- neighbour graph ----------------------------------------------------------
function linkCity(c) {
  c.seaN = []; c.landN = [];
  if (c.port) {
    const f = seaField(c.w, MAXSEA);
    for (const o of G.cities) { if (o === c || !o.port || o.sea !== c.sea) continue; const d = f[o.w]; if (d < 65535) { c.seaN.push({ id: o.id, d }); if (o.seaN && !o.seaN.some((n) => n.id === c.id)) o.seaN.push({ id: c.id, d }); } }
  }
  for (const o of G.cities) {
    if (o === c || o.lc !== c.lc) continue; const s = lineStats(c.x + 0.5, c.y + 0.5, o.x + 0.5, o.y + 0.5);
    if (s.d <= 42 && s.wtr <= 0.12) { const e = { id: o.id, d: s.d * (1 + s.mtn * 1.5), raw: s.d }; c.landN.push(e); if (o.landN && !o.landN.some((n) => n.id === c.id)) o.landN.push({ id: c.id, d: e.d, raw: s.d }); }
  }
  c.seaN.sort((a, b) => a.d - b.d); c.landN.sort((a, b) => a.d - b.d);
}
function tradeCands(c) {
  const out = [];
  for (const n of c.seaN) out.push({ id: n.id, d: n.d, k: 'sea' });
  for (const n of c.landN) if (n.raw <= 28) { const e = out.find((o) => o.id === n.id); const d = n.d * 2.2; if (!e) out.push({ id: n.id, d, k: 'land' }); else if (d < e.d) { e.d = d; e.k = 'land'; } }
  out.sort((a, b) => a.d - b.d); return out.slice(0, 34);
}

// ---- territory ----------------------------------------------------------------
const MOVE_COST = [99, 1, 1.2, 1.5, 1.7, 3.2, 2.4, 1.1, 1.3];
function computeTerritory() {
  const cost = new Float32Array(N).fill(1e9); cellCity.fill(-1);
  const hk = [], hv = [];
  const push = (k, v) => { hk.push(k); hv.push(v); let i = hk.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
  const pop = () => { const k = hk[0], v = hv[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hk.length && hk[l] < hk[m]) m = l; if (r < hk.length && hk[r] < hk[m]) m = r; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; } } return [k, v]; };
  const rad = G.cities.map((c) => (c.owner ? 6 + 2.5 * Math.sqrt(c.pop) : 0));
  for (const c of G.cities) { if (!c.owner) continue; const i = c.y * W + c.x; cost[i] = 0; cellCity[i] = c.id; push(0, i); }
  while (hk.length) {
    const [k, i] = pop(); if (k > cost[i]) continue; const cid = cellCity[i], x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of NB4) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!land[j]) continue; const nk = k + MOVE_COST[terr[j]]; if (nk > rad[cid] || nk >= cost[j]) continue; cost[j] = nk; cellCity[j] = cid; push(nk, j); }
  }
  G._terrDirty = false; if (typeof onTerritory === 'function') onTerritory();
}

// ---- new game -----------------------------------------------------------------
function newGame(pid) {
  G = { v: 1, turn: 0, year: -200, season: 0, player: pid, fac: {}, cities: [], routes: [], armies: [], fleets: [], rel: {}, war: {}, rights: {}, ally: {}, warT: {}, relBase: {},
    prices: {}, log: [], black: {}, nid: 1, hist: {}, lastPrices: {}, done: {}, raided: {} };
  for (const f of FIDS) G.fac[f] = { gold: 0, tax: 0.15, tariff: 0.1, alive: true, last: {}, colonies: 0, gifts: 0, weary: 0 };
  for (const [n, lon, lat, o, p, cap] of CITY_DATA) { const c = makeCity(n, lon, lat, o, p, cap); if (n === 'Gades') c.culture = 'punic'; seedBuildings(c); c.gar = garMax(c); }
  for (const f of FIDS) { const pop = citiesOf(f).reduce((s, c) => s + c.pop, 0); const g = G.fac[f]; g.gold = Math.round(isBarb(FAC[f].cul) ? 80 + pop * 6 : 250 + pop * 5); }
  Object.assign(G.fac.rome, { gold: 500 }); Object.assign(G.fac.carthage, { gold: 650 }); Object.assign(G.fac.ptolemaic, { gold: 800 }); Object.assign(G.fac.seleucid, { gold: 600 });
  // diplomacy
  for (let i = 0; i < FIDS.length; i++) for (let j = i + 1; j < FIDS.length; j++) {
    const a = FIDS[i], b = FIDS[j], ga = CULT[FAC[a].cul].grp, gb = CULT[FAC[b].cul].grp; let r = 0;
    if (FAC[a].cul === FAC[b].cul) r += 20; else if (ga === gb) r += 8;
    r += Math.round((FAC[a].ai.merc + FAC[b].ai.merc) * 6);
    G.rel[dk(a, b)] = r;
  }
  for (const [a, b, r, s] of DIP_START) { setRel(a, b, r); if (s === 'war') { G.war[dk(a, b)] = 1; G.warT[dk(a, b)] = 0; } if (s === 'ally') G.ally[dk(a, b)] = 1; if (s === 'treaty') G.rights[dk(a, b)] = 1; }
  for (const k in G.rel) { G.relBase[k] = G.rel[k]; if (G.rel[k] >= 18 && !G.war[k]) G.rights[k] = 1; }
  for (const g of GIDS) G.prices[g] = GD[g].p;
  // armies
  const place = (f, city, str) => { const c = G.cities.find((x) => x.name === city); if (c) G.armies.push({ id: G.nid++, f, str, at: c.id, mv: null, name: armyName(f) }); };
  place('rome', 'Apollonia', 22); place('rome', 'Placentia', 16); place('rome', 'Roma', 10); place('macedon', 'Pella', 28); place('macedon', 'Korinthos', 10);
  place('seleucid', 'Damaskos', 30); place('ptolemaic', 'Hierosolyma', 22); place('ptolemaic', 'Alexandreia', 10); place('boii', 'Felsina', 14); place('insubres', 'Mediolanum', 10);
  place('carthage', 'Carthago', 6);
  for (const f of FIDS) if (!G.armies.some((a) => a.f === f)) { const cs = citiesOf(f), cap = cs.find((c) => c.capital) || cs[0]; const pop = cs.reduce((s, c) => s + c.pop, 0); if (cap) place(f, cap.name, Math.round(4 + pop * 0.3 * (0.5 + FAC[f].ai.aggr))); }
  computeTerritory();
  for (const c of G.cities) linkCity(c);
  for (const c of G.cities) c.cand = tradeCands(c);
  econ(true); econ(true);
  G.log = [];
  logMsg('Your reign begins. ' + FAC[pid].desc, 'gold');
  historyEvents();
}
function armyName(f) {
  const cul = FAC[f].cul, n = (G.armies.filter((a) => a.f === f).length + 1);
  const ord = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][(n - 1) % 12];
  if (cul === 'roman') return 'Legio ' + ord; if (cul === 'greek' || cul === 'eastern' || cul === 'egyptian') return 'Phalanx ' + ord;
  if (cul === 'punic') return 'Mercenaries ' + ord; if (cul === 'scythian') return 'Horde ' + ord; return 'Warband ' + ord;
}
function logMsg(t, kind) { G.log.unshift({ t, k: kind || '', d: dateStr() }); if (G.log.length > 120) G.log.length = 120; if (typeof onLog === 'function') onLog(); }

// ---- economy ------------------------------------------------------------------
function prod(c) {
  const P = {}, b = c.b, lab = clamp(Math.sqrt(c.pop / (3 + levels(c) * 0.8)), 0.4, 1.3) * (c.order < 30 ? 0.8 : 1);
  for (const g in c.res) {
    const bl = GB[g], L = b[bl] || 0; let m = 0.6 + 0.5 * L;
    if (g === 'wine' || g === 'oil') m = L ? 0.4 + 0.5 * L : 0.4;
    if ((g === 'purple' || g === 'glass' || g === 'papyrus') && !L) m = 0.3;
    if ((g === 'incense' || g === 'spices')) m = 0.5 + 0.4 * L;
    P[g] = c.res[g] * m * lab;
  }
  if (b.vineyard && canWine(c)) P.wine = (P.wine || 0) + b.vineyard * 1.2 * lab;
  if (b.olive && canOlive(c)) P.oil = (P.oil || 0) + b.olive * 1.2 * lab;
  if (b.harbor) P.fish = (P.fish || 0) + b.harbor * 0.6;
  P.pottery = c.pop * 0.03 + (b.workshop || 0) * 0.8 * lab;
  if (b.workshop) P.textiles = b.workshop * 0.9 * lab * c.ratio.textiles;
  if (b.forge) { P.weapons = b.forge * 1.0 * lab * c.ratio.weapons; P.bronze = b.forge * 0.6 * lab * c.ratio.bronze; }
  if (b.pasture && !c.res.wool) P.wool = (P.wool || 0) + b.pasture * 0.5;
  for (const g in P) if (P[g] < 0.01) delete P[g];
  return P;
}
function dem(c, armyStr) {
  const D = {}, t = DEM[CULT[c.culture].grp], wealth = 0.5 + Math.min(1.5, c.pop / 15);
  for (const g in t) D[g] = t[g] * c.pop * (LUX.includes(g) ? wealth : 1);
  if (c.b.workshop) D.wool = (D.wool || 0) + c.b.workshop * 0.9;
  if (c.b.forge) { D.iron = (D.iron || 0) + c.b.forge * 0.9; D.copper = (D.copper || 0) + c.b.forge * 0.45; D.tin = (D.tin || 0) + c.b.forge * 0.15; }
  if (c.q.length) { const b = c.q[0].b; D.timber = (D.timber || 0) + (b === 'harbor' || b === 'walls' || b === 'aqueduct' ? 1.5 : 0.9); if (b === 'walls' || b === 'mine' || b === 'forge') D.iron = (D.iron || 0) + 0.3; }
  if (armyStr) { D.grain = (D.grain || 0) + armyStr * 0.03; D.weapons = (D.weapons || 0) + armyStr * 0.012; D.horses = (D.horses || 0) + armyStr * 0.006; }
  return D;
}
function estValue(a, b, cap, dist, foreign) {
  let v = 0, vol = 0;
  for (const g of GIDS) { const x = Math.min(a.S[g] || 0, b.Q[g] || 0), y = Math.min(b.S[g] || 0, a.Q[g] || 0); if (x + y > 0.02) { v += (x + y) * price(g) * (g === 'grain' ? 1.5 : g === 'timber' ? 2 : 1); vol += x + y; } }
  if (vol > cap) v *= cap / vol;
  return (v / (1 + dist / 220)) * (foreign ? 0.85 : 1);
}
function routeCap(r) {
  const a = C(r.a), b = C(r.b);
  return r.k === 'sea' ? 4 + 2 * ((a.b.harbor || 0) + (b.b.harbor || 0)) : 2 + 1.5 * ((a.b.road || 0) + (b.b.road || 0)) + (a.b.market || 0) * 0.5;
}
function formRoutes() {
  G.routes = G.routes.filter((r) => { const a = C(r.a), b = C(r.b); if (!a.owner || !b.owner || !access(a.owner, b.owner)) { if (a.owner === G.player || b.owner === G.player) r._lost = 1; return false; } return r.pin || (r.low || 0) < 3; });
  const used = new Array(G.cities.length).fill(0), has = new Set();
  for (const r of G.routes) { used[r.a]++; used[r.b]++; has.add(dk(r.a, r.b)); }
  const order = G.cities.filter((c) => c.owner).sort((a, b) => b.pop - a.pop);
  for (const c of order) {
    let guard = 0;
    while (used[c.id] < slots(c) && guard++ < 6) {
      let best = null, bv = 3;
      for (const n of c.cand) {
        const o = C(n.id); if (!o.owner || used[o.id] >= slots(o)) continue; const key = dk(c.id, o.id);
        if (has.has(key) || (G.black[key] && G.black[key] > G.turn) || !access(c.owner, o.owner)) continue;
        const cap = n.k === 'sea' ? 4 + 2 * ((c.b.harbor || 0) + (o.b.harbor || 0)) : 2 + 1.5 * ((c.b.road || 0) + (o.b.road || 0));
        const v = estValue(c, o, cap, n.d, c.owner !== o.owner);
        if (v > bv) { bv = v; best = n; }
      }
      if (!best) break;
      G.routes.push({ id: G.nid++, a: c.id, b: best.id, k: best.k, d: best.d, flows: [], val: 0, low: 0, made: G.turn });
      used[c.id]++; used[best.id]++; has.add(dk(c.id, best.id));
    }
  }
}
function econ(silent) {
  const winter = G.season === 3, cs = G.cities;
  const armyAt = {}; for (const a of G.armies) if (a.at != null) armyAt[a.at] = (armyAt[a.at] || 0) + a.str;
  const fin = {}; for (const f of FIDS) fin[f] = { tax: 0, trade: 0, tariff: 0, sales: 0, bUp: 0, aUp: 0 };
  for (const c of cs) {
    if (!c.owner) continue;
    c.P = prod(c); c.D = dem(c, armyAt[c.id] || 0); c.S = {}; c.Q = {}; c.imp = {}; c.exp = {};
    for (const g of GIDS) { const p = c.P[g] || 0, d = c.D[g] || 0, u = Math.min(p, d); if (p - u > 0.005) c.S[g] = p - u; if (d - u > 0.005) c.Q[g] = d - u; }
  }
  formRoutes();
  // resolve flows, most valuable routes first
  G.routes.sort((x, y) => (y.val || 0) - (x.val || 0));
  for (const r of G.routes) {
    const a = C(r.a), b = C(r.b); let cap = routeCap(r) * (winter && r.k === 'sea' ? 0.35 : 1); r.flows = []; let val = 0;
    if (r.pirate && Math.random() < 0.06 && !silent) { cap *= 0.4; r.raidedT = G.turn; if (a.owner === G.player || b.owner === G.player) logMsg('Pirates plunder cargo on the ' + a.name + '–' + b.name + ' route.', 'bad'); }
    const opts = [];
    for (const g of GIDS) { const x = Math.min(a.S[g] || 0, b.Q[g] || 0), y = Math.min(b.S[g] || 0, a.Q[g] || 0); if (x > 0.01) opts.push([g, 0]); if (y > 0.01) opts.push([g, 1]); }
    const urg = (g) => price(g) * (g === 'grain' ? 3 : g === 'timber' ? 3.5 : 1); opts.sort((p, q) => urg(q[0]) - urg(p[0]));
    for (const [g, dir] of opts) {
      if (cap <= 0.01) break; const src = dir ? b : a, dst = dir ? a : b; const amt = Math.min(src.S[g] || 0, dst.Q[g] || 0, cap); if (amt < 0.01) continue;
      src.S[g] -= amt; dst.Q[g] -= amt; cap -= amt; dst.imp[g] = (dst.imp[g] || 0) + amt; src.exp[g] = (src.exp[g] || 0) + amt;
      const v = amt * price(g); val += v; r.flows.push({ g, dir, amt, v });
      fin[src.owner].trade += v * 0.3 * (1 + 0.1 * (src.b.market || 0));
      if (src.owner !== dst.owner) fin[dst.owner].tariff += v * G.fac[dst.owner].tariff; else fin[dst.owner].tariff += v * 0.04;
    }
    r.val = val; r.low = val < 1.5 ? (r.low || 0) + 1 : 0;
  }
  // settle each city
  for (const c of cs) {
    if (!c.owner) continue; const f = fin[c.owner];
    const need = c.Q.grain || 0; const take = Math.min(c.stock.grain || 0, need); c.stock.grain = (c.stock.grain || 0) - take; c.Q.grain = need - take;
    const stockCap = c.pop * 0.25 * (0.6 + (c.b.granary || 0) * 1.5); const spare = c.S.grain || 0; const keep = Math.min(spare, Math.max(0, stockCap - c.stock.grain)); c.stock.grain += keep; c.S.grain = spare - keep;
    c.fl = {}; for (const g in c.D) c.fl[g] = c.D[g] > 0 ? clamp(1 - (c.Q[g] || 0) / c.D[g], 0, 1) : 1;
    const inRatio = (gs) => { let s = 0, n = 0; for (const g of gs) if (c.D[g]) { s += c.fl[g]; n++; } return n ? 0.25 + 0.75 * (s / n) : 1; };
    c.ratio = { textiles: inRatio(['wool']), weapons: inRatio(['iron']), bronze: inRatio(['copper', 'tin']) };
    for (const g in c.S) { const amt = c.S[g]; f.sales += amt * price(g) * (g === 'silver' || g === 'gold' ? 0.5 : 0.12); }
    f.tax += c.pop * 6 * G.fac[c.owner].tax * (c.order < 35 ? 0.6 : 1) * (0.7 + 0.006 * c.order);
    f.bUp += levels(c) * 0.5;
  }
  for (const a of G.armies) fin[a.f].aUp += a.str * 0.3;
  // prices
  if (!silent) {
    const sp = {}, sd = {}; for (const c of cs) { if (!c.owner) continue; for (const g in c.P) sp[g] = (sp[g] || 0) + c.P[g]; for (const g in c.D) sd[g] = (sd[g] || 0) + c.D[g]; }
    G.lastPrices = Object.assign({}, G.prices); G.supply = sp; G.demand = sd;
    for (const g of GIDS) { const target = GD[g].p * clamp(Math.pow(((sd[g] || 0) + 0.5) / ((sp[g] || 0) + 0.5), 0.6), 0.45, 2.8); G.prices[g] = R1(G.prices[g] * 0.7 + target * 0.3); }
    for (const f of FIDS) { const F = fin[f], g = G.fac[f]; if (!g.alive) continue; F.net = F.tax + F.trade + F.tariff + F.sales - F.bUp - F.aUp; g.gold += F.net; g.last = F; }
  } else for (const f of FIDS) { const F = fin[f]; F.net = F.tax + F.trade + F.tariff + F.sales - F.bUp - F.aUp; G.fac[f].last = F; }
}
function satisfaction(c) {
  const grp = (gs) => { let s = 0, w = 0; for (const g of gs) if (c.D[g]) { s += c.fl[g] * c.D[g] * price(g); w += c.D[g] * price(g); } return w ? s / w : 1; };
  return { food: c.fl.grain == null ? 1 : c.fl.grain, comfort: grp(['wine', 'oil', 'textiles', 'pottery', 'salt', 'fish']), lux: grp(LUX) };
}
function growth() {
  for (const c of G.cities) {
    if (!c.owner) continue; const s = satisfaction(c), fac = G.fac[c.owner], cap = popCap(c);
    let target = 38 + 26 * s.comfort + 10 * s.lux + 8 * (c.b.temple || 0) + (c.capital ? 8 : 0) - (fac.tax - 0.12) * 160 - Math.min(14, fac.weary * 2) - (s.food < 0.9 ? 30 * (0.9 - s.food) : 0) - (fac.gold < 0 ? 12 : 0);
    if (G.armies.some((a) => a.at === c.id && a.f === c.owner)) target += 4;
    c.order = clamp(c.order + (target - c.order) * 0.35, 0, 100);
    if (s.food >= 0.97) c.pop += Math.max(0.02, c.pop * 0.014 * (1 - c.pop / cap)) * (c.pop < cap ? 1 : 0);
    else if (s.food < 0.8) { const loss = c.pop * 0.05 * (0.8 - s.food) * 2; c.pop = Math.max(0.8, c.pop - loss); if (c.owner === G.player && loss > 0.1) logMsg('Famine in ' + c.name + ': the granaries are empty and people are leaving.', 'bad'); }
    if (c.order < 12 && Math.random() < 0.3) { c.pop *= 0.97; if (c.owner === G.player) logMsg('Riots in ' + c.name + '. Lower taxes, build a temple or bring in wine and oil.', 'bad'); }
    c.pop = R1(Math.max(0.8, c.pop));
    c.gar = Math.min(garMax(c), c.gar + 1.5);
  }
}
function construction() {
  for (const c of G.cities) {
    if (!c.owner || !c.q.length) continue; const it = c.q[0]; const mat = c.fl.timber == null ? 1 : c.fl.timber;
    it.done += 0.6 + 0.4 * mat; it.ts = performance.now ? performance.now() : 0;
    if (it.done >= it.need - 0.001) {
      c.b[it.b] = (c.b[it.b] || 0) + 1; c.q.shift(); c.flash = { b: it.b, t: performance.now() };
      if (c.owner === G.player) logMsg(bname(it.b, c.culture) + ' ' + roman(c.b[it.b]) + ' completed in ' + c.name + '.', 'good');
      if (it.b === 'harbor' && c.b.harbor === 1) { c.cand = tradeCands(c); }
    }
  }
}
const roman = (n) => ['', 'I', 'II', 'III', 'IV', 'V'][n] || n;
function buildCost(c, b) { const L = c.b[b] || 0, pend = c.q.filter((q) => q.b === b).length; return Math.round(BLD[b].cost * (1 + 0.6 * (L + pend)) * (isBarb(c.culture) ? 0.8 : 1)); }
function buildTime(c, b) { return BLD[b].t + (c.b[b] || 0); }
function canBuild(c, b) {
  const L = (c.b[b] || 0) + c.q.filter((q) => q.b === b).length;
  if (L >= BLD[b].max) return 'Fully built';
  if (c.q.length >= 3) return 'Queue full (3)';
  if (b === 'harbor' && !c.port) return 'Needs a coastline';
  if (b === 'olive' && !canOlive(c)) return 'Climate too cold or dry';
  if (b === 'vineyard' && !canWine(c)) return 'Too far north for vines';
  if (b === 'mine' && !METALS.some((m) => c.res[m])) return 'No ore here';
  if (b === 'lumber' && !(c.res.timber || c.res.furs || c.res.amber)) return 'No forests nearby';
  if (b === 'aqueduct' && isBarb(c.culture)) return 'Your engineers cannot build this';
  if (b === 'aqueduct' && c.pop < 6) return 'Needs population 6k';
  if (b === 'forge' && c.pop < 3) return 'Needs population 3k';
  return '';
}
function queueBuild(c, b) {
  const why = canBuild(c, b); if (why) return why; const cost = buildCost(c, b), f = G.fac[c.owner];
  if (f.gold < cost) return 'Not enough ' + FAC[c.owner].cur;
  f.gold -= cost; c.q.push({ b, need: buildTime(c, b), done: 0, cost, ts: performance.now() }); return '';
}

// ---- military -----------------------------------------------------------------
function raiseCost(c) { return Math.round((c.b.barracks ? 90 : 130) * (isBarb(c.culture) ? 0.7 : 1)); }
function raiseStr(c) { return Math.round(12 + (c.b.barracks || 0) * 4 + (c.fl.weapons != null ? c.fl.weapons * 3 : 0) + (c.res.horses ? 2 : 0)); }
function raiseArmy(c) {
  const f = G.fac[c.owner], cost = raiseCost(c);
  if (f.gold < cost) return 'Not enough ' + FAC[c.owner].cur; if (c.pop < 2.5) return 'Too few people to levy';
  f.gold -= cost; c.pop = R1(c.pop - 0.4);
  const ex = G.armies.find((a) => a.at === c.id && a.f === c.owner && !a.mv);
  if (ex) ex.str += raiseStr(c); else G.armies.push({ id: G.nid++, f: c.owner, str: raiseStr(c), at: c.id, mv: null, name: armyName(c.owner) });
  return '';
}
function reach(from, to) {
  // returns {k:'land'|'sea', d, turns} or null
  if (from === to) return null; let best = null;
  const ln = from.landN.find((n) => n.id === to.id); if (ln) best = { k: 'land', d: ln.d, turns: Math.max(1, Math.ceil(ln.d / (9 + 3 * (from.b.road || 0)))) };
  if (from.port && to.port && (from.b.harbor || 0) >= 1) { const sn = from.seaN.find((n) => n.id === to.id); if (sn) { const t = Math.max(1, Math.ceil(sn.d / 45) * (G.season === 3 ? 2 : 1)); if (!best || t < best.turns) best = { k: 'sea', d: sn.d, turns: t }; } }
  return best;
}
function pathBetween(a, b, k) {
  if (k === 'land') return [[a.x + 0.5, a.y + 0.5], [b.x + 0.5, b.y + 0.5]];
  const key = a.id < b.id ? a.id + '-' + b.id : b.id + '-' + a.id; let p = PATHS.get(key);
  if (!p) {
    const lo = a.id < b.id ? a : b, hi = a.id < b.id ? b : a; const f = seaField(lo.w, MAXSEA + 20);
    p = [[lo.x + 0.5, lo.y + 0.5], ...stringPull(seaPathCells(f, hi.w)), [hi.x + 0.5, hi.y + 0.5]]; PATHS.set(key, p);
  }
  return a.id < b.id ? p : p.slice().reverse();
}
const PATHS = new Map();
function march(army, target, order) {
  const from = C(army.at), r = reach(from, target); if (!r) return 'Out of reach';
  if (order !== 'move' && !atWar(army.f, target.owner)) return 'Not at war with ' + fname(target.owner);
  if (order === 'move' && target.owner !== army.f && !allied(army.f, target.owner)) return 'Can only station troops in your own or allied cities';
  army.mv = { from: from.id, to: target.id, k: r.k, turns: r.turns, done: 0, order, ts: performance.now() }; army.at = null; return '';
}
function battle(army, c) {
  const defF = c.owner; const defArmies = G.armies.filter((a) => a.at === c.id && (a.f === defF || allied(a.f, defF)));
  const defStr = (c.gar + defArmies.reduce((s, a) => s + a.str, 0)) * (1 + 0.25 * (c.b.walls || 0));
  const att = army.str * (0.8 + Math.random() * 0.45), def = defStr * (0.8 + Math.random() * 0.45);
  const mine = army.f === G.player || defF === G.player;
  if (army.mv.order === 'raid') {
    if (att > def * 0.6) {
      const loot = Math.max(0, Math.round(Math.min(G.fac[defF].gold * 0.1 + c.pop * 5, 160))); G.fac[defF].gold -= loot; G.fac[army.f].gold += loot; c.order = Math.max(0, c.order - 15); c.pop = R1(c.pop * 0.96);
      army.str = Math.max(3, Math.round(army.str - def * 0.15)); if (mine) logMsg(army.name + ' of ' + FAC[army.f].short + ' raids ' + c.name + ' and carries off ' + loot + ' ' + FAC[army.f].cur + '.', army.f === G.player ? 'good' : 'bad');
    } else { army.str = Math.round(army.str * 0.55); if (mine) logMsg('The raid on ' + c.name + ' is beaten off.', army.f === G.player ? 'bad' : 'good'); }
    return 'back';
  }
  if (att > def) {
    const old = c.owner; c.owner = army.f; c.capital = false; c.order = 22; c.pop = R1(c.pop * 0.9); c.gar = 2; c.q = [];
    for (const a of defArmies) a.str = 0; army.str = Math.max(3, Math.round(army.str - def * 0.45));
    G.armies = G.armies.filter((a) => a.str > 0);
    G._terrDirty = true; addRel(army.f, old, -20);
    if (mine || c.pop > 10) logMsg(FAC[army.f].short + ' storms ' + c.name + ' (' + FAC[old].short + ').', army.f === G.player ? 'good' : old === G.player ? 'bad' : '');
    checkAlive(old);
    return 'stay';
  }
  army.str = Math.round(army.str - def * 0.5); c.gar = Math.max(1, c.gar - att * 0.3);
  for (const a of defArmies) a.str = Math.max(2, Math.round(a.str - att * 0.15));
  if (mine) logMsg(army.name + ' (' + FAC[army.f].short + ') is thrown back from the walls of ' + c.name + '.', army.f === G.player ? 'bad' : 'good');
  return army.str < 3 ? 'die' : 'back';
}
function checkAlive(f) {
  if (citiesOf(f).length) return; G.fac[f].alive = false; G.armies = G.armies.filter((a) => a.f !== f);
  for (const k of Object.keys(G.war)) if (k.split('|').includes(f)) delete G.war[k];
  logMsg(fname(f) + ' has ceased to exist as a state.', f === G.player ? 'bad' : 'gold');
  if (f === G.player && typeof onDefeat === 'function') onDefeat();
}
function moveArmies() {
  for (const a of G.armies.slice()) {
    if (!a.mv) continue; a.mv.done++; a.mv.ts = performance.now();
    if (a.mv.done < a.mv.turns) continue;
    const t = C(a.mv.to), from = C(a.mv.from);
    if (t.owner === a.f || allied(t.owner, a.f)) { a.at = t.id; a.mv = null; mergeAt(a); continue; }
    if (!atWar(a.f, t.owner)) { a.at = from.owner === a.f ? from.id : t.id; a.mv = null; if (from.owner !== a.f) a.at = nearestOwn(a.f, t) ?? t.id; continue; }
    const res = battle(a, t);
    if (res === 'stay') { a.at = t.id; a.mv = null; }
    else if (res === 'die') { G.armies = G.armies.filter((x) => x !== a); }
    else { const back = from.owner === a.f ? from.id : nearestOwn(a.f, t); if (back == null) G.armies = G.armies.filter((x) => x !== a); else { a.at = back; a.mv = null; } }
  }
  for (const a of G.armies) mergeAt(a);
}
function nearestOwn(f, c) { let best = null, bd = 1e9; for (const o of citiesOf(f)) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (d < bd) { bd = d; best = o.id; } } return best; }
function mergeAt(a) { if (a.at == null || a.mv) return; const o = G.armies.find((x) => x !== a && x.f === a.f && x.at === a.at && !x.mv); if (o) { o.str += a.str; a.str = 0; G.armies = G.armies.filter((x) => x.str > 0); } }

// ---- colonies -----------------------------------------------------------------
function colonyCost(c) { return isBarb(c.culture) ? 100 : 150; }
let COLONY_FIELD = null; // {origin, field}
function colonyField(origin) { if (!origin.port) return null; if (COLONY_FIELD && COLONY_FIELD.id === origin.id) return COLONY_FIELD.f; COLONY_FIELD = { id: origin.id, f: seaField(origin.w, MAXSEA) }; return COLONY_FIELD.f; }
function siteInfo(x, y, origin) {
  const i = y * W + x; if (x < 0 || y < 0 || x >= W || y >= H || !land[i]) return { ok: false, why: 'Open sea' };
  const t = terr[i]; if (t === T.MTN) return { ok: false, why: 'Mountains: no room for a town' };
  if (cellCity[i] >= 0) return { ok: false, why: 'Claimed by ' + C(cellCity[i]).name };
  for (const c of G.cities) if (c.owner && Math.hypot(c.x - x, c.y - y) < 5) return { ok: false, why: 'Too close to ' + c.name };
  let wbest = -1, wd = 65535; const f = origin ? colonyField(origin) : null;
  for (const [dx, dy] of NB8) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (land[j]) continue; if (f && f[j] < wd) { wd = f[j]; wbest = j; } else if (!f && wbest < 0 && (compSize['S' + waterComp[j]] || 0) > 300) wbest = j; }
  const coastal = wbest >= 0 || findPortWater(x, y) >= 0;
  const out = { ok: true, coastal, res: genRes(x, y, coastal), t };
  if (!origin) return out;
  if (wbest >= 0 && wd < 65535) { out.k = 'sea'; out.d = wd; out.w = wbest; out.turns = Math.max(1, Math.ceil(wd / 40) * (G.season === 3 ? 2 : 1)); return out; }
  if (landComp[i] === origin.lc) { const s = lineStats(origin.x, origin.y, x, y); if (s.d <= 26 && s.wtr < 0.15) { out.k = 'land'; out.d = s.d; out.turns = Math.max(1, Math.ceil(s.d / 8)); return out; } }
  return { ok: false, why: origin.port ? 'Beyond the reach of ' + origin.name + '\'s ships' : 'Too far overland from ' + origin.name };
}
function prospectValue(res) { let v = 0; for (const g in res) v += res[g] * price(g); return v; }
function colonyName(x, y, cul) {
  const used = new Set(G.cities.map((c) => c.name)); const [lon, lat] = cellLL(x, y);
  for (const [n, sl, st] of HIST_SITES) if (!used.has(n) && Math.hypot((lon - sl) * KX, lat - st) < 0.5) return n;
  for (const n of COLONY_NAMES[cul] || []) if (!used.has(n)) return n;
  return 'Nova ' + (G.cities.length + 1);
}
function launchColony(origin, x, y, name) {
  const s = siteInfo(x, y, origin); if (!s.ok) return s.why; const f = G.fac[origin.owner], cost = colonyCost(origin);
  if (f.gold < cost) return 'Needs ' + cost + ' ' + FAC[origin.owner].cur; if (origin.pop < 3.5) return origin.name + ' needs at least 3.5k people to spare colonists';
  if (s.k === 'sea' && !(origin.b.harbor >= 1)) return 'Build a harbour in ' + origin.name + ' first';
  f.gold -= cost; origin.pop = R1(origin.pop - 1.5);
  let path;
  if (s.k === 'sea') { const fld = colonyField(origin); path = [[origin.x + 0.5, origin.y + 0.5], ...stringPull(seaPathCells(fld, s.w)), [x + 0.5, y + 0.5]]; }
  else path = [[origin.x + 0.5, origin.y + 0.5], [x + 0.5, y + 0.5]];
  G.fleets.push({ id: G.nid++, f: origin.owner, from: origin.id, x, y, name: name || colonyName(x, y, origin.culture), k: s.k, turns: s.turns, done: 0, path, culture: origin.culture, ts: performance.now() });
  return '';
}
function moveFleets() {
  for (const fl of G.fleets.slice()) {
    fl.done++; fl.ts = performance.now(); if (fl.done < fl.turns) continue;
    G.fleets = G.fleets.filter((x) => x !== fl);
    const i = fl.y * W + fl.x;
    if (cellCity[i] >= 0 && C(cellCity[i]).owner !== fl.f) { if (fl.f === G.player) logMsg('The colonists bound for ' + fl.name + ' found the land taken and turned home.', 'bad'); continue; }
    const [lon, lat] = cellLL(fl.x, fl.y);
    const c = makeCity(fl.name, lon, lat, fl.f, 1.6, false, { culture: fl.culture, colony: true }); c.pop0 = 1.6; c.b = {}; c.order = 70; c.gar = garMax(c);
    linkCity(c); c.cand = tradeCands(c); for (const n of [...c.seaN, ...c.landN]) { const o = C(n.id); o.cand = tradeCands(o); }
    G.fac[fl.f].colonies++; G._terrDirty = true;
    const near = G.cities.filter((o) => o.owner && o.owner !== fl.f && Math.hypot(o.x - c.x, o.y - c.y) < 16);
    for (const o of near) addRel(fl.f, o.owner, -10);
    logMsg(FAC[fl.f].short + ' founds the colony of ' + c.name + '.', fl.f === G.player ? 'good' : '');
    if (fl.f === G.player && typeof onColony === 'function') onColony(c);
  }
}

// ---- diplomacy ----------------------------------------------------------------
function strength(f) { return G.armies.filter((a) => a.f === f).reduce((s, a) => s + a.str, 0) + citiesOf(f).reduce((s, c) => s + c.gar, 0) * 0.5; }
function declareWar(a, b) {
  const k = dk(a, b); G.war[k] = 1; G.warT[k] = G.turn; delete G.ally[k]; delete G.rights[k]; setRel(a, b, rel(a, b) - 50);
  logMsg(fname(a) + ' declares war on ' + fname(b) + '.', a === G.player || b === G.player ? 'bad' : '');
  for (const f of FIDS) if (allied(f, b) && f !== a && G.fac[f].alive && Math.random() < 0.7) { const k2 = dk(f, a); if (!G.war[k2]) { G.war[k2] = 1; G.warT[k2] = G.turn; delete G.ally[k2]; delete G.rights[k2]; setRel(f, a, rel(f, a) - 40); logMsg(fname(f) + ' honours its alliance and joins the war against ' + fname(a) + '.', f === G.player || a === G.player ? 'bad' : ''); } }
}
function makePeace(a, b) { const k = dk(a, b); delete G.war[k]; setRel(a, b, Math.max(rel(a, b), -20) + 15); logMsg(fname(a) + ' and ' + fname(b) + ' make peace.', a === G.player || b === G.player ? 'good' : ''); }
function playerDip(action, f) {
  const p = G.player, r = rel(p, f), mf = FAC[f].ai.merc, pf = G.fac[p];
  if (action === 'rights') {
    if (atWar(p, f)) return ['bad', 'You are at war.'];
    const score = r + mf * 25 - pf.tariff * 80 + (allied(p, f) ? 30 : 0);
    if (score >= 12) { G.rights[dk(p, f)] = 1; addRel(p, f, 3); return ['good', fname(f) + ' grants trade rights. Merchants may now sail and cart between you.']; }
    addRel(p, f, -2); return ['bad', fname(f) + ' refuses. Relations ' + r + '; a gift, lower tariffs or an alliance would help.'];
  }
  if (action === 'revoke') { delete G.rights[dk(p, f)]; addRel(p, f, -15); return ['', 'Trade rights with ' + fname(f) + ' revoked. Their merchants are expelled.']; }
  if (action === 'gift') { const amt = 100; if (pf.gold < amt) return ['bad', 'You cannot afford the gift.']; pf.gold -= amt; const gain = Math.round(14 / (1 + pf.gifts * 0.1)); pf.gifts++; addRel(p, f, gain); return ['good', 'Gift of ' + amt + ' ' + FAC[p].cur + ' accepted. Relations +' + gain + '.']; }
  if (action === 'ally') { if (atWar(p, f)) return ['bad', 'Make peace first.']; if (r >= 60) { G.ally[dk(p, f)] = 1; G.rights[dk(p, f)] = 1; return ['good', 'Alliance sworn with ' + fname(f) + '.']; } return ['bad', fname(f) + ' wants relations of 60 or more before an alliance (now ' + r + ').']; }
  if (action === 'war') { declareWar(p, f); return ['bad', 'War declared on ' + fname(f) + '.']; }
  if (action === 'peace') {
    const age = G.turn - (G.warT[dk(p, f)] || 0), ratio = strength(f) / Math.max(1, strength(p));
    if (age >= 3 && (ratio < 0.9 || Math.random() < 0.35 + (age - 3) * 0.04 || r > -40)) { makePeace(p, f); return ['good', 'Peace concluded with ' + fname(f) + '.']; }
    return ['bad', fname(f) + ' will not treat yet. Win battles or wait a few seasons.'];
  }
  if (action === 'breakally') { delete G.ally[dk(p, f)]; addRel(p, f, -25); return ['', 'Alliance with ' + fname(f) + ' dissolved.']; }
  return ['', ''];
}
function neighbours(f) {
  const set = new Set(); for (const c of citiesOf(f)) { for (const n of c.landN) if (n.raw < 34) set.add(C(n.id).owner); for (const n of c.seaN) if (n.d < 90) set.add(C(n.id).owner); }
  set.delete(f); set.delete(null); set.delete(undefined); return [...set].filter((x) => G.fac[x] && G.fac[x].alive);
}

// ---- AI -------------------------------------------------------------------------
function aiTurn(f) {
  const F = G.fac[f], A = FAC[f].ai, cs = citiesOf(f); if (!cs.length) return;
  const wars = FIDS.filter((o) => atWar(f, o));
  // build
  let builds = 0;
  for (const c of cs.slice().sort((a, b) => b.pop - a.pop)) {
    if (builds >= 2 || c.q.length) continue;
    let best = null, bs = 0;
    for (const b of BORDER) {
      if (canBuild(c, b)) continue; const cost = buildCost(c, b); if (cost > F.gold * 0.55) continue; let s = 1;
      if (b === 'farm' && (c.fl.grain ?? 1) < 0.95) s = 6; if (b === 'granary' && (c.fl.grain ?? 1) < 0.9) s = 3;
      if (b === 'harbor' && !(c.b.harbor)) s = 5 + A.merc * 3; if (b === 'market') s = 2 + A.merc * 3;
      if (b === 'temple' && c.order < 50) s = 5; if (b === 'walls' && wars.length) s = 3 + (c.b.walls ? 0 : 2);
      if (b === 'mine') s = 4; if ((b === 'vineyard' || b === 'olive') && !isBarb(c.culture)) s = 3;
      if (b === 'aqueduct' && c.pop > popCap(c) * 0.9) s = 4; if ((b === 'workshop' || b === 'forge') && c.pop > 6) s = 2.5;
      if (b === 'barracks' && c.capital && A.aggr > 0.5) s = 2.5; if (b === 'road' && c.culture === 'roman') s = 2;
      if (b === 'lumber' && (c.fl.timber ?? 1) < 0.8) s = 3; if (b === 'pasture') s = 1.5;
      s *= 0.7 + Math.random() * 0.6;
      if (s > bs) { bs = s; best = b; }
    }
    if (best && !queueBuild(c, best)) builds++;
  }
  // armies
  const myArmies = G.armies.filter((a) => a.f === f), total = myArmies.reduce((s, a) => s + a.str, 0);
  const inc = F.last.net || 0;
  if (wars.length && F.gold > 160 && total < 20 + cs.length * 6 && Math.random() < 0.6) {
    const front = cs.slice().sort((a, b) => b.pop - a.pop)[0]; raiseArmy(front);
  } else if (!wars.length && total < 4 + cs.length * 2 && F.gold > 300 && inc > 5) raiseArmy(cs[0]);
  const capC = cs.find((c) => c.capital) || cs[0], reachR = 40 + 30 * A.aggr;
  for (const a of G.armies.filter((x) => x.f === f && !x.mv && x.at != null)) {
    if (!wars.length) continue; const home = C(a.at); let best = null, bs = -1e9;
    const cand = [...home.landN.filter((n) => n.raw < 30).map((n) => n.id), ...(home.port && home.b.harbor && (!isBarb(FAC[f].cul) || A.merc >= 0.5) ? home.seaN.filter((n) => n.d < 110).map((n) => n.id) : [])];
    for (const id of cand) {
      const t = C(id); if (!t.owner || !atWar(f, t.owner) || Math.hypot(t.x - capC.x, t.y - capC.y) > reachR) continue; const r = reach(home, t); if (!r) continue;
      const def = (t.gar + G.armies.filter((x) => x.at === t.id && x.f === t.owner).reduce((s, x) => s + x.str, 0)) * (1 + 0.25 * (t.b.walls || 0));
      const s = a.str / Math.max(1, def) * 10 - r.turns * 2 + t.pop * 0.3;
      if (s > bs) { bs = s; best = [t, def]; }
    }
    if (best) { const [t, def] = best; if (a.str > def * 1.35 && !(t.owner === G.player && G.turn < 3)) march(a, t, 'attack'); else if (isBarb(FAC[f].cul) && a.str > def * 0.7 && Math.random() < 0.5) march(a, t, 'raid'); }
  }
  // diplomacy
  if (wars.length < 2 && Math.random() < A.aggr * 0.025 && F.gold > 100) {
    const ns = neighbours(f).filter((o) => rel(f, o) < 5 && !allied(f, o) && !atWar(f, o));
    const target = ns.sort((x, y) => strength(x) - strength(y))[0];
    if (target && strength(target) < strength(f) * 0.9) declareWar(f, target);
  }
  for (const o of wars) {
    if (o === G.player) continue; const age = G.turn - (G.warT[dk(f, o)] || 0);
    if (age > 8 && Math.random() < 0.05 + (age - 8) * 0.008) makePeace(f, o);
  }
  if (G.turn % 4 === (FIDS.indexOf(f) % 4)) {
    for (const o of neighbours(f)) { if (o === G.player) continue; const k = dk(f, o); if (!G.rights[k] && !G.war[k] && rel(f, o) + (A.merc + FAC[o].ai.merc) * 12 >= 18 && Math.random() < 0.35) G.rights[k] = 1; }
    const p = G.player; if (G.fac[p].alive && !rights(f, p) && !atWar(f, p) && neighbours(f).includes(p) && rel(f, p) >= 35 && Math.random() < 0.4) { G.rights[dk(f, p)] = 1; logMsg(fname(f) + ' opens its markets to your merchants: trade rights granted.', 'good'); }
  }
  // colonise
  if (A.colon > 0.35 && F.gold > 280 && Math.random() < A.colon * 0.05) aiColony(f);
}
function aiColony(f) {
  const origins = citiesOf(f).filter((c) => c.port && (c.b.harbor || 0) >= 1 && c.pop >= 4); if (!origins.length) return;
  const o = origins[Math.floor(Math.random() * origins.length)]; const fld = colonyField(o); let best = null, bs = 0;
  for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
    const i = y * W + x; if (!land[i] || cellCity[i] >= 0 || coastD[i] > 1 || terr[i] === T.MTN) continue;
    let wd = 65535; for (const [dx, dy] of NB8) { const j = (y + dy) * W + x + dx; if (!land[j] && fld[j] < wd) wd = fld[j]; } if (wd > 260) continue;
    const s = prospectValue(genRes(x, y, true)) - wd * 0.08 + Math.random() * 6; if (s > bs) { bs = s; best = [x, y]; }
  }
  if (best) launchColony(o, best[0], best[1]);
}

// ---- events -------------------------------------------------------------------
function historyEvents() {
  for (const [y, s, t] of HISTORY) if (y === G.year && s === G.season && !G.hist[y + '.' + s]) { G.hist[y + '.' + s] = 1; logMsg(t, 'hist'); }
  if (G.year === -196 && G.season === 1 && !atWar('rome', 'achaea')) for (const f of FIDS) if (FAC[f].cul === 'greek' && f !== 'macedon') addRel('rome', f, 10);
  if (G.year === -195 && G.season === 2) addRel('carthage', 'seleucid', 20);
}
function randomEvents() {
  if (Math.random() < 0.25) {
    const cs = citiesOf(G.player); if (!cs.length) return; const c = cs[Math.floor(Math.random() * cs.length)]; const r = Math.random();
    if (r < 0.3 && c.res.grain) { c.stock.grain = (c.stock.grain || 0) + c.pop * 0.3; logMsg('A bumper harvest fills the granaries of ' + c.name + '.', 'good'); }
    else if (r < 0.45) { c.pop = R1(c.pop * 0.95); logMsg('Fever strikes ' + c.name + '.', 'bad'); }
    else if (r < 0.6 && c.port) { G.fac[G.player].gold += 40; logMsg('A merchant of ' + c.name + ' returns rich from a far voyage and pays his dues: +40.', 'good'); }
    else if (r < 0.7) { c.order = Math.min(100, c.order + 10); logMsg('Favourable omens are read in ' + c.name + '. The people are content.', 'good'); }
  }
}
function flagPirates() {
  const havens = G.cities.filter((c) => c.owner && PIRATES.includes(c.owner) && c.port);
  for (const r of G.routes) {
    if (r.k !== 'sea') { r.pirate = false; continue; } const a = C(r.a), b = C(r.b);
    if (PIRATES.includes(a.owner) || PIRATES.includes(b.owner)) { r.pirate = false; continue; }
    const p = pathBetween(a, b, 'sea'); let near = false;
    for (const h of havens) { for (let i = 0; i < p.length && !near; i++) if (Math.hypot(p[i][0] - h.x, p[i][1] - h.y) < 14) near = true; if (near) break; }
    r.pirate = near && !(a.owner === 'rhodes' || b.owner === 'rhodes');
  }
}

// ---- goals --------------------------------------------------------------------
function goalsOf(f) { return GOALS[f] || DEFAULT_GOALS; }
function goalStatus(f, g) {
  const cs = citiesOf(f);
  if (g.t === 'own') { const n = g.c.filter((nm) => G.cities.some((c) => c.name === nm && c.owner === f)).length; return [n === g.c.length, n + '/' + g.c.length]; }
  if (g.t === 'gold') return [G.fac[f].gold >= g.n, Math.round(G.fac[f].gold) + '/' + g.n];
  if (g.t === 'colonies') return [G.fac[f].colonies >= g.n, G.fac[f].colonies + '/' + g.n];
  if (g.t === 'routes') { const n = G.routes.filter((r) => C(r.a).owner === f || C(r.b).owner === f).length; return [n >= g.n, n + '/' + g.n]; }
  if (g.t === 'cities') { const base = CITY_DATA.filter((d) => d[3] === f).length * g.x; return [cs.length >= base, cs.length + '/' + base]; }
  if (g.t === 'army') { const s = G.armies.filter((a) => a.f === f).reduce((x, a) => x + a.str, 0); return [s >= g.n, Math.round(s) + '/' + g.n]; }
  if (g.t === 'blevel') { const c = G.cities.find((x) => x.name === g.c && x.owner === f); const L = c ? c.b[g.b] || 0 : 0; return [L >= g.n, L + '/' + g.n]; }
  if (g.t === 'survive') return [G.year >= -146 && G.fac[f].alive, yearStr(G.year)];
  return [false, ''];
}

// ---- the turn -------------------------------------------------------------------
function endTurn() {
  const p = G.player;
  for (const f of FIDS) if (f !== p && G.fac[f].alive) aiTurn(f);
  econ(false); construction(); growth(); moveArmies(); moveFleets();
  for (const f of FIDS) { const wars = FIDS.filter((o) => atWar(f, o)).length; G.fac[f].weary = wars ? Math.min(8, G.fac[f].weary + 0.25) : Math.max(0, G.fac[f].weary - 0.5); if (G.fac[f].gold < -50) for (const a of G.armies) if (a.f === f) a.str = Math.max(1, Math.round(a.str * 0.9)); }
  for (const k in G.rel) { const b = G.relBase[k] ?? 0, r = G.rel[k]; if (!G.war[k]) G.rel[k] = r + Math.sign(b - r) * Math.min(1, Math.abs(b - r)); }
  const lost = G.routes.filter((r) => r._lost); for (const r of lost) delete r._lost;
  G.turn++; G.season++; if (G.season > 3) { G.season = 0; G.year++; if (G.year === 0) G.year = 1; }
  if (G._terrDirty || G.turn % 4 === 0) computeTerritory();
  if (G.turn % 2 === 0) flagPirates();
  historyEvents(); randomEvents();
  for (const g of goalsOf(p)) { const key = g.d; const [ok] = goalStatus(p, g); if (ok && !G.done[key]) { G.done[key] = 1; logMsg('Ambition fulfilled: ' + g.d + '.', 'gold'); } }
  if (G.year === -146 && G.season === 0 && !G.hist.end) { G.hist.end = 1; logMsg('Fifty-four years have passed since you took power. The age of the successors is ending; the game continues as long as you wish.', 'gold'); }
}
