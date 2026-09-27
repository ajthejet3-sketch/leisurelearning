'use strict';
// ============================================================================
// Interface: top bar, side panel, chronicle, start screen, input.
// ============================================================================
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) > 0 && Math.abs(v) < 0.1 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10).toLocaleString('en');
const UI = { sel: null, mode: null, mapMode: 'political', tab: 'econ', hover: null, dipSel: null, startPick: 'rome' };
let MAPCTX, SCENE, SCENECTX, BATTLECV, BATTLECTX;
const SAVE_KEY = 'oikoumene-save-v4';

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
  el.innerHTML = items.map((e) => '<li class="' + e.k + '"><span>' + esc(e.d) + '</span>' + esc(e.t) + (e.b ? ' <button class="sm" data-a="viewbattle" data-v="' + e.b + '">View battle</button>' : '') + '</li>').join('');
}

// ---- panel ---------------------------------------------------------------------
function select(sel) { UI.sel = sel; if (Music.on) Music.refresh(); renderMusic(); if (sel && sel.type === 'city' && C(sel.id).owner !== G.player && UI.tab === 'build') UI.tab = 'econ'; renderPanel(); }
function renderPanel() {
  const el = $('#panel'); if (!G || !UI.sel) { el.hidden = true; return; } el.hidden = false; const s = UI.sel; let h = '';
  if (s.type === 'city') h = cityPanel(C(s.id));
  else if (s.type === 'route') { const r = G.routes.find((x) => x.id === s.id); if (!r) { UI.sel = null; el.hidden = true; return; } h = routePanel(r); }
  else if (s.type === 'realm') h = realmPanel();
  else if (s.type === 'dip') h = dipPanel();
  else if (s.type === 'armies') h = armiesPanel();
  else if (s.type === 'ledger') h = ledgerPanel();
  else if (s.type === 'market') h = marketPanel();
  else if (s.type === 'land') h = landPanel(s.x, s.y);
  else if (s.type === 'army') { const a = G.armies.find((x) => x.id === s.id); if (!a) { UI.sel = null; el.hidden = true; return; } h = armyPanel(a); }
  else if (s.type === 'help') h = helpPanel();
  else if (s.type === 'battle') { const b = (G.battles || []).find((x) => x.id === s.id); if (!b) { UI.sel = null; el.hidden = true; return; } h = battlePanel(b); }
  const key = s.type + ':' + (s.id ?? s.x ?? '') + ':' + (s.y ?? ''); const sc = key === UI._panelKey ? el.scrollTop : 0; UI._panelKey = key; el.innerHTML = h; el.scrollTop = sc;
  const slot = el.querySelector('#scene-slot'); if (slot) slot.appendChild(SCENE);
  const bs = el.querySelector('#battle-slot'); if (bs) bs.appendChild(BATTLECV);
}
const head = (title, sub, col) => '<header class="ph"><span class="crest" style="--c:' + (col || '#c9a24a') + '"></span><div><h2>' + esc(title) + '</h2><div class="sub">' + sub + '</div></div><button class="x" data-a="close" aria-label="Close panel">×</button></header>';

function cityPanel(c) {
  const mine = c.owner === G.player, cul = CULT[c.culture], s = satisfaction(c), q = c.q[0];
  const armies = G.armies.filter((a) => a.at === c.id);
  let h = head(c.name, chip(c.owner) + ' · ' + cul.lbl + (c.capital ? ' · capital' : '') + (c.colony ? ' · colony' : '') + ' · ' + TNAME[terr[c.y * W + c.x]], FAC[c.owner].col);
  h += '<div class="scene"><div id="scene-slot"></div><div class="scap">' + (q ? 'Building <b>' + esc(bname(q.b, c.culture)) + ' ' + roman((c.b[q.b] || 0) + 1) + '</b> · ' + Math.max(1, Math.ceil((q.need - q.done) / (0.6 + 0.4 * (c.fl.timber ?? 1)))) + ' season(s) left' + ((c.fl.timber ?? 1) < 0.7 ? ' · <span class="neg">short of timber, work is slow</span>' : '') : 'No construction under way') + '</div></div>';
  h += '<div class="kv"><div><span>People</span><b>' + fmt(c.pop) + 'k</b><small>ceiling ' + fmt(popCap(c)) + 'k</small></div><div><span>Order</span><b class="' + (c.order < 35 ? 'neg' : c.order > 60 ? 'pos' : '') + '">' + Math.round(c.order) + '</b>' + bar(c.order, 100, c.order < 35 ? 'bad' : '') + '</div><div><span>Food</span><b class="' + (s.food < 0.9 ? 'neg' : 'pos') + '">' + Math.round(s.food * 100) + '%</b><small>' + fmt(c.stock.grain || 0) + ' in store</small></div><div><span>Comforts</span><b>' + Math.round(s.comfort * 100) + '%</b><small>luxuries ' + Math.round(s.lux * 100) + '%</small></div></div>';
  h += peopleBlock(c);
  const tabs = [['econ', 'Economy'], ['build', mine ? 'Build' : 'Buildings'], ['trade', 'Trade'], ['army', mine ? 'Army & colonies' : 'Defences']];
  h += '<nav class="tabs">' + tabs.map(([k, n]) => '<button data-a="tab" data-v="' + k + '" class="' + (UI.tab === k ? 'on' : '') + '">' + n + '</button>').join('') + '</nav>';
  if (UI.tab === 'econ') h += cityEcon(c);
  else if (UI.tab === 'build') h += cityBuild(c, mine);
  else if (UI.tab === 'trade') h += cityTrade(c, mine);
  else h += cityArmy(c, mine, armies);
  if (!mine) h += '<div class="row gap"><button data-a="dipwith" data-v="' + c.owner + '">Diplomacy with ' + esc(FAC[c.owner].short) + '</button></div>';
  return h;
}
function peopleBlock(c) {
  const ps = topPeoples(c, 8), rp = facPeople(c.owner), fs = foreignShare(c);
  let h = '<h3>Peoples of ' + esc(c.name) + ' <small>' + fmt(c.pop) + 'k souls · rulers are ' + esc(PEOPLES[rp][0]) + '</small></h3>';
  h += '<div class="pbar" role="img" aria-label="Population by people">' + ps.map(([p, v]) => '<i style="width:' + (v * 100).toFixed(1) + '%;background:' + PEOPLES[p][1] + '" title="' + esc(PEOPLES[p][0]) + ' ' + Math.round(v * 100) + '%"></i>').join('') + '</div>';
  h += '<ul class="plist">' + ps.map(([p, v]) => '<li><span class="sw" style="--c:' + PEOPLES[p][1] + '"></span><b>' + esc(PEOPLES[p][0]) + '</b><span class="pct">' + (v * 100 < 1 ? '<1' : Math.round(v * 100)) + '%</span><span class="muted">' + fmt(c.pop * v) + 'k · ' + esc(PEOPLES[p][3]) + '</span></li>').join('') + '</ul>';
  if (fs > 0.08) h += '<p class="small ' + (fs > 0.4 ? 'warn' : 'muted') + '">' + (fs > 0.4 ? 'Most people here are not ' + esc(PEOPLES[rp][0]) + '. ' : '') + 'Foreign rule costs ' + Math.round(18 * fs) + ' public order. Temples and time assimilate people to their rulers; trade routes bring newcomers.</p>';
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
  const rs = G.routes.filter((r) => r.a === c.id || r.b === c.id).sort((x, y) => y.val - x.val);
  let h = '<h3>Trade routes <small>' + rs.length + ' of ' + slots(c) + ' slots · ' + fmt(rs.reduce((s, r) => s + r.val, 0)) + ' per season</small></h3>';
  if (!rs.length) h += '<p class="muted">No routes yet.</p>';
  for (const r of rs) {
    const o = C(r.a === c.id ? r.b : r.a), outs = [], ins = [];
    for (const f of r.flows) ((f.dir === 0 ? r.b : r.a) === c.id ? ins : outs).push(f);
    const days = Math.round((r.d * KM_PER_CELL) / (r.k === 'sea' ? 90 : 30));
    const list = (fl) => fl.length ? fl.map((f) => gchip(f.g, fmt(f.amt))).join('') : '<span class="muted small">nothing</span>';
    h += '<div class="rcard"><div class="rh" data-a="selroute" data-v="' + r.id + '"><b>' + esc(o.name) + '</b>' + chip(o.owner) + '<span class="muted small">' + (r.k === 'sea' ? 'sea' : 'road') + ' · ~' + days + ' days' + (r.pirate ? ' · <span class="warn">pirates</span>' : '') + (r.pin ? ' · kept open' : '') + '</span><span class="val">' + fmt(r.val) + '</span></div>';
    h += '<div class="rc"><div><span class="lbl">Sends</span><p class="chips">' + list(outs) + '</p></div><div><span class="lbl">Receives</span><p class="chips">' + list(ins) + '</p></div></div>';
    if (mine) h += '<div class="row gap ra"><button class="sm" data-a="pinr" data-v="' + r.id + '">' + (r.pin ? 'Let merchants decide' : 'Keep open') + '</button><button class="sm danger" data-a="closer" data-v="' + r.id + '">Close</button><button class="sm" data-a="selroute" data-v="' + r.id + '">Details</button></div>';
    h += '</div>';
  }
  if (mine) h += '<div class="row gap"><button data-a="newroute" ' + (rs.length >= slots(c) ? 'disabled' : '') + '>Open a route from ' + esc(c.name) + '</button></div><p class="muted small">Every route is drawn on the map while this town is selected, and its ships and carts come and go in the town view above. Merchants open profitable routes by themselves each season; harbours and markets add slots.</p>';
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
  h += recruitBlock(c, null);
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
  const bl = (G.battles || []).filter((b) => b.sides.some((sd) => sd.f === p)).slice(0, 8);
  if (bl.length) h += '<h3>Battles</h3><ul class="routes">' + bl.map((b) => '<li data-a="viewbattle" data-v="' + b.id + '"><div><b>' + esc(b.kind + ' ' + b.place) + '</b> <span class="muted small">' + esc(b.date) + '</span></div><div class="small ' + (b.sides[b.winner].f === p ? 'pos' : 'neg') + '">' + (b.sides[b.winner].f === p ? 'Victory' : 'Defeat') + ' · losses ' + b.lost[b.sides[0].f === p ? 0 : 1] + '</div></li>').join('') + '</ul>';
  if (G.fleets.some((f) => f.f === p)) h += '<h3>Colonists under way</h3><ul class="plain">' + G.fleets.filter((f) => f.f === p).map((f) => '<li>' + esc(f.name) + ' · arrives in ' + (f.turns - f.done) + ' season(s)</li>').join('') + '</ul>';
  h += '<h3>Music</h3><p class="small">' + (Music.on ? 'Now playing: ' + esc(Music.label()) + '. The music follows the people of the town you open, slows in winter and gathers drums in wartime.' : 'Music is off. Turn it on from the top bar.') + '</p>';
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
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
const statline = (U0) => '<span class="stats">' + [['Atk', U0.M, 'Melee attack'], ['Def', U0.D, 'Defence and armour'], ['Rng', U0.R, 'Missile power'], ['Chg', U0.C, 'Charge'], ['Mor', U0.Mo, 'Morale']].map(([k, v, t]) => '<span title="' + t + '">' + k + ' <b>' + v + '</b></span>').join('') + '</span>';
function armyPos(a) {
  if (a.mv) { const f = C(a.mv.from), t = C(a.mv.to), p = pointAt(pathBetween(f, t, a.mv.k), (a.mv.done + 0.5) / a.mv.turns); return [p[0], p[1]]; }
  const c = C(a.at); return [c.x + 0.5, c.y + 0.5];
}
function armyStatus(a) {
  const full = a.units.reduce((s, u) => s + UNITS[u.t].men, 0) || 1, fill = armyMen(a) / full;
  if (a.mv) return a.mv.order === 'attack' ? ['atk', 'Attacking ' + C(a.mv.to).name] : a.mv.order === 'raid' ? ['atk', 'Raiding ' + C(a.mv.to).name] : ['go', 'Moving to ' + C(a.mv.to).name];
  if (fill < 0.7) return ['hurt', 'Under strength ' + Math.round(fill * 100) + '%'];
  return ['idle', 'Awaiting orders'];
}
function armiesPanel() {
  const p = G.player, mine = G.armies.filter((a) => a.f === p).sort((x, y) => (x.mv ? 1 : 0) - (y.mv ? 1 : 0) || y.str - x.str);
  const men = mine.reduce((s, a) => s + armyMen(a), 0), pow = mine.reduce((s, a) => s + a.str, 0), pay = mine.reduce((s, a) => s + armyUpkeep(a), 0);
  let h = head('Armies of ' + FAC[p].short, mine.length + ' armies in the field', FAC[p].col);
  h += '<div class="kv"><div><span>Armies</span><b>' + mine.length + '</b><small>' + mine.filter((a) => !a.mv).length + ' in camp</small></div><div><span>Soldiers</span><b>' + men.toLocaleString('en') + '</b><small>strength ' + fmt(pow) + '</small></div><div><span>Pay</span><b>' + fmt(pay) + '</b><small>per season</small></div></div>';
  // threats: hostile armies marching on or camped near our cities
  const threats = [];
  for (const a of G.armies) {
    if (a.f === p || !atWar(p, a.f)) continue;
    if (a.mv && C(a.mv.to).owner === p) threats.push([0, a, (a.mv.order === 'raid' ? 'raiding' : 'marching on') + ' <b>' + esc(C(a.mv.to).name) + '</b>, arrives in ' + (a.mv.turns - a.mv.done) + ' season(s)']);
    else if (!a.mv && a.at != null) { const c = C(a.at); const near = citiesOf(p).filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < 26).sort((x, y) => Math.hypot(x.x - c.x, x.y - c.y) - Math.hypot(y.x - c.x, y.y - c.y))[0]; if (near) threats.push([1, a, 'camped at ' + esc(c.name) + ', near <b>' + esc(near.name) + '</b>']); }
  }
  threats.sort((x, y) => x[0] - y[0] || y[1].str - x[1].str);
  h += '<h3>Threats <small>' + (threats.length ? threats.length + ' enemy forces' : 'none in sight') + '</small></h3>';
  for (const [, a, txt] of threats.slice(0, 8)) h += '<div class="threat" data-a="goarmy" data-v="' + a.id + '">' + chip(a.f) + ' <b>' + esc(a.name) + '</b> (' + fmt(a.str) + ', ' + esc(a.gen.name) + ') ' + txt + '</div>';
  h += '<h3>Your forces <small>click an army to take command</small></h3>';
  if (!mine.length) h += '<p class="muted">You have no armies. Recruit units in a city\'s Army tab.</p>';
  for (const a of mine) {
    const [k, txt] = armyStatus(a), where = a.mv ? 'from ' + esc(C(a.mv.from).name) + (a.mv.k === 'sea' ? ' by sea' : ' overland') + ' · ' + (a.mv.turns - a.mv.done) + ' season(s) left' : 'at ' + esc(C(a.at).name);
    h += '<div class="acard ' + (k === 'atk' ? 'go' : k) + '"><div class="ahead" data-a="goarmy" data-v="' + a.id + '"><b>' + esc(a.name) + '</b><span class="tag ' + k + '">' + esc(txt) + '</span><span class="val">' + fmt(a.str) + '</span></div>';
    h += '<div class="small muted">' + esc(a.gen.name) + ' <span class="gold">' + stars(a.gen.skill) + '</span> · ' + where + ' · ' + armyMen(a).toLocaleString('en') + ' men</div>';
    h += '<div class="aunits">' + a.units.map((u) => '<img src="' + unitIcon(u.t, FAC[a.f].col) + '" alt="' + esc(UNITS[u.t].n) + '" title="' + esc(UNITS[u.t].n) + ' ' + Math.round(u.men) + '/' + UNITS[u.t].men + '"' + (u.men < UNITS[u.t].men * 0.5 ? ' style="opacity:.55"' : '') + '>').join('') + '</div>';
    if (!a.mv) h += '<div class="row wrap"><button class="sm" data-a="aorder" data-v="attack" data-id="' + a.id + '">Attack…</button><button class="sm" data-a="aorder" data-v="raid" data-id="' + a.id + '">Raid…</button><button class="sm" data-a="aorder" data-v="move" data-id="' + a.id + '">Move…</button>' + (C(a.at).owner === p && replenishCost(a) ? '<button class="sm" data-a="areplenish" data-v="' + a.id + '">Replenish · ' + replenishCost(a) + '</button>' : '') + '<button class="sm" data-a="goarmy" data-v="' + a.id + '">Command</button></div>';
    h += '</div>';
  }
  const bare = citiesOf(p).filter((c) => !G.armies.some((a) => a.f === p && a.at === c.id) && G.armies.some((a) => a.f !== p && atWar(p, a.f) && (a.mv ? a.mv.to === c.id : a.at != null && Math.hypot(C(a.at).x - c.x, C(a.at).y - c.y) < 26)));
  if (bare.length) h += '<h3>Exposed cities <small>enemies near, no army</small></h3><p class="chips">' + bare.map((c) => '<a href="#" class="gchip" style="--c:var(--bad)" data-a="selcity" data-v="' + c.id + '">' + esc(c.name) + ' <b>' + fmt(c.gar) + '</b></a>').join('') + '</p>';
  h += '<p class="muted small">Keys: <kbd>A</kbd> opens this list, <kbd>N</kbd> jumps to the next army awaiting orders.</p>';
  return h;
}
function lookAtArmy(a) { const [x, y] = armyPos(a); cam.x = x + (VW > 760 ? 190 / cam.z : 0); cam.y = y + (VW <= 760 ? VH * 0.22 / cam.z : 0); if (cam.z < 5) cam.z = 5; clampCam(); }
function recruitBlock(c, army) {
  const ro = rosterFor(c.owner);
  let h = '<h3>Recruit in ' + esc(c.name) + ' <small>' + (army ? 'joins ' + esc(army.name) : 'joins the army here, or forms a new one') + '</small></h3><div class="ulist">';
  for (const e of ro) {
    const U0 = UNITS[e[0]], why = recruitWhy(c, e, true), cost = unitCost(c, e), fl = e[1] || '';
    h += '<div class="urow' + (why ? ' dis' : '') + '"><img class="uico" src="' + unitIcon(e[0], FAC[c.owner].col) + '" alt=""><div class="ubody"><b>' + esc(U0.n) + '</b>' + (fl.includes('m') ? ' <i class="t merc">Mercenary</i>' : '') + (fl.includes('c') ? ' <i class="t elite">Elite</i>' : '') + ' <span class="muted small">' + UCLS[U0.cls] + ' · ' + U0.men + ' men</span><p class="small muted">' + esc(U0.desc) + '</p>' + statline(U0) + '</div>';
    h += why ? '<span class="muted small why">' + esc(why) + '</span>' : '<button data-a="recruit" data-v="' + e[0] + '" data-c="' + c.id + '" data-army="' + (army ? army.id : '') + '" ' + (G.fac[c.owner].gold >= cost ? '' : 'disabled') + '>' + cost + '</button>';
    h += '</div>';
  }
  return h + '</div>';
}
function armyPanel(a) {
  const mine = a.f === G.player, g = a.gen || { name: 'No general', skill: 1 };
  if (UI.unitArmy !== a.id) { UI.unitArmy = a.id; UI.unitSel = new Set(); }
  let h = head(a.name, chip(a.f) + ' · ' + a.units.length + ' units · ' + armyMen(a).toLocaleString('en') + ' men', FAC[a.f].col);
  if (mine) h += '<p class="small"><a href="#" data-a="allarmies">← All armies</a></p>';
  h += '<div class="kv"><div><span>General</span><b class="gname">' + esc(g.name) + '</b><small class="gold">' + stars(g.skill) + '</small></div><div><span>Strength</span><b>' + fmt(a.str) + '</b><small>' + (g.wins || 0) + ' recent wins</small></div><div><span>Pay</span><b>' + fmt(armyUpkeep(a)) + '</b><small>per season</small></div></div>';
  if (a.mv) h += '<p>' + (a.mv.order === 'attack' ? 'Marching to assault ' : a.mv.order === 'raid' ? 'Riding to raid ' : 'Moving to ') + '<b>' + esc(C(a.mv.to).name) + '</b> ' + (a.mv.k === 'sea' ? 'by sea' : 'overland') + '. Arrives in ' + (a.mv.turns - a.mv.done) + ' season(s).</p>';
  else { const c = C(a.at); h += '<p>Stationed at <a href="#" data-a="selcity" data-v="' + c.id + '">' + esc(c.name) + '</a> (' + esc(TNAME[terr[c.y * W + c.x]]) + ').</p>'; }
  const cls = {}; for (const u of a.units) { const k = UNITS[u.t].cls; cls[k] = (cls[k] || 0) + u.men; } const tot = armyMen(a) || 1;
  const CC = { heavy: '#6f8fb0', spear: '#8aa0b8', pike: '#4f6f98', sword: '#b05a4a', light: '#b8a060', missile: '#d0b050', cav: '#a0703a', hcav: '#7a4a2a', hacav: '#c08a40', ele: '#9a9a98', chariot: '#8a6a50', camel: '#c8a060' };
  h += '<h3>Composition</h3><div class="pbar">' + Object.entries(cls).map(([k, v]) => '<i style="width:' + (v / tot * 100).toFixed(1) + '%;background:' + CC[k] + '" title="' + UCLS[k] + '"></i>').join('') + '</div><p class="chips small">' + Object.entries(cls).map(([k, v]) => '<span class="gchip" style="--c:' + CC[k] + '">' + UCLS[k] + ' <b>' + Math.round(v / tot * 100) + '%</b></span>').join('') + '</p>';
  h += '<div class="ulist">';
  a.units.forEach((u, i) => {
    const U0 = UNITS[u.t], sel = UI.unitSel.has(i);
    h += '<div class="urow' + (sel ? ' on' : '') + '"' + (mine && !a.mv ? ' data-a="selunit" data-v="' + i + '"' : '') + '><img class="uico" src="' + unitIcon(u.t, FAC[a.f].col) + '" alt=""><div class="ubody"><b>' + esc(U0.n) + '</b> <span class="gold small">' + '▲'.repeat(u.xp || 0) + '</span> <span class="muted small">' + UCLS[U0.cls] + '</span>' + statline(U0) + '</div><div class="umen"><b>' + Math.round(u.men) + '</b><small>/' + U0.men + '</small>' + bar(u.men, U0.men, u.men < U0.men * 0.5 ? 'bad' : '') + '</div></div>';
  });
  h += '</div>';
  if (!mine) return h;
  if (a.mv) return h + '<p class="muted small">Orders can be given when the army arrives.</p>';
  const c = C(a.at), rc = replenishCost(a), others = G.armies.filter((x) => x !== a && x.f === a.f && x.at === a.at && !x.mv).length;
  h += '<h3>Orders</h3><div class="row wrap"><button data-a="march" data-v="attack">Attack a city…</button><button data-a="march" data-v="raid">Raid a city…</button><button data-a="march" data-v="move">Move…</button></div>';
  h += '<div class="row wrap"><button data-a="split" ' + (UI.unitSel.size && UI.unitSel.size < a.units.length ? '' : 'disabled') + '>Split selected (' + UI.unitSel.size + ')</button><button data-a="merge" ' + (others ? '' : 'disabled') + '>Merge armies here</button>' + (c.owner === a.f ? '<button data-a="replenish" ' + (rc ? '' : 'disabled') + '>Replenish · ' + rc + '</button>' : '') + '<button class="danger" data-a="disbandsel" ' + (UI.unitSel.size ? '' : 'disabled') + '>Disband selected</button></div>';
  h += '<p class="muted small">Click units to select them. Pikes stop cavalry and elephants head-on but falter on hills, forest and marsh, where swordsmen cut them apart. Skirmishers and archers bleed elephants. Horse archers rule open steppe. Whoever wins the cavalry fight on the wings falls on the enemy flank.</p>';
  if (c.owner === a.f) h += recruitBlock(c, a);
  return h;
}
function battlePanel(rep) {
  const W0 = rep.sides[rep.winner];
  let h = head(rep.kind + ' ' + rep.place, rep.date + ' · ' + TNAME[rep.terr] + (rep.kind === 'Siege of' ? ' · walls ' + (roman(rep.walls) || 'none') : ''), FAC[W0.f].col);
  h += '<div class="scene"><div id="battle-slot"></div><div class="scap"><b>' + esc(FAC[W0.f].name) + ' victorious.</b> Losses ' + rep.lost[0].toLocaleString('en') + ' against ' + rep.lost[1].toLocaleString('en') + '. <button class="sm" data-a="replay">Replay</button></div></div>';
  rep.sides.forEach((sd, s) => {
    h += '<h3>' + (s ? 'Defenders' : 'Attackers') + ' <small>' + chip(sd.f) + (sd.gen ? ' · ' + esc(sd.gen.name) + ' <span class="gold">' + stars(sd.gen.skill) + '</span>' : '') + (sd.armies.length ? ' · ' + esc(sd.armies.join(', ')) : '') + '</small></h3>';
    h += '<div class="tbl"><table><thead><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th></tr></thead><tbody>' + rep.units[s].map((u) => '<tr><td class="small"><img class="uico sm" src="' + unitIcon(u.t, FAC[sd.f].col) + '" alt=""> ' + esc(UNITS[u.t].n) + (u.gar ? ' (garrison)' : '') + (u.routed ? ' <span class="warn">routed</span>' : '') + '</td><td>' + u.men0 + '</td><td>' + u.men1 + '</td><td class="neg">' + (u.men0 - u.men1) + '</td></tr>').join('') + '</tbody></table></div>';
  });
  h += '<h3>How it went</h3><ul class="plain">' + rep.lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>';
  return h;
}
function helpPanel() {
  return head('How to play', 'Oikoumene: the inhabited world', '#c9a24a') + `<div class="help">
<p><b>Each turn is a season.</b> Press <kbd>End season</kbd> (or Enter). Four seasons make a year, starting in spring 200 BC.</p>
<p><b>Cities</b> produce goods from their land and buildings and consume food, comforts and luxuries by culture: Gauls crave wine, Greeks want oil and papyrus, everyone needs grain. Click a city to see what it makes, what it lacks, and what it is building.</p>
<p><b>Construction</b> is visible in the city scene: scaffolding, a treadwheel crane and workers raise each building. Builders need timber; a city short of timber builds slowly.</p>
<p><b>Trade routes</b> form when one city has a surplus another lacks, and both sides are at peace with trade rights. Click any route line (or a ship) to see cargo in each direction, value, tariffs and risk. Winter closes the sea (mare clausum) and cuts cargoes.</p>
<p><b>Colonies</b>: from a harbour city, choose <i>Army &amp; colonies → Choose a colony site</i>, or simply click unclaimed land. Green squares show where your ships can reach.</p>
<p><b>Armies</b> are built from your people's own units: legions of hastati, principes and triarii; Macedonian phalanxes and Companions; Carthage's Libyans, Sacred Band, Numidian horse and Balearic slingers; Seleucid cataphracts, scythed chariots and elephants; Gaulish warbands and Gaesatae; steppe horse archers. Recruit them in a city's Army tab. Elite units need barracks or the capital, cavalry needs horses, and mercenaries hire in ports and markets.</p>
<p><b>The Armies tab</b> (key <kbd>A</kbd>) lists every one of your forces with its general, location, units and orders, plus enemy armies marching on your cities. Click an army to fly to it and take command; <kbd>N</kbd> jumps to the next army awaiting orders.</p>
<p><b>Battles</b> are fought in phases: missiles, the cavalry fight on the wings, the charge, melee rounds with morale and rout, then pursuit. Terrain matters: pikes rule flat ground and falter on hills and in forest. Every battle has a report and a replay; click the crossed swords on the map or View battle in the chronicle.</p>
<p><b>Map modes</b>: Political, Trade (every route in the world), Goods (each city's main products), Terrain.</p>
<p><b>Music</b> is composed live in the ancient modes: Dorian lyre and aulos for Greeks and Romans, Phrygian harp and frame drum for the Levant and Carthage, Lydian harp and sistrum on the Nile, pentatonic pipes and carnyx in the north and west, and fiddle and horse drum on the steppe. It follows the people of the town you open.</p>
<p><b>Controls</b>: drag to pan, wheel or pinch to zoom, <kbd>Esc</kbd> to cancel.</p></div>`;
}

// ---- actions -------------------------------------------------------------------
const ACT = {
  close: () => { UI.sel = null; renderPanel(); },
  tab: (v) => { UI.tab = v; renderPanel(); },
  build: (v) => { const c = C(UI.sel.id), e = queueBuild(c, v); if (e) toast(e, 'bad'); else { toast(bname(v, c.culture) + ' ordered in ' + c.name, 'good'); Music.sfx('build'); } renderAll(); },
  cancelq: (v) => { const c = C(UI.sel.id), it = c.q[+v]; if (!it) return; c.q.splice(+v, 1); G.fac[c.owner].gold += Math.round(it.cost * 0.75); toast('Cancelled; 75% refunded'); renderAll(); },
  selroute: (v) => select({ type: 'route', id: +v }),
  selcity: (v) => { select({ type: 'city', id: +v }); lookAtCity(C(+v)); },
  selarmy: (v) => select({ type: 'army', id: +v }),
  goarmy: (v) => { const a = G.armies.find((x) => x.id === +v); if (!a) return; lookAtArmy(a); select({ type: 'army', id: a.id }); },
  aorder: (v, el) => { const a = G.armies.find((x) => x.id === +el.dataset.id); if (!a) return; lookAtArmy(a); select({ type: 'army', id: a.id }); ACT.march(v); },
  areplenish: (v) => { const a = G.armies.find((x) => x.id === +v), e = replenish(a); toast(e || 'The ranks of ' + a.name + ' are filled', e ? 'bad' : 'good'); renderAll(); },
  allarmies: () => select({ type: 'armies' }),
  newroute: () => { const c = C(UI.sel.id); const targets = c.cand.map((n) => n.id).filter((id) => { const o = C(id); return o.owner && access(c.owner, o.owner) && !G.routes.some((r) => dk(r.a, r.b) === dk(c.id, id)); }); UI.mode = { type: 'route', from: c.id, targets, msg: 'Pick a partner for ' + c.name + ' (ringed cities have trade access)' }; renderMode(); },
  pinr: (v) => { const r = G.routes.find((x) => x.id === +v); if (r) r.pin = !r.pin; renderPanel(); },
  closer: (v) => { const r = G.routes.find((x) => x.id === +v); if (!r) return; G.routes = G.routes.filter((x) => x !== r); G.black[dk(r.a, r.b)] = G.turn + 8; toast('Route closed. Merchants will stay away for two years.'); renderAll(); },
  pin: () => { const r = G.routes.find((x) => x.id === UI.sel.id); r.pin = !r.pin; renderPanel(); },
  closeroute: () => { const r = G.routes.find((x) => x.id === UI.sel.id); G.routes = G.routes.filter((x) => x !== r); G.black[dk(r.a, r.b)] = G.turn + 8; toast('Route closed. Merchants will stay away for two years.'); UI.sel = { type: 'city', id: r.a }; renderAll(); },
  recruit: (v, el) => { const c = C(+el.dataset.c), e = rosterFor(c.owner).find((x) => x[0] === v), army = el.dataset.army ? G.armies.find((x) => x.id === +el.dataset.army) : null; const err = recruit(c, e, army); if (err) toast(err, 'bad'); else { toast(UNITS[v].n + ' join the colours in ' + c.name, 'good'); Music.sfx('build'); } renderAll(); },
  selunit: (v) => { const i = +v; if (UI.unitSel.has(i)) UI.unitSel.delete(i); else UI.unitSel.add(i); renderPanel(); },
  split: () => { const a = G.armies.find((x) => x.id === UI.sel.id), b = splitArmy(a, [...UI.unitSel]); if (typeof b === 'string') toast(b, 'bad'); else { toast('New army formed: ' + b.name, 'good'); UI.unitSel = new Set(); select({ type: 'army', id: b.id }); } renderAll(); },
  merge: () => { const a = G.armies.find((x) => x.id === UI.sel.id), e = mergeInto(a); if (e) toast(e, 'bad'); UI.unitSel = new Set(); renderAll(); },
  replenish: () => { const a = G.armies.find((x) => x.id === UI.sel.id), e = replenish(a); toast(e || 'The ranks are filled with fresh recruits', e ? 'bad' : 'good'); renderAll(); },
  disbandsel: () => { const a = G.armies.find((x) => x.id === UI.sel.id); a.units = a.units.filter((u, i) => !UI.unitSel.has(i)); UI.unitSel = new Set(); recalc(a); if (!a.units.length) { G.armies = G.armies.filter((x) => x !== a); UI.sel = null; } renderAll(); },
  viewbattle: (v) => { UI.battleT0 = performance.now(); select({ type: 'battle', id: +v }); },
  replay: () => { UI.battleT0 = performance.now(); },
  colonymode: () => { const c = C(UI.sel.id); buildColonyOverlay(c); UI.mode = { type: 'colony', origin: c.id, msg: 'Click a green site to plant a colony from ' + c.name }; renderMode(); },
  found: (v) => { const s = UI.sel, name = ($('#colname') || {}).value; const e = launchColony(C(+v), s.x, s.y, (name || '').trim() || null); if (e) toast(e, 'bad'); else { toast('Colonists set out for ' + (name || 'the new site'), 'good'); Music.sfx('fanfare'); UI.mode = null; renderMode(); UI.sel = { type: 'realm' }; } UI.colName = null; renderAll(); },
  march: (v) => { const a = G.armies.find((x) => x.id === UI.sel.id), from = C(a.at); const targets = G.cities.filter((t) => t.owner && reach(from, t) && (v === 'move' ? t.owner === a.f || allied(a.f, t.owner) : atWar(a.f, t.owner))).map((t) => t.id); if (!targets.length) { toast(v === 'move' ? 'No friendly city within reach' : 'No enemy city within reach. Declare war first?', 'bad'); return; } UI.mode = { type: 'march', army: a.id, order: v, targets, msg: (v === 'attack' ? 'Choose a city to assault' : v === 'raid' ? 'Choose a city to raid' : 'Choose where to move') + ' (ringed cities are in reach)' }; renderMode(); },
  dipsel: (v) => { UI.dipSel = UI.dipSel === v ? null : v; UI.confirmWar = null; renderPanel(); },
  dipwith: (v) => { UI.dipSel = v; select({ type: 'dip' }); },
  confirmwar: (v) => { UI.confirmWar = v; renderPanel(); },
  dip: (v, el) => { const [k, m] = playerDip(v, el.dataset.f); toast(m, k); if (v === 'war') Music.sfx('war'); else if (k === 'good') Music.sfx('coin'); UI.confirmWar = null; renderAll(); },
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
  for (const b of G.battles || []) { if (b.turn < G.turn - 2) continue; const [x, y] = w2s(b.x + 0.5, b.y + 0.5); if (Math.abs(sx - (x - 9 * u)) < 7 + u * 2 && Math.abs(sy - (y - 9 * u)) < 7 + u * 2) return { type: 'battle', id: b.id }; }
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
  if (h.type === 'battle') { UI.battleT0 = performance.now(); }
  select(h);
}
function tooltipFor(h) {
  if (!h) return '';
  if (h.type === 'city') { const c = C(h.id); const top = Object.entries(c.P || {}).sort((p, q) => q[1] * price(q[0]) - p[1] * price(p[0])).slice(0, 3).map(([g]) => GD[g].n).join(', '); return '<b>' + esc(c.name) + '</b> ' + chip(c.owner) + '<br>' + fmt(c.pop) + 'k people' + (c.q.length ? ' · building ' + esc(bname(c.q[0].b, c.culture)) : '') + '<br><span class="muted">' + esc(top) + '</span><br>' + topPeoples(c, 3).map(([p, v]) => esc(PEOPLES[p][0]) + ' ' + Math.round(v * 100) + '%').join(' · '); }
  if (h.type === 'route') { const r = G.routes.find((x) => x.id === h.id); if (!r) return ''; return '<b>' + esc(C(r.a).name) + ' ⇄ ' + esc(C(r.b).name) + '</b><br>' + (r.flows.slice(0, 3).map((f) => esc(GD[f.g].n)).join(', ') || 'idle') + ' · ' + fmt(r.val); }
  if (h.type === 'army') { const a = G.armies.find((x) => x.id === h.id); return '<b>' + esc(a.name) + '</b> ' + chip(a.f) + ' · ' + fmt(a.str) + '<br>' + esc(a.gen.name) + ' ' + stars(a.gen.skill) + '<br><span class="muted">' + a.units.length + ' units, ' + armyMen(a).toLocaleString('en') + ' men</span>'; }
  if (h.type === 'battle') { const b = G.battles.find((x) => x.id === h.id); return '<b>' + esc(b.kind + ' ' + b.place) + '</b><br>' + esc(FAC[b.sides[b.winner].f].short) + ' victorious · ' + esc(b.date); }
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
  document.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT') return; if (e.key === 'Escape') { if (UI.mode) { UI.mode = null; renderMode(); } else { UI.sel = null; renderPanel(); } } if (e.key === 'Enter' && G && $('#start').hidden) doEndTurn();
    if (G && $('#start').hidden && (e.key === 'a' || e.key === 'A')) select(UI.sel && UI.sel.type === 'armies' ? null : { type: 'armies' });
    if (G && $('#start').hidden && (e.key === 'n' || e.key === 'N')) { const idle = G.armies.filter((a) => a.f === G.player && !a.mv); if (idle.length) { const cur = UI.sel && UI.sel.type === 'army' ? idle.findIndex((a) => a.id === UI.sel.id) : -1; ACT.goarmy(idle[(cur + 1) % idle.length].id); } } if (e.key === '+' || e.key === '=') zoomAt(1, VW / 2, VH / 2); if (e.key === '-') zoomAt(-1, VW / 2, VH / 2); });
  $('#endturn').addEventListener('click', doEndTurn);
  $('#musicbtn').addEventListener('click', () => { Music.toggle(); if (Music.on) Music.refresh(); renderMusic(); });
  $('#modecancel').addEventListener('click', () => { UI.mode = null; renderMode(); });
  document.querySelectorAll('[data-mapmode]').forEach((b) => b.addEventListener('click', () => { UI.mapMode = b.dataset.mapmode; renderTop(); }));
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { const t = b.dataset.open; select(UI.sel && UI.sel.type === t ? null : { type: t }); }));
  $('#chron').addEventListener('click', (ev) => { if (ev.target.closest('[data-a]')) return; UI.chronOpen = !UI.chronOpen; $('#chron').classList.toggle('open', UI.chronOpen); renderChron(); });
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
    const before = G.fac[G.player].gold, warsBefore = FIDS.filter((f) => atWar(G.player, f)).length; endTurn(); Music.sfx(FIDS.filter((f) => atWar(G.player, f)).length > warsBefore ? 'war' : 'turn'); Music.refresh(); saveGame(); busy = false; $('#endturn').disabled = false; $('#endturn').textContent = 'End season';
    if (UI.mode && UI.mode.type === 'colony') buildColonyOverlay(C(UI.mode.origin));
    renderAll(); const d = G.fac[G.player].gold - before; toast(dateStr() + ' · treasury ' + (d >= 0 ? '+' : '') + fmt(d), d >= 0 ? 'good' : 'bad');
  }, 30);
}

// ---- start screen, save/load ------------------------------------------------------
const GROUPS = [['Great powers', ['rome', 'carthage', 'macedon', 'seleucid', 'ptolemaic']], ['Greek states', ['epirus', 'athens', 'aetolia', 'achaea', 'sparta', 'rhodes', 'crete', 'pergamon', 'massilia', 'byzantium', 'euxine', 'bosporus', 'bithynia', 'boeotia', 'ionians']],
  ['Anatolia', ['pontus', 'cappadocia', 'galatia', 'paphlagonia', 'pisidians', 'cilicia']], ['Mesopotamia, Iran and Arabia', ['persis', 'parthia', 'atropatene', 'chorasmia', 'dahae', 'gerrha', 'arabs', 'nabataea']], ['Caucasus', ['armenia', 'kartli', 'albania', 'colchis']], ['Africa', ['numidia', 'mauretania', 'thebaid', 'kush', 'garamantes']], ['Gauls and Italians', ['arverni', 'aedui', 'sequani', 'carnutes', 'belgae', 'armorici', 'volcae', 'allobroges', 'helvetii', 'boii', 'insubres', 'ligures', 'veneti', 'norici', 'bituriges']],
  ['Iberia', ['celtiberi', 'lusitani', 'turdetani', 'ilergetes', 'oretani', 'gallaeci', 'aquitani', 'vettones', 'vascones', 'baleares']], ['Britain and Ireland', ['britons', 'dumnonii', 'brigantes', 'caledonii', 'hiberni', 'silures']],
  ['Germania and the north', ['cimbri', 'suebi', 'chatti', 'frisii', 'gutones', 'scandians', 'bastarnae', 'cherusci', 'lugii', 'venedi', 'fenni']], ['Balkans and the steppe', ['illyria', 'dardani', 'odrysae', 'getae', 'scythia', 'sarmatia', 'scordisci', 'budini']]];
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
  $('#begin').addEventListener('click', () => { if (Music.loadPref() !== 'off') Music.start(); renderMusic(); el.innerHTML = '<div class="loading">Surveying the coasts and charting the sea lanes…</div>'; setTimeout(() => { PATHS.clear(); newGame(UI.startPick); flagPirates(); afterLoad(); el.hidden = true; }, 30); });
  const cb = $('#cont'); if (cb) cb.addEventListener('click', () => { if (Music.loadPref() !== 'off') Music.start(); renderMusic(); if (loadGame()) el.hidden = true; else toast('Could not read the saved game', 'bad'); });
}
function saveGame() { try { const s = JSON.stringify(G, (k, v) => (k === '_disp' || k === 'flash' || k === 'cand' || k === 'seaN' || k === 'landN' ? undefined : v)); localStorage.setItem(SAVE_KEY, s); return true; } catch (e) { return false; } }
function loadGame() {
  try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; G = JSON.parse(s); } catch (e) { return false; }
  PATHS.clear(); for (const c of G.cities) { c.seaN = null; c.landN = null; } for (const c of G.cities) if (!c.ppl) initPeople(c); for (const c of G.cities) linkCity(c); for (const c of G.cities) c.cand = tradeCands(c);
  const now = performance.now(); for (const c of G.cities) for (const q of c.q) q.ts = now; for (const a of G.armies) if (a.mv) a.mv.ts = now; for (const f of G.fleets) f.ts = now;
  computeTerritory(); flagPirates(); afterLoad(); return true;
}
function afterLoad() {
  buildPolitical(); UI.sel = null; UI.mode = null; renderMode();
  const cap = citiesOf(G.player).find((c) => c.capital) || citiesOf(G.player)[0]; if (cap) { cam.z = 5; lookAtCity(cap); select({ type: 'city', id: cap.id }); UI.tab = 'econ'; }
  renderAll();
}
function onDefeat() { toast('Your state has fallen. Start a new game from the Realm panel.', 'bad'); }
function onColony(c) { toast('The colony of ' + c.name + ' is founded!', 'good'); Music.sfx('fanfare'); }
function renderMusic() { const b = $('#musicbtn'); if (!b) return; b.textContent = Music.on ? 'Music: on' : 'Music: off'; b.setAttribute('aria-pressed', Music.on ? 'true' : 'false'); b.title = Music.on ? 'Now playing: ' + Music.label() + '. Click to mute.' : 'Play music in the ancient modes'; }

// ---- boot --------------------------------------------------------------------
function resize() { const tb = $('#top'); if (tb) document.documentElement.style.setProperty('--toph', tb.offsetHeight + 18 + 'px'); const cv = $('#map'); DPR = Math.min(2, window.devicePixelRatio || 1); VW = cv.clientWidth; VH = cv.clientHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); clampCam(); }
function frame(t) {
  try { drawMap(t); if (G && UI.sel && UI.sel.type === 'city' && !$('#panel').hidden && SCENE.isConnected) { SCENECTX.imageSmoothingEnabled = false; drawScene(SCENECTX, C(UI.sel.id), t); }
    if (G && UI.sel && UI.sel.type === 'battle' && BATTLECV.isConnected) { const b = G.battles.find((x) => x.id === UI.sel.id); if (b) { BATTLECTX.imageSmoothingEnabled = false; drawBattle(BATTLECTX, b, performance.now() - (UI.battleT0 || 0)); } } } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
function boot() {
  MAPCTX = $('#map').getContext('2d'); SCENE = document.createElement('canvas'); SCENE.width = 200; SCENE.height = 100; SCENE.className = 'scenecv'; SCENECTX = SCENE.getContext('2d'); BATTLECV = document.createElement('canvas'); BATTLECV.width = 240; BATTLECV.height = 120; BATTLECV.className = 'scenecv battlecv'; BATTLECTX = BATTLECV.getContext('2d');
  buildMap(); buildTerrainCanvas(); resize(); window.addEventListener('resize', resize);
  cam.z = VW > 1100 ? 4 : 3; cam.x = W * 0.55; cam.y = H * 0.6; clampCam();
  setupInput(); showStart(); requestAnimationFrame(frame);
  setInterval(() => { if (G && UI.sel && UI.sel.type === 'city' && !$('#panel').hidden) { const q = C(UI.sel.id).q[0]; const el = document.querySelector('.scap'); if (!q && el && el.textContent.startsWith('Building')) renderPanel(); } }, 2000);
}
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
