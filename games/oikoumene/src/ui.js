'use strict';
// ============================================================================
// Interface: top bar, side panel, chronicle, start screen, input.
// ============================================================================
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) > 0 && Math.abs(v) < 0.1 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10).toLocaleString('en');
const UI = { sel: null, mode: null, mapMode: 'political', tab: 'econ', hover: null, dipSel: null, startPick: 'rome' };
let MAPCTX, SCENE, SCENECTX;
const SAVE_KEY = 'oikoumene-save-v1';

const chip = (f) => '<span class="fchip" style="--c:' + FAC[f].col + '">' + esc(FAC[f].short) + '</span>';
const gchip = (g, extra) => '<span class="gchip" style="--c:' + GD[g].c + '">' + esc(GD[g].n) + (extra != null ? ' <b>' + extra + '</b>' : '') + '</span>';
const cur = (f) => FAC[f || G.player].cur;
const bar = (v, max, cls) => '<span class="bar ' + (cls || '') + '"><i style="width:' + clamp((v / max) * 100, 0, 100) + '%"></i></span>';
function toast(msg, kind) { const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg; $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3200); setTimeout(() => el.remove(), 3800); }

// ---- top bar -------------------------------------------------------------------
function renderTop() {
  if (!G) return; const p = G.player, F = G.fac[p], cs = citiesOf(p);
  $('#tb-crest').style.setProperty('--c', FAC[p].col); $('#tb-name').textContent = FAC[p].name;
  $('#tb-date').textContent = dateStr(); $('#tb-sea').hidden = G.season !== 3;
  $('#tb-gold').textContent = fmt(F.gold) + ' ' + FAC[p].cur;
  const net = F.last.net || 0; $('#tb-inc').textContent = (net >= 0 ? '+' : '') + fmt(net) + ' / season'; $('#tb-inc').className = net >= 0 ? 'pos' : 'neg';
  $('#tb-pop').textContent = fmt(cs.reduce((s, c) => s + c.pop, 0)) + 'k people · ' + cs.length + ' cities';
  document.querySelectorAll('[data-mapmode]').forEach((b) => b.classList.toggle('on', b.dataset.mapmode === UI.mapMode));
}
function onLog() { renderChron(); }
function renderChron() {
  if (!G) return; const el = $('#chron-list'); const items = G.log.slice(0, UI.chronOpen ? 40 : 4);
  el.innerHTML = items.map((e) => '<li class="' + e.k + '"><span>' + esc(e.d) + '</span>' + esc(e.t) + '</li>').join('');
}

// ---- panel ---------------------------------------------------------------------
function select(sel) { UI.sel = sel; if (sel && sel.type === 'city' && C(sel.id).owner !== G.player && UI.tab === 'build') UI.tab = 'econ'; renderPanel(); }
function renderPanel() {
  const el = $('#panel'); if (!G || !UI.sel) { el.hidden = true; return; } el.hidden = false; const s = UI.sel; let h = '';
  if (s.type === 'city') h = cityPanel(C(s.id));
  else if (s.type === 'route') { const r = G.routes.find((x) => x.id === s.id); if (!r) { UI.sel = null; el.hidden = true; return; } h = routePanel(r); }
  else if (s.type === 'realm') h = realmPanel();
  else if (s.type === 'dip') h = dipPanel();
  else if (s.type === 'ledger') h = ledgerPanel();
  else if (s.type === 'market') h = marketPanel();
  else if (s.type === 'land') h = landPanel(s.x, s.y);
  else if (s.type === 'army') { const a = G.armies.find((x) => x.id === s.id); if (!a) { UI.sel = null; el.hidden = true; return; } h = armyPanel(a); }
  else if (s.type === 'help') h = helpPanel();
  const key = s.type + ':' + (s.id ?? s.x ?? '') + ':' + (s.y ?? ''); const sc = key === UI._panelKey ? el.scrollTop : 0; UI._panelKey = key; el.innerHTML = h; el.scrollTop = sc;
  const slot = el.querySelector('#scene-slot'); if (slot) slot.appendChild(SCENE);
}
const head = (title, sub, col) => '<header class="ph"><span class="crest" style="--c:' + (col || '#c9a24a') + '"></span><div><h2>' + esc(title) + '</h2><div class="sub">' + sub + '</div></div><button class="x" data-a="close" aria-label="Close panel">×</button></header>';

function cityPanel(c) {
  const mine = c.owner === G.player, cul = CULT[c.culture], s = satisfaction(c), q = c.q[0];
  const armies = G.armies.filter((a) => a.at === c.id);
  let h = head(c.name, chip(c.owner) + ' · ' + cul.lbl + (c.capital ? ' · capital' : '') + (c.colony ? ' · colony' : '') + ' · ' + TNAME[terr[c.y * W + c.x]], FAC[c.owner].col);
  h += '<div class="scene"><div id="scene-slot"></div><div class="scap">' + (q ? 'Building <b>' + esc(bname(q.b, c.culture)) + ' ' + roman((c.b[q.b] || 0) + 1) + '</b> · ' + Math.max(1, Math.ceil((q.need - q.done) / (0.6 + 0.4 * (c.fl.timber ?? 1)))) + ' season(s) left' + ((c.fl.timber ?? 1) < 0.7 ? ' · <span class="neg">short of timber, work is slow</span>' : '') : 'No construction under way') + '</div></div>';
  h += '<div class="kv"><div><span>People</span><b>' + fmt(c.pop) + 'k</b><small>ceiling ' + fmt(popCap(c)) + 'k</small></div><div><span>Order</span><b class="' + (c.order < 35 ? 'neg' : c.order > 60 ? 'pos' : '') + '">' + Math.round(c.order) + '</b>' + bar(c.order, 100, c.order < 35 ? 'bad' : '') + '</div><div><span>Food</span><b class="' + (s.food < 0.9 ? 'neg' : 'pos') + '">' + Math.round(s.food * 100) + '%</b><small>' + fmt(c.stock.grain || 0) + ' in store</small></div><div><span>Comforts</span><b>' + Math.round(s.comfort * 100) + '%</b><small>luxuries ' + Math.round(s.lux * 100) + '%</small></div></div>';
  const tabs = [['econ', 'Economy'], ['build', mine ? 'Build' : 'Buildings'], ['trade', 'Trade'], ['army', mine ? 'Army & colonies' : 'Defences']];
  h += '<nav class="tabs">' + tabs.map(([k, n]) => '<button data-a="tab" data-v="' + k + '" class="' + (UI.tab === k ? 'on' : '') + '">' + n + '</button>').join('') + '</nav>';
  if (UI.tab === 'econ') h += cityEcon(c);
  else if (UI.tab === 'build') h += cityBuild(c, mine);
  else if (UI.tab === 'trade') h += cityTrade(c, mine);
  else h += cityArmy(c, mine, armies);
  if (!mine) h += '<div class="row gap"><button data-a="dipwith" data-v="' + c.owner + '">Diplomacy with ' + esc(FAC[c.owner].short) + '</button></div>';
  return h;
}
function wants(c) {
  return Object.keys(c.D).filter((g) => (c.fl[g] ?? 1) < 0.95 && c.D[g] > 0.02).map((g) => [g, c.D[g] * (1 - (c.fl[g] ?? 1)) * price(g)]).sort((a, b) => b[1] - a[1]);
}
function cityEcon(c) {
  const rows = GIDS.filter((g) => (c.P[g] || 0) > 0.01 || (c.D[g] || 0) > 0.01);
  let h = '<h3>What ' + esc(c.name) + ' produces and needs <small>per season</small></h3><div class="tbl"><table><thead><tr><th>Good</th><th>Made</th><th>Needed</th><th>Trade</th><th>Met</th></tr></thead><tbody>';
  for (const g of rows) {
    const p = c.P[g] || 0, d = c.D[g] || 0, im = c.imp[g] || 0, ex = c.exp[g] || 0, met = d ? c.fl[g] ?? 1 : null;
    h += '<tr><td>' + gchip(g) + '</td><td>' + (p ? fmt(p) : '·') + '</td><td>' + (d ? fmt(d) : '·') + '</td><td>' + (im ? '<span class="pos">+' + fmt(im) + '</span>' : '') + (ex ? ' <span class="gold">−' + fmt(ex) + '</span>' : '') + '</td><td>' + (met == null ? '' : '<span class="' + (met < 0.6 ? 'neg' : met < 0.95 ? 'warn' : 'pos') + '">' + Math.round(met * 100) + '%</span>') + '</td></tr>';
  }
  h += '</tbody></table></div>';
  const w = wants(c).slice(0, 6);
  h += '<h3>Shortages</h3><p class="chips">' + (w.length ? w.map(([g]) => gchip(g, Math.round((c.fl[g] ?? 1) * 100) + '%')).join('') : '<span class="muted">Every need is met.</span>') + '</p>';
  const plans = [];
  if (c.q.length) plans.push('Building ' + c.q.map((q) => bname(q.b, c.culture)).join(', then '));
  if (c.b.forge && (c.fl.iron ?? 1) < 0.9) plans.push('Forges idle for lack of iron (running at ' + Math.round(c.ratio.weapons * 100) + '%)');
  if (c.b.forge && ((c.fl.copper ?? 1) < 0.9 || (c.fl.tin ?? 1) < 0.9)) plans.push('Bronze-smiths want copper and tin');
  if (c.b.workshop && (c.fl.wool ?? 1) < 0.9) plans.push('Weavers want wool (looms at ' + Math.round(c.ratio.textiles * 100) + '%)');
  if (c.pop > popCap(c) * 0.92) plans.push('Crowded: more farmland, a granary or an aqueduct would let it grow');
  h += '<h3>Trying to produce</h3><ul class="plain">' + (plans.length ? plans.map((p) => '<li>' + esc(p) + '</li>').join('') : '<li class="muted">No projects. ' + (c.owner === G.player ? 'Open the Build tab.' : '') + '</li>') + '</ul>';
  h += '<h3>Local resources</h3><p class="chips">' + Object.entries(c.res).sort((a, b) => b[1] - a[1]).map(([g, v]) => gchip(g, fmt(v))).join('') + '</p>';
  return h;
}
function cityBuild(c, mine) {
  let h = '';
  if (c.q.length) h += '<h3>Under construction</h3><ul class="queue">' + c.q.map((q, i) => '<li><b>' + esc(bname(q.b, c.culture)) + ' ' + roman((c.b[q.b] || 0) + 1 + c.q.slice(0, i).filter((x) => x.b === q.b).length) + '</b>' + bar(q.done, q.need) + '<span>' + fmt(q.done) + '/' + q.need + '</span>' + (mine ? '<button class="sm" data-a="cancelq" data-v="' + i + '">Cancel</button>' : '') + '</li>').join('') + '</ul>';
  h += '<h3>' + (mine ? 'Build' : 'Buildings') + '</h3><div class="blist">';
  for (const b of BORDER) {
    const L = c.b[b] || 0, why = canBuild(c, b); if (!mine && !L) continue; if (b === 'harbor' && !c.port) continue;
    const cost = buildCost(c, b), afford = G.fac[c.owner].gold >= cost;
    h += '<div class="brow"><div><b>' + esc(bname(b, c.culture)) + '</b> <span class="lvl">' + (L ? roman(L) : '—') + '<small>/' + roman(BLD[b].max) + '</small></span><p>' + esc(BLD[b].e) + '</p></div>';
    if (mine) h += why ? '<span class="muted small">' + esc(why) + '</span>' : '<button data-a="build" data-v="' + b + '" ' + (afford ? '' : 'disabled') + '>' + cost + ' · ' + buildTime(c, b) + ' ssn</button>';
    h += '</div>';
  }
  return h + '</div>';
}
function flowLine(r, c) {
  const ins = [], outs = []; for (const f of r.flows) { const toC = (f.dir === 0 ? r.b : r.a) === c.id; (toC ? ins : outs).push(f); }
  return (outs.length ? '<span class="gold">→ ' + outs.map((f) => esc(GD[f.g].n) + ' ' + fmt(f.amt)).join(', ') + '</span> ' : '') + (ins.length ? '<span class="pos">← ' + ins.map((f) => esc(GD[f.g].n) + ' ' + fmt(f.amt)).join(', ') + '</span>' : '') || '<span class="muted">idle</span>';
}
function cityTrade(c, mine) {
  const rs = G.routes.filter((r) => r.a === c.id || r.b === c.id);
  let h = '<h3>Trade routes <small>' + rs.length + ' of ' + slots(c) + ' slots</small></h3><ul class="routes">';
  for (const r of rs) { const o = C(r.a === c.id ? r.b : r.a); h += '<li data-a="selroute" data-v="' + r.id + '"><div><b>' + esc(o.name) + '</b> ' + chip(o.owner) + ' <span class="muted small">' + (r.k === 'sea' ? 'by sea' : 'overland') + (r.pin ? ' · kept open' : '') + (r.pirate ? ' · <span class="warn">pirate waters</span>' : '') + '</span></div><div class="small">' + flowLine(r, c) + '</div><div class="val">' + fmt(r.val) + '</div></li>'; }
  h += rs.length ? '</ul>' : '<li class="muted">No routes yet.</li></ul>';
  if (mine) h += '<div class="row gap"><button data-a="newroute" ' + (rs.length >= slots(c) ? 'disabled' : '') + '>Open a route from ' + esc(c.name) + '</button></div><p class="muted small">Merchants open profitable routes on their own each season. Open one yourself, keep a route open even when trade dries up, or close routes you dislike. More slots come from harbours and markets.</p>';
  const w = wants(c).slice(0, 5), sp = Object.entries(c.S || {}).filter(([, v]) => v > 0.05).sort((a, b) => b[1] * price(b[0]) - a[1] * price(a[0])).slice(0, 6);
  h += '<h3>Unmet demand</h3><p class="chips">' + (w.length ? w.map(([g]) => gchip(g)).join('') : '<span class="muted">None</span>') + '</p>';
  h += '<h3>Unsold surplus</h3><p class="chips">' + (sp.length ? sp.map(([g, v]) => gchip(g, fmt(v))).join('') : '<span class="muted">None</span>') + '</p>';
  return h;
}
function cityArmy(c, mine, armies) {
  const def = (c.gar + armies.filter((a) => a.f === c.owner).reduce((s, a) => s + a.str, 0)) * (1 + 0.25 * (c.b.walls || 0));
  let h = '<h3>Defences</h3><div class="kv"><div><span>Garrison</span><b>' + fmt(c.gar) + '</b><small>max ' + fmt(garMax(c)) + '</small></div><div><span>Walls</span><b>' + roman(c.b.walls || 0) + '</b><small>+' + 25 * (c.b.walls || 0) + '%</small></div><div><span>Defence</span><b>' + fmt(def) + '</b><small>vs assault</small></div></div>';
  h += '<h3>Armies here</h3><ul class="routes">' + (armies.length ? armies.map((a) => '<li data-a="selarmy" data-v="' + a.id + '"><div><b>' + esc(a.name) + '</b> ' + chip(a.f) + '</div><div class="val">' + fmt(a.str) + '</div></li>').join('') : '<li class="muted">None</li>') + '</ul>';
  if (!mine) return h;
  h += '<div class="row gap"><button data-a="raise">Raise army · ' + raiseCost(c) + ' ' + cur() + ' (+' + raiseStr(c) + ')</button></div>';
  const why = c.pop < 3.5 ? 'Needs 3.5k people to spare colonists' : !c.port ? 'Inland: can settle nearby land only' : !(c.b.harbor >= 1) ? 'Build a harbour to send ships' : '';
  h += '<h3>Colonies</h3><p class="small">Send 1.5k settlers to unclaimed land. Sea colonies need a harbour; any city can settle land within a few days\' march. The colony takes the name of a historical site when founded near one.</p>';
  h += '<div class="row gap"><button data-a="colonymode" ' + (c.pop < 3.5 ? 'disabled' : '') + '>Choose a colony site · ' + colonyCost(c) + ' ' + cur() + '</button>' + (why ? '<span class="muted small">' + esc(why) + '</span>' : '') + '</div>';
  return h;
}
function routePanel(r) {
  const a = C(r.a), b = C(r.b), p = G.player, mine = a.owner === p || b.owner === p, foreign = a.owner !== b.owner;
  const days = Math.round((r.d * KM_PER_CELL) / (r.k === 'sea' ? 90 : 30));
  let h = head(a.name + ' ⇄ ' + b.name, (r.k === 'sea' ? 'Sea lane' : 'Overland road') + ' · ' + chip(a.owner) + (foreign ? ' ' + chip(b.owner) : ''), GD[mainGood(r) || 'grain'].c);
  const cap = routeCap(r) * (G.season === 3 && r.k === 'sea' ? 0.35 : 1), used = r.flows.reduce((s, f) => s + f.amt, 0);
  h += '<div class="kv"><div><span>Journey</span><b>~' + days + ' days</b><small>' + Math.round(r.d * KM_PER_CELL) + ' km</small></div><div><span>Cargo</span><b>' + fmt(used) + '/' + fmt(cap) + '</b>' + bar(used, cap) + '</div><div><span>Value</span><b class="gold">' + fmt(r.val) + '</b><small>per season</small></div><div><span>Risk</span><b class="' + (r.pirate ? 'warn' : 'pos') + '">' + (r.pirate ? 'Pirates' : 'Low') + '</b><small>' + (G.season === 3 && r.k === 'sea' ? 'mare clausum' : r.k === 'sea' ? 'sailing season' : 'roads open') + '</small></div></div>';
  h += '<h3>Terms</h3><p class="small">' + (foreign ? 'Trade rights between ' + esc(FAC[a.owner].short) + ' and ' + esc(FAC[b.owner].short) + '. Each side levies its tariff on imports (' + Math.round(G.fac[a.owner].tariff * 100) + '% / ' + Math.round(G.fac[b.owner].tariff * 100) + '%).' + (allied(a.owner, b.owner) ? ' Allies.' : '') : 'Internal route inside ' + esc(FAC[a.owner].name) + '. Market dues 4%.') + ' Opened ' + (r.made ? 'season ' + r.made : 'before 200 BC') + '.</p>';
  for (const [src, dst, dir] of [[a, b, 0], [b, a, 1]]) {
    const fl = r.flows.filter((f) => f.dir === dir);
    h += '<h3>' + esc(src.name) + ' → ' + esc(dst.name) + '</h3>';
    if (!fl.length) { h += '<p class="muted small">Nothing moves this way.</p>'; continue; }
    h += '<div class="tbl"><table><thead><tr><th>Cargo</th><th>Qty</th><th>Value</th><th>Why</th></tr></thead><tbody>' + fl.map((f) => '<tr><td>' + gchip(f.g) + '</td><td>' + fmt(f.amt) + '</td><td class="gold">' + fmt(f.v) + '</td><td class="small">' + esc(dst.name) + ' meets ' + Math.round((dst.fl[f.g] ?? 1) * 100) + '% of its need</td></tr>').join('') + '</tbody></table></div>';
  }
  const wa = wants(a).slice(0, 4), wb = wants(b).slice(0, 4);
  h += '<h3>Still wanted</h3><p class="small"><b>' + esc(a.name) + ':</b> ' + (wa.map(([g]) => gchip(g)).join('') || '<span class="muted">nothing</span>') + '</p><p class="small"><b>' + esc(b.name) + ':</b> ' + (wb.map(([g]) => gchip(g)).join('') || '<span class="muted">nothing</span>') + '</p>';
  if (mine) h += '<div class="row gap"><button data-a="pin">' + (r.pin ? 'Let merchants decide' : 'Keep this route open') + '</button><button class="danger" data-a="closeroute">Close route</button></div>';
  h += '<div class="row gap"><button data-a="selcity" data-v="' + a.id + '">' + esc(a.name) + '</button><button data-a="selcity" data-v="' + b.id + '">' + esc(b.name) + '</button></div>';
  return h;
}
function realmPanel() {
  const p = G.player, F = G.fac[p], L = F.last || {}, cs = citiesOf(p).sort((a, b) => b.pop - a.pop);
  let h = head(FAC[p].name, CULT[FAC[p].cul].lbl + ' · treasury in ' + FAC[p].cur, FAC[p].col);
  h += '<h3>Treasury <small>last season</small></h3><div class="tbl"><table><tbody>' + [['Taxes', L.tax], ['Merchant profits', L.trade], ['Tariffs and dues', L.tariff], ['Local sales and minting', L.sales], ['Building upkeep', -L.bUp], ['Army pay', -L.aUp]].map(([n, v]) => '<tr><td>' + n + '</td><td class="' + ((v || 0) >= 0 ? 'pos' : 'neg') + '">' + ((v || 0) >= 0 ? '+' : '') + fmt(v || 0) + '</td></tr>').join('') + '<tr class="tot"><td>Net</td><td class="' + ((L.net || 0) >= 0 ? 'pos' : 'neg') + '">' + fmt(L.net || 0) + '</td></tr></tbody></table></div>';
  h += '<h3>Policy</h3><label class="slider" for="tax">Tax rate <b>' + Math.round(F.tax * 100) + '%</b><input id="tax" type="range" min="5" max="35" value="' + Math.round(F.tax * 100) + '" data-a="tax"></label><p class="muted small">Higher taxes fill the treasury and sour public order.</p>';
  h += '<label class="slider" for="tariff">Import tariff <b>' + Math.round(F.tariff * 100) + '%</b><input id="tariff" type="range" min="0" max="30" value="' + Math.round(F.tariff * 100) + '" data-a="tariff"></label><p class="muted small">Earned on foreign imports. Foreign states grant trade rights more readily when tariffs are low.</p>';
  h += '<h3>Ambitions</h3><ul class="goals">' + goalsOf(p).map((g) => { const [ok, pr] = goalStatus(p, g); return '<li class="' + (ok ? 'done' : '') + '"><span>' + (ok ? '✓' : '○') + '</span>' + esc(g.d) + '<b>' + esc(pr) + '</b></li>'; }).join('') + '</ul>';
  h += '<h3>Cities</h3><ul class="routes">' + cs.map((c) => '<li data-a="selcity" data-v="' + c.id + '"><div><b>' + esc(c.name) + '</b> <span class="muted small">' + (c.q.length ? 'building ' + esc(bname(c.q[0].b, c.culture)) : '') + '</span></div><div class="small">order ' + Math.round(c.order) + ' · food ' + Math.round(satisfaction(c).food * 100) + '%</div><div class="val">' + fmt(c.pop) + 'k</div></li>').join('') + '</ul>';
  const ar = G.armies.filter((a) => a.f === p);
  h += '<h3>Armies</h3><ul class="routes">' + (ar.length ? ar.map((a) => '<li data-a="selarmy" data-v="' + a.id + '"><div><b>' + esc(a.name) + '</b> <span class="muted small">' + (a.mv ? 'marching on ' + esc(C(a.mv.to).name) : 'at ' + esc(C(a.at).name)) + '</span></div><div class="val">' + fmt(a.str) + '</div></li>').join('') : '<li class="muted">None</li>') + '</ul>';
  if (G.fleets.some((f) => f.f === p)) h += '<h3>Colonists under way</h3><ul class="plain">' + G.fleets.filter((f) => f.f === p).map((f) => '<li>' + esc(f.name) + ' · arrives in ' + (f.turns - f.done) + ' season(s)</li>').join('') + '</ul>';
  h += '<div class="row gap"><button data-a="save">Save game</button><button data-a="help">How to play</button><button class="danger" data-a="restart">New game</button></div>';
  return h;
}
function dipPanel() {
  const p = G.player; let h = head('Diplomacy', 'Relations, trade rights, war and peace', '#c9a24a');
  const nb = new Set(neighbours(p)); const list = FIDS.filter((f) => f !== p && G.fac[f].alive).sort((a, b) => (nb.has(b) - nb.has(a)) || (atWar(p, b) - atWar(p, a)) || rel(p, b) - rel(p, a));
  h += '<p class="muted small">Trade rights let merchants open routes between your cities and theirs. Neighbours are listed first.</p><ul class="dip">';
  for (const f of list) {
    const r = rel(p, f), tags = [];
    if (atWar(p, f)) tags.push('<i class="t war">War</i>'); if (allied(p, f)) tags.push('<i class="t ally">Ally</i>'); if (rights(p, f) && !atWar(p, f)) tags.push('<i class="t trade">Trade</i>'); if (nb.has(f)) tags.push('<i class="t nb">Neighbour</i>');
    h += '<li class="' + (UI.dipSel === f ? 'open' : '') + '"><div class="dh" data-a="dipsel" data-v="' + f + '"><span class="sw" style="--c:' + FAC[f].col + '"></span><b>' + esc(FAC[f].name) + '</b>' + tags.join('') + '<span class="rel ' + (r < -20 ? 'neg' : r > 30 ? 'pos' : '') + '">' + (r > 0 ? '+' : '') + r + '</span></div>';
    if (UI.dipSel === f) {
      const cs = citiesOf(f);
      h += '<div class="dbody"><p class="small">' + esc(FAC[f].desc) + '</p><p class="small muted">' + cs.length + ' cities · ' + fmt(cs.reduce((s, c) => s + c.pop, 0)) + 'k people · army ' + fmt(G.armies.filter((a) => a.f === f).reduce((s, a) => s + a.str, 0)) + ' · treasury ~' + fmt(Math.round(G.fac[f].gold / 50) * 50) + '</p><div class="row wrap">';
      if (atWar(p, f)) h += '<button data-a="dip" data-v="peace" data-f="' + f + '">Propose peace</button>';
      else {
        h += rights(p, f) ? '<button data-a="dip" data-v="revoke" data-f="' + f + '">Revoke trade rights</button>' : '<button data-a="dip" data-v="rights" data-f="' + f + '">Request trade rights</button>';
        h += '<button data-a="dip" data-v="gift" data-f="' + f + '">Send gift · 100</button>';
        h += allied(p, f) ? '<button data-a="dip" data-v="breakally" data-f="' + f + '">Dissolve alliance</button>' : '<button data-a="dip" data-v="ally" data-f="' + f + '">Propose alliance</button>';
        h += UI.confirmWar === f ? '<button class="danger" data-a="dip" data-v="war" data-f="' + f + '">Confirm: declare war</button>' : '<button class="danger" data-a="confirmwar" data-v="' + f + '">Declare war…</button>';
      }
      h += '<button data-a="lookat" data-v="' + f + '">Show on map</button></div></div>';
    }
    h += '</li>';
  }
  return h + '</ul>';
}
function ledgerPanel() {
  const p = G.player, rs = G.routes.filter((r) => C(r.a).owner === p || C(r.b).owner === p).sort((x, y) => y.val - x.val);
  const ex = {}, im = {};
  for (const r of rs) for (const f of r.flows) { const src = C(f.dir ? r.b : r.a), dst = C(f.dir ? r.a : r.b); if (src.owner === p && dst.owner !== p) ex[f.g] = (ex[f.g] || 0) + f.amt; if (dst.owner === p && src.owner !== p) im[f.g] = (im[f.g] || 0) + f.amt; }
  let h = head('Trade ledger', rs.length + ' routes touch your cities · ' + dateStr(), '#d9b54a');
  h += '<h3>Foreign exports</h3><p class="chips">' + (Object.keys(ex).length ? Object.entries(ex).sort((a, b) => b[1] * price(b[0]) - a[1] * price(a[0])).map(([g, v]) => gchip(g, fmt(v))).join('') : '<span class="muted">None</span>') + '</p>';
  h += '<h3>Foreign imports</h3><p class="chips">' + (Object.keys(im).length ? Object.entries(im).sort((a, b) => b[1] * price(b[0]) - a[1] * price(a[0])).map(([g, v]) => gchip(g, fmt(v))).join('') : '<span class="muted">None</span>') + '</p>';
  h += '<h3>Routes</h3><ul class="routes">' + rs.map((r) => { const a = C(r.a), b = C(r.b); return '<li data-a="selroute" data-v="' + r.id + '"><div><b>' + esc(a.name) + ' ⇄ ' + esc(b.name) + '</b> ' + (a.owner !== p ? chip(a.owner) : '') + (b.owner !== p ? chip(b.owner) : '') + ' <span class="muted small">' + (r.k === 'sea' ? 'sea' : 'land') + '</span></div><div class="small">' + r.flows.slice(0, 4).map((f) => esc(GD[f.g].n) + ' ' + fmt(f.amt)).join(' · ') + '</div><div class="val">' + fmt(r.val) + '</div></li>'; }).join('') + '</ul>';
  return h;
}
function marketPanel() {
  let h = head('Market of the Oikoumene', 'Prices across the known world · ' + dateStr(), '#d9b54a');
  h += '<div class="tbl"><table><thead><tr><th>Good</th><th>Price</th><th>Trend</th><th>Supply</th><th>Demand</th><th>Top producer</th></tr></thead><tbody>';
  for (const g of GIDS) {
    const pr = price(g), lp = (G.lastPrices || {})[g] || pr, tr = pr - lp; let top = null, tv = 0; for (const c of G.cities) if ((c.P[g] || 0) > tv) { tv = c.P[g]; top = c; }
    h += '<tr><td>' + gchip(g) + '</td><td class="gold">' + fmt(pr) + '</td><td class="' + (tr > 0.05 ? 'neg' : tr < -0.05 ? 'pos' : 'muted') + '">' + (tr > 0.05 ? '▲' : tr < -0.05 ? '▼' : '–') + '</td><td>' + fmt((G.supply || {})[g] || 0) + '</td><td>' + fmt((G.demand || {})[g] || 0) + '</td><td class="small">' + (top ? '<a href="#" data-a="selcity" data-v="' + top.id + '">' + esc(top.name) + '</a>' : '') + '</td></tr>';
  }
  return h + '</tbody></table></div><p class="muted small">Prices follow world supply and demand each season. Scarce goods pay more on every route.</p>';
}
function landPanel(x, y) {
  const i = y * W + x, [lon, lat] = cellLL(x, y), p = G.player, s = siteInfo(x, y, null);
  let h = head(land[i] ? 'Unclaimed land' : 'Open sea', TNAME[terr[i]] + ' · ' + Math.abs(lat).toFixed(1) + '°N ' + Math.abs(lon).toFixed(1) + '°' + (lon < 0 ? 'W' : 'E'), '#7fb069');
  if (!land[i]) return h + '<p class="muted">Ships pass here. Click land to look for colony sites.</p>';
  if (!s.ok) return h + '<p>' + esc(s.why) + '.</p>';
  const res = Object.entries(s.res).sort((a, b) => b[1] * price(b[0]) - a[1] * price(a[0]));
  h += '<h3>Prospects</h3><p class="chips">' + res.map(([g, v]) => gchip(g, fmt(v))).join('') + '</p><p class="small muted">' + (s.coastal ? 'Coastal site: a colony here can have a harbour.' : 'Inland site.') + ' Prospect value ~' + fmt(prospectValue(s.res)) + ' per season once developed.</p>';
  const origins = citiesOf(p).map((c) => [c, siteInfo(x, y, c)]).filter(([c, si]) => si.ok && c.pop >= 3.5 && (si.k === 'land' || (c.b.harbor || 0) >= 1)).sort((a, b) => a[1].turns - b[1].turns).slice(0, 5);
  if (!origins.length) return h + '<p class="warn small">None of your cities can reach this site. Sea colonies need a city with a harbour and 3.5k people.</p>';
  const nm = UI.colName || colonyName(x, y, origins[0][0].culture);
  h += '<h3>Found a colony</h3><label class="field" for="colname">Name<input id="colname" value="' + esc(nm) + '" maxlength="28"></label><ul class="routes">';
  for (const [c, si] of origins) h += '<li><div><b>From ' + esc(c.name) + '</b> <span class="muted small">' + (si.k === 'sea' ? 'by sea' : 'overland') + ' · ' + si.turns + ' season(s)</span></div><button data-a="found" data-v="' + c.id + '" ' + (G.fac[p].gold >= colonyCost(c) ? '' : 'disabled') + '>Send · ' + colonyCost(c) + '</button></li>';
  return h + '</ul><p class="muted small">1.5k settlers leave the mother city. Neighbours may resent a colony planted near them.</p>';
}
function armyPanel(a) {
  const mine = a.f === G.player; let h = head(a.name, chip(a.f) + ' · strength ' + fmt(a.str), FAC[a.f].col);
  if (a.mv) { h += '<p>' + (a.mv.order === 'attack' ? 'Marching to assault ' : a.mv.order === 'raid' ? 'Riding to raid ' : 'Moving to ') + '<b>' + esc(C(a.mv.to).name) + '</b> ' + (a.mv.k === 'sea' ? 'by sea' : 'overland') + '. Arrives in ' + (a.mv.turns - a.mv.done) + ' season(s).</p>'; return h; }
  const c = C(a.at); h += '<p>Stationed at <a href="#" data-a="selcity" data-v="' + c.id + '">' + esc(c.name) + '</a>. Pay ' + fmt(a.str * 0.3) + ' per season.</p>';
  if (!mine) return h;
  h += '<div class="row wrap"><button data-a="march" data-v="attack">Attack a city…</button><button data-a="march" data-v="raid">Raid a city…</button><button data-a="march" data-v="move">Move…</button><button class="danger" data-a="disband">Disband</button></div><p class="muted small">Attacks capture a city at war with you if you beat its garrison and walls. Raids carry off loot and come home. Sea moves need a harbour where you embark and a port where you land; winter doubles sailing time.</p>';
  return h;
}
function helpPanel() {
  return head('How to play', 'Oikoumene: the inhabited world', '#c9a24a') + `<div class="help">
<p><b>Each turn is a season.</b> Press <kbd>End season</kbd> (or Enter). Four seasons make a year, starting in spring 200 BC.</p>
<p><b>Cities</b> produce goods from their land and buildings and consume food, comforts and luxuries by culture: Gauls crave wine, Greeks want oil and papyrus, everyone needs grain. Click a city to see what it makes, what it lacks, and what it is building.</p>
<p><b>Construction</b> is visible in the city scene: scaffolding, a treadwheel crane and workers raise each building. Builders need timber; a city short of timber builds slowly.</p>
<p><b>Trade routes</b> form when one city has a surplus another lacks, and both sides are at peace with trade rights. Click any route line (or a ship) to see cargo in each direction, value, tariffs and risk. Winter closes the sea (mare clausum) and cuts cargoes.</p>
<p><b>Colonies</b>: from a harbour city, choose <i>Army &amp; colonies → Choose a colony site</i>, or simply click unclaimed land. Green squares show where your ships can reach.</p>
<p><b>War</b>: raise armies, then attack or raid enemy cities. Walls and garrisons defend. Declare war and make peace in Diplomacy.</p>
<p><b>Map modes</b>: Political, Trade (every route in the world), Goods (each city's main products), Terrain.</p>
<p><b>Controls</b>: drag to pan, wheel or pinch to zoom, <kbd>Esc</kbd> to cancel.</p></div>`;
}

// ---- actions -------------------------------------------------------------------
const ACT = {
  close: () => { UI.sel = null; renderPanel(); },
  tab: (v) => { UI.tab = v; renderPanel(); },
  build: (v) => { const c = C(UI.sel.id), e = queueBuild(c, v); if (e) toast(e, 'bad'); else toast(bname(v, c.culture) + ' ordered in ' + c.name, 'good'); renderAll(); },
  cancelq: (v) => { const c = C(UI.sel.id), it = c.q[+v]; if (!it) return; c.q.splice(+v, 1); G.fac[c.owner].gold += Math.round(it.cost * 0.75); toast('Cancelled; 75% refunded'); renderAll(); },
  selroute: (v) => select({ type: 'route', id: +v }),
  selcity: (v) => { select({ type: 'city', id: +v }); lookAtCity(C(+v)); },
  selarmy: (v) => select({ type: 'army', id: +v }),
  newroute: () => { const c = C(UI.sel.id); const targets = c.cand.map((n) => n.id).filter((id) => { const o = C(id); return o.owner && access(c.owner, o.owner) && !G.routes.some((r) => dk(r.a, r.b) === dk(c.id, id)); }); UI.mode = { type: 'route', from: c.id, targets, msg: 'Pick a partner for ' + c.name + ' (ringed cities have trade access)' }; renderMode(); },
  pin: () => { const r = G.routes.find((x) => x.id === UI.sel.id); r.pin = !r.pin; renderPanel(); },
  closeroute: () => { const r = G.routes.find((x) => x.id === UI.sel.id); G.routes = G.routes.filter((x) => x !== r); G.black[dk(r.a, r.b)] = G.turn + 8; toast('Route closed. Merchants will stay away for two years.'); UI.sel = { type: 'city', id: r.a }; renderAll(); },
  raise: () => { const c = C(UI.sel.id), e = raiseArmy(c); if (e) toast(e, 'bad'); else toast('Troops levied in ' + c.name, 'good'); renderAll(); },
  colonymode: () => { const c = C(UI.sel.id); buildColonyOverlay(c); UI.mode = { type: 'colony', origin: c.id, msg: 'Click a green site to plant a colony from ' + c.name }; renderMode(); },
  found: (v) => { const s = UI.sel, name = ($('#colname') || {}).value; const e = launchColony(C(+v), s.x, s.y, (name || '').trim() || null); if (e) toast(e, 'bad'); else { toast('Colonists set out for ' + (name || 'the new site'), 'good'); UI.mode = null; renderMode(); UI.sel = { type: 'realm' }; } UI.colName = null; renderAll(); },
  march: (v) => { const a = G.armies.find((x) => x.id === UI.sel.id), from = C(a.at); const targets = G.cities.filter((t) => t.owner && reach(from, t) && (v === 'move' ? t.owner === a.f || allied(a.f, t.owner) : atWar(a.f, t.owner))).map((t) => t.id); if (!targets.length) { toast(v === 'move' ? 'No friendly city within reach' : 'No enemy city within reach. Declare war first?', 'bad'); return; } UI.mode = { type: 'march', army: a.id, order: v, targets, msg: (v === 'attack' ? 'Choose a city to assault' : v === 'raid' ? 'Choose a city to raid' : 'Choose where to move') + ' (ringed cities are in reach)' }; renderMode(); },
  disband: () => { G.armies = G.armies.filter((x) => x.id !== UI.sel.id); UI.sel = null; renderAll(); },
  dipsel: (v) => { UI.dipSel = UI.dipSel === v ? null : v; UI.confirmWar = null; renderPanel(); },
  dipwith: (v) => { UI.dipSel = v; select({ type: 'dip' }); },
  confirmwar: (v) => { UI.confirmWar = v; renderPanel(); },
  dip: (v, el) => { const [k, m] = playerDip(v, el.dataset.f); toast(m, k); UI.confirmWar = null; renderAll(); },
  lookat: (v) => { const cs = citiesOf(v); if (cs.length) lookAtCity(cs.find((c) => c.capital) || cs[0]); },
  save: () => { const ok = saveGame(); toast(ok ? 'Game saved in this browser' : 'Saving is blocked in this browser', ok ? 'good' : 'bad'); },
  help: () => select({ type: 'help' }),
  restart: () => { UI.sel = null; showStart(); },
};
function lookAtCity(c) { cam.x = c.x + 0.5 + (VW > 760 ? 190 / cam.z : 0); cam.y = c.y + 0.5 + (VW <= 760 ? VH * 0.22 / cam.z : 0); if (cam.z < 5) cam.z = 5; clampCam(); }
function renderAll() { renderTop(); const tb = $('#top'); if (tb) document.documentElement.style.setProperty('--toph', tb.offsetHeight + 18 + 'px'); renderPanel(); renderChron(); }
function renderMode() { const el = $('#modebar'); if (!UI.mode) { el.hidden = true; colC = null; return; } el.hidden = false; $('#modemsg').textContent = UI.mode.msg; }

// ---- input -----------------------------------------------------------------------
function hitTest(sx, sy) {
  if (!G) return null; const u = Math.max(1, Math.round(cam.z / 3));
  for (const a of G.armies) { if (a.mv || a.at == null) continue; const c = C(a.at); const [x, y] = w2s(c.x + 0.5, c.y + 0.5); if (sx >= x + 6 * u - 3 && sx <= x + 12 * u + 3 && sy >= y - 12 * u - 3 && sy <= y - 2 * u) return { type: 'army', id: a.id }; }
  let best = null, bd = Math.max(10, 7 * u);
  for (const c of G.cities) { if (!c.owner) continue; const [x, y] = w2s(c.x + 0.5, c.y + 0.5); const d = Math.hypot(x - sx, y - sy + 2 * u); if (d < bd) { bd = d; best = c; } }
  if (best) return { type: 'city', id: best.id };
  let rb = null, rd = 6;
  for (const r of UI._drawnRoutes || []) { const p = pathBetween(C(r.a), C(r.b), r.k); for (let i = 1; i < p.length; i++) { const [ax, ay] = w2s(p[i - 1][0], p[i - 1][1]), [bx, by] = w2s(p[i][0], p[i][1]); const d = segDist(sx, sy, ax, ay, bx, by); if (d < rd) { rd = d; rb = r; } } }
  if (rb) return { type: 'route', id: rb.id };
  const [wx, wy] = s2w(sx, sy), x = Math.floor(wx), y = Math.floor(wy); if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const i = y * W + x; if (land[i] && cellCity[i] >= 0) return { type: 'city', id: cellCity[i], terr: true };
  return { type: 'land', x, y };
}
function onMapClick(sx, sy) {
  const h = hitTest(sx, sy); if (!h) return;
  if (UI.mode) {
    const m = UI.mode;
    if (m.type === 'route' && h.type === 'city') { if (!m.targets.includes(h.id)) { toast('No trade access to that city', 'bad'); return; } const c = C(m.from), o = C(h.id), n = c.cand.find((x) => x.id === o.id); G.routes.push({ id: G.nid++, a: c.id, b: o.id, k: n.k, d: n.d, flows: [], val: 0, low: 0, made: G.turn, pin: true }); delete G.black[dk(c.id, o.id)]; UI.mode = null; renderMode(); toast('Route opened: ' + c.name + ' ⇄ ' + o.name + '. Cargo moves from next season.', 'good'); select({ type: 'route', id: G.routes[G.routes.length - 1].id }); return; }
    if (m.type === 'march' && h.type === 'city') { const a = G.armies.find((x) => x.id === m.army); if (!m.targets.includes(h.id)) { toast('Out of reach', 'bad'); return; } const e = march(a, C(h.id), m.order); if (e) toast(e, 'bad'); else toast(a.name + ' sets out for ' + C(h.id).name, 'good'); UI.mode = null; renderMode(); renderAll(); return; }
    if (m.type === 'colony') { const [wx, wy] = s2w(sx, sy), x = Math.floor(wx), y = Math.floor(wy); const s = siteInfo(x, y, C(m.origin)); if (!s.ok) { toast(s.why, 'bad'); return; } UI.mode = null; renderMode(); UI.colName = null; select({ type: 'land', x, y }); return; }
  }
  if (h.type === 'city' && h.terr) { select({ type: 'city', id: h.id }); return; }
  select(h);
}
function tooltipFor(h) {
  if (!h) return '';
  if (h.type === 'city') { const c = C(h.id); const top = Object.entries(c.P || {}).sort((p, q) => q[1] * price(q[0]) - p[1] * price(p[0])).slice(0, 3).map(([g]) => GD[g].n).join(', '); return '<b>' + esc(c.name) + '</b> ' + chip(c.owner) + '<br>' + fmt(c.pop) + 'k people' + (c.q.length ? ' · building ' + esc(bname(c.q[0].b, c.culture)) : '') + '<br><span class="muted">' + esc(top) + '</span>'; }
  if (h.type === 'route') { const r = G.routes.find((x) => x.id === h.id); if (!r) return ''; return '<b>' + esc(C(r.a).name) + ' ⇄ ' + esc(C(r.b).name) + '</b><br>' + (r.flows.slice(0, 3).map((f) => esc(GD[f.g].n)).join(', ') || 'idle') + ' · ' + fmt(r.val); }
  if (h.type === 'army') { const a = G.armies.find((x) => x.id === h.id); return '<b>' + esc(a.name) + '</b> ' + chip(a.f) + ' · ' + fmt(a.str); }
  if (h.type === 'land') { const i = h.y * W + h.x; if (!land[i]) return ''; if (UI.mode && UI.mode.type === 'colony') { const s = siteInfo(h.x, h.y, C(UI.mode.origin)); if (!s.ok) return esc(s.why); return '<b>' + esc(colonyName(h.x, h.y, C(UI.mode.origin).culture)) + '?</b> ' + s.turns + ' season(s)<br>' + Object.entries(s.res).sort((a, b) => b[1] * price(b[0]) - a[1] * price(a[0])).slice(0, 4).map(([g]) => esc(GD[g].n)).join(', '); } return esc(TNAME[terr[i]]) + ' · unclaimed'; }
  return '';
}
function setupInput() {
  const cv = $('#map'), pts = new Map(); let drag = null, pinch = null;
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; else if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: cam.z }; drag = null; } });
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const tz = pinch.z * (d / pinch.d); const z = ZOOMS.reduce((p, q) => (Math.abs(q - tz) < Math.abs(p - tz) ? q : p)); if (z !== cam.z) { cam.z = z; clampCam(); } return; }
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (drag.moved) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; clampCam(); cv.style.cursor = 'grabbing'; } return; }
    if (e.pointerType === 'mouse') { const h = hitTest(sx, sy); UI.hover = h; const tip = $('#tip'), html = tooltipFor(h); if (html) { tip.innerHTML = html; tip.hidden = false; tip.style.left = Math.min(sx + 14, VW - 230) + 'px'; tip.style.top = sy + 14 + 'px'; } else tip.hidden = true; cv.style.cursor = h && h.type !== 'land' ? 'pointer' : 'default'; }
  });
  const up = (e) => { const r = cv.getBoundingClientRect(); if (drag && !drag.moved && pts.size === 1) onMapClick(e.clientX - r.left, e.clientY - r.top); pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; cv.style.cursor = 'default'; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); drag = null; pinch = null; });
  cv.addEventListener('pointerleave', () => { $('#tip').hidden = true; UI.hover = null; });
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1 : -1, e.offsetX, e.offsetY); }, { passive: false });
  document.addEventListener('click', (e) => { const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'INPUT') return; e.preventDefault(); const f = ACT[el.dataset.a]; if (f) f(el.dataset.v, el); });
  document.addEventListener('input', (e) => { const a = e.target.dataset && e.target.dataset.a; if (a === 'tax' || a === 'tariff') { G.fac[G.player][a] = +e.target.value / 100; e.target.previousSibling.textContent = Math.round(+e.target.value) + '%'; } if (e.target.id === 'colname') UI.colName = e.target.value; });
  document.addEventListener('change', (e) => { const a = e.target.dataset && e.target.dataset.a; if (a === 'tax' || a === 'tariff') renderPanel(); });
  document.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT') return; if (e.key === 'Escape') { if (UI.mode) { UI.mode = null; renderMode(); } else { UI.sel = null; renderPanel(); } } if (e.key === 'Enter' && G && $('#start').hidden) doEndTurn(); if (e.key === '+' || e.key === '=') zoomAt(1, VW / 2, VH / 2); if (e.key === '-') zoomAt(-1, VW / 2, VH / 2); });
  $('#endturn').addEventListener('click', doEndTurn);
  $('#modecancel').addEventListener('click', () => { UI.mode = null; renderMode(); });
  document.querySelectorAll('[data-mapmode]').forEach((b) => b.addEventListener('click', () => { UI.mapMode = b.dataset.mapmode; renderTop(); }));
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { const t = b.dataset.open; select(UI.sel && UI.sel.type === t ? null : { type: t }); }));
  $('#chron').addEventListener('click', () => { UI.chronOpen = !UI.chronOpen; $('#chron').classList.toggle('open', UI.chronOpen); renderChron(); });
  $('#zin').addEventListener('click', () => zoomAt(1, VW / 2, VH / 2)); $('#zout').addEventListener('click', () => zoomAt(-1, VW / 2, VH / 2));
}
function zoomAt(dir, sx, sy) {
  const i = ZOOMS.indexOf(cam.z), ni = clamp(i + dir, 0, ZOOMS.length - 1); if (ni === i) return; const [wx, wy] = s2w(sx, sy);
  cam.z = ZOOMS[ni]; cam.x = wx - (sx - VW / 2) / cam.z; cam.y = wy - (sy - VH / 2) / cam.z; clampCam();
}
let busy = false;
function doEndTurn() {
  if (!G || busy || !G.fac[G.player].alive) return; busy = true; $('#endturn').disabled = true; $('#endturn').textContent = 'The season turns…';
  setTimeout(() => {
    const before = G.fac[G.player].gold; endTurn(); saveGame(); busy = false; $('#endturn').disabled = false; $('#endturn').textContent = 'End season';
    if (UI.mode && UI.mode.type === 'colony') buildColonyOverlay(C(UI.mode.origin));
    renderAll(); const d = G.fac[G.player].gold - before; toast(dateStr() + ' · treasury ' + (d >= 0 ? '+' : '') + fmt(d), d >= 0 ? 'good' : 'bad');
  }, 30);
}

// ---- start screen, save/load ------------------------------------------------------
const GROUPS = [['Great powers', ['rome', 'carthage', 'macedon', 'seleucid', 'ptolemaic']], ['Greek states', ['epirus', 'athens', 'aetolia', 'achaea', 'sparta', 'rhodes', 'crete', 'pergamon', 'massilia', 'byzantium', 'euxine', 'bosporus', 'bithynia']],
  ['Anatolia, Syria and Africa', ['pontus', 'cappadocia', 'galatia', 'nabataea', 'numidia', 'mauretania']], ['Gauls and Italians', ['arverni', 'aedui', 'sequani', 'carnutes', 'belgae', 'armorici', 'volcae', 'allobroges', 'helvetii', 'boii', 'insubres', 'ligures', 'veneti', 'norici']],
  ['Iberia', ['celtiberi', 'lusitani', 'turdetani', 'ilergetes', 'oretani', 'gallaeci', 'aquitani']], ['Britain and Ireland', ['britons', 'dumnonii', 'brigantes', 'caledonii', 'hiberni']],
  ['Germania and the north', ['cimbri', 'suebi', 'chatti', 'frisii', 'gutones', 'scandians', 'bastarnae']], ['Balkans and the steppe', ['illyria', 'dardani', 'odrysae', 'getae', 'scythia', 'sarmatia']]];
function difficulty(f) { const n = CITY_DATA.filter((d) => d[3] === f); const pop = n.reduce((s, d) => s + d[4], 0); return pop > 60 ? 'Easy' : pop > 18 ? 'Normal' : pop > 8 ? 'Hard' : 'Very hard'; }
function showStart() {
  const el = $('#start'); el.hidden = false; let hasSave = false; try { hasSave = !!localStorage.getItem(SAVE_KEY); } catch (e) { hasSave = false; }
  let h = '<div class="st-inner"><div class="st-head"><h1>Oikoumene</h1><p>The inhabited world. Choose a state, build its cities, run its trade and plant its colonies.</p></div>';
  h += '<div class="scen">' + SCENARIOS.map((s) => '<div class="sc ' + (s.ready ? 'on' : 'off') + '"><b>' + esc(s.name) + '</b><span>' + esc(s.when) + '</span><p>' + esc(s.blurb) + '</p>' + (s.ready ? '' : '<i>In preparation</i>') + '</div>').join('') + '</div>';
  h += '<div class="pick"><div class="groups">' + GROUPS.map(([n, fs]) => '<div class="grp"><h4>' + esc(n) + '</h4><div>' + fs.map((f) => '<button class="fb ' + (UI.startPick === f ? 'on' : '') + '" data-pick="' + f + '" style="--c:' + FAC[f].col + '">' + esc(FAC[f].short) + '</button>').join('') + '</div></div>').join('') + '</div>';
  const f = UI.startPick, cs = CITY_DATA.filter((d) => d[3] === f);
  h += '<aside class="fdesc"><span class="crest big" style="--c:' + FAC[f].col + '"></span><h2>' + esc(FAC[f].name) + '</h2><p class="muted small">' + esc(CULT[FAC[f].cul].lbl) + ' · ' + cs.length + ' cities · ' + cs.reduce((s, d) => s + d[4], 0) + 'k people · ' + difficulty(f) + '</p><p>' + esc(FAC[f].desc) + '</p><h4>Ambitions</h4><ul class="plain">' + goalsOf(f).map((g) => '<li>' + esc(g.d) + '</li>').join('') + '</ul><p class="small muted">' + cs.map((d) => esc(d[0])).join(', ') + '</p>';
  h += '<div class="row gap"><button class="primary" id="begin">Begin as ' + esc(FAC[f].short) + '</button>' + (hasSave ? '<button id="cont">Continue saved game</button>' : '') + '</div></aside></div></div>';
  el.innerHTML = h;
  el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => { UI.startPick = b.dataset.pick; showStart(); }));
  $('#begin').addEventListener('click', () => { el.innerHTML = '<div class="loading">Surveying the coasts and charting the sea lanes…</div>'; setTimeout(() => { PATHS.clear(); newGame(UI.startPick); flagPirates(); afterLoad(); el.hidden = true; }, 30); });
  const cb = $('#cont'); if (cb) cb.addEventListener('click', () => { if (loadGame()) el.hidden = true; else toast('Could not read the saved game', 'bad'); });
}
function saveGame() { try { const s = JSON.stringify(G, (k, v) => (k === '_disp' || k === 'flash' || k === 'cand' || k === 'seaN' || k === 'landN' ? undefined : v)); localStorage.setItem(SAVE_KEY, s); return true; } catch (e) { return false; } }
function loadGame() {
  try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; G = JSON.parse(s); } catch (e) { return false; }
  PATHS.clear(); for (const c of G.cities) { c.seaN = null; c.landN = null; } for (const c of G.cities) linkCity(c); for (const c of G.cities) c.cand = tradeCands(c);
  const now = performance.now(); for (const c of G.cities) for (const q of c.q) q.ts = now; for (const a of G.armies) if (a.mv) a.mv.ts = now; for (const f of G.fleets) f.ts = now;
  computeTerritory(); flagPirates(); afterLoad(); return true;
}
function afterLoad() {
  buildPolitical(); UI.sel = null; UI.mode = null; renderMode();
  const cap = citiesOf(G.player).find((c) => c.capital) || citiesOf(G.player)[0]; if (cap) { cam.z = 5; lookAtCity(cap); select({ type: 'city', id: cap.id }); UI.tab = 'econ'; }
  renderAll();
}
function onDefeat() { toast('Your state has fallen. Start a new game from the Realm panel.', 'bad'); }
function onColony(c) { toast('The colony of ' + c.name + ' is founded!', 'good'); }

// ---- boot --------------------------------------------------------------------
function resize() { const tb = $('#top'); if (tb) document.documentElement.style.setProperty('--toph', tb.offsetHeight + 18 + 'px'); const cv = $('#map'); DPR = Math.min(2, window.devicePixelRatio || 1); VW = cv.clientWidth; VH = cv.clientHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); clampCam(); }
function frame(t) {
  try { drawMap(t); if (G && UI.sel && UI.sel.type === 'city' && !$('#panel').hidden && SCENE.isConnected) { SCENECTX.imageSmoothingEnabled = false; drawScene(SCENECTX, C(UI.sel.id), t); } } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
function boot() {
  MAPCTX = $('#map').getContext('2d'); SCENE = document.createElement('canvas'); SCENE.width = 200; SCENE.height = 100; SCENE.className = 'scenecv'; SCENECTX = SCENE.getContext('2d');
  buildMap(); buildTerrainCanvas(); resize(); window.addEventListener('resize', resize);
  cam.z = VW > 1100 ? 4 : 3; cam.x = W * 0.55; cam.y = H * 0.6; clampCam();
  setupInput(); showStart(); requestAnimationFrame(frame);
  setInterval(() => { if (G && UI.sel && UI.sel.type === 'city' && !$('#panel').hidden) { const q = C(UI.sel.id).q[0]; const el = document.querySelector('.scap'); if (!q && el && el.textContent.startsWith('Building')) renderPanel(); } }, 2000);
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
