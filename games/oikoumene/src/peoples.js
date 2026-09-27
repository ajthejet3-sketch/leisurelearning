'use strict';
// ============================================================================
// Peoples: every settlement holds a mix of ethnic groups. Rulers of another
// people cost public order; peoples assimilate slowly toward the ruler, move
// along trade routes, sail out with colonists and arrive with conquerors.
// ============================================================================

// id: [name, dress colour, family, one-line description]
const PEOPLES = {
  latin: ['Latins', '#b23a2e', 'italic', 'Citizens of Rome and the Latin colonies'],
  oscan: ['Oscans', '#b0703a', 'italic', 'Samnites, Campanians and Lucanians of the south'],
  etruscan: ['Etruscans', '#8a4a2a', 'italic', 'An ancient people of Tuscany, masters of bronze and augury'],
  venetic: ['Veneti', '#a86b6b', 'italic', 'Horse breeders of the Adriatic lagoons'],
  ligurian: ['Ligurians', '#7f8a4a', 'italic', 'Hill folk of the Maritime Alps'],
  sardinian: ['Sardinians', '#8a7a5a', 'italic', 'Builders of the nuraghe towers of Sardinia and Corsica'],
  greek: ['Greeks', '#3d6ea8', 'hellenic', 'Hellenes of the cities, from Massalia to the Euxine'],
  macedonian: ['Macedonians', '#2f55a0', 'hellenic', 'The kingdom\'s own people and the soldier-settlers of the east'],
  punic: ['Punics', '#7b46a8', 'semitic', 'Carthaginians and the western Phoenicians'],
  phoenician: ['Phoenicians', '#8e3a9a', 'semitic', 'Tyrians, Sidonians and Aradians of the Levant coast'],
  syrian: ['Syrians', '#b88a3a', 'semitic', 'Aramaic-speaking farmers and townsfolk of Syria and Mesopotamia'],
  jewish: ['Judaeans', '#4a7ab0', 'semitic', 'People of Judaea and the diaspora'],
  arab: ['Arabs', '#c9924a', 'semitic', 'Nabataeans, Lihyanites, Gerrhaeans and the desert tribes'],
  babylonian: ['Babylonians', '#a0603a', 'semitic', 'Heirs of Babylon: temple scholars, astronomers, farmers of the canals'],
  libyan: ['Libyans', '#c2a060', 'berber', 'Farmers and herders of Africa, subjects of Carthage'],
  numidian: ['Numidians', '#b08a4a', 'berber', 'Horse peoples of Numidia and Mauretania'],
  egyptian: ['Egyptians', '#e8dcb0', 'nilotic', 'The native people of the Nile'],
  nubian: ['Nubians', '#6a4a2a', 'nilotic', 'People of Kush and the cataracts'],
  iberian: ['Iberians', '#b5744a', 'iberian', 'Peoples of the Mediterranean coast and the south of Iberia'],
  celtiberian: ['Celtiberians', '#a0673a', 'iberian', 'Celts of the Iberian meseta'],
  lusitanian: ['Lusitanians', '#86562f', 'iberian', 'Peoples of the western hills of Iberia'],
  gaulish: ['Gauls', '#4f8a3a', 'celtic', 'Celts of Gaul, the Alps, the Po and the Danube'],
  galatian: ['Galatians', '#72a038', 'celtic', 'Celts settled in the heart of Anatolia'],
  british: ['Britons', '#4f8898', 'celtic', 'Celts of Britain'],
  gaelic: ['Gaels', '#3f9a5a', 'celtic', 'Celts of Ireland'],
  germanic: ['Germani', '#5a70a0', 'northern', 'Peoples of the northern forests and Scandza'],
  baltic: ['Balts', '#7a8a6a', 'northern', 'Amber gatherers and forest folk east of the Vistula'],
  finnic: ['Finns', '#8aa0a0', 'northern', 'Hunters of the far north'],
  illyrian: ['Illyrians', '#9a523c', 'balkan', 'Peoples of the Adriatic hills'],
  thracian: ['Thracians', '#b4622f', 'balkan', 'Horsemen and peltasts of Thrace and Bithynia'],
  dacian: ['Dacians', '#8e7a40', 'balkan', 'Getae and Dacians of the Danube and Carpathians'],
  scythian: ['Scythians', '#c29640', 'steppe', 'Horse nomads of the Pontic steppe and the Kara Kum'],
  sarmatian: ['Sarmatians', '#a88e5a', 'steppe', 'Armoured horsemen from beyond the Don'],
  anatolian: ['Anatolians', '#9a7a6a', 'anatolian', 'Phrygians, Lydians, Carians, Cappadocians and their kin'],
  armenian: ['Armenians', '#c05a3a', 'caucasian', 'People of the Armenian highlands'],
  kartvelian: ['Kartvelians', '#8a6aa0', 'caucasian', 'Colchians and Iberians of the Caucasus'],
  caucasian: ['Albanians', '#6a9a9a', 'caucasian', 'Caucasian Albanians of the Caspian shore'],
  persian: ['Persians', '#b8742a', 'iranian', 'The people of Cyrus and Darius'],
  median: ['Medes', '#6a8ab0', 'iranian', 'The people of Ekbatana and the Zagros'],
  parthian: ['Parthians', '#8a4a8a', 'iranian', 'Parni horsemen and Parthian farmers'],
  chorasmian: ['Chorasmians', '#9aa05a', 'iranian', 'Oasis people of the lower Oxus'],
};
const NATIVE = [
  ['latin', 12.6, 41.8], ['oscan', 14.8, 41.2], ['oscan', 16, 40.2], ['etruscan', 11.4, 43.1], ['venetic', 12, 45.5], ['ligurian', 8.2, 44.4], ['gaulish', 9.5, 45.4], ['gaulish', 11.2, 44.6],
  ['sardinian', 9, 40], ['sardinian', 9.2, 42.1], ['greek', 17.1, 40.4], ['greek', 16.6, 39.1], ['greek', 14.8, 37.3], ['greek', 22.5, 37.5], ['greek', 23.5, 38.3], ['greek', 21.3, 38.7],
  ['greek', 20.5, 39.6], ['greek', 25.0, 35.2], ['greek', 26.5, 38.8], ['greek', 27.3, 37.7], ['greek', 28.2, 36.4], ['greek', 33.3, 35.1], ['greek', 25.5, 37.1], ['greek', 21.9, 32.8],
  ['greek', 25, 40.2], ['greek', 36.5, 45.3], ['greek', 33.5, 44.6], ['greek', 31.9, 46.6], ['greek', 28.8, 44.2], ['greek', 27.8, 42.6], ['greek', 35, 42], ['greek', 31.4, 41.3], ['greek', 29, 41],
  ['macedonian', 22.4, 40.6], ['macedonian', 22.3, 39.6], ['punic', 10.3, 36.8], ['punic', 10.8, 35.5], ['punic', 13.5, 32.8], ['punic', -6.2, 36.5], ['punic', 1.4, 38.9], ['punic', 12.5, 37.9],
  ['libyan', 9.2, 35.8], ['libyan', 12, 31], ['libyan', 13, 27], ['libyan', 8.5, 30.5], ['libyan', 20, 30.5], ['libyan', 25, 30.5],
  ['numidian', 6.5, 36.2], ['numidian', 2.5, 35.8], ['numidian', -1.5, 35], ['numidian', -5.5, 34.5], ['numidian', -8, 31],
  ['iberian', -0.8, 38.5], ['iberian', 0.5, 41.5], ['iberian', -4.5, 37.6], ['iberian', -6.5, 37.3], ['iberian', 2.8, 39.6], ['iberian', -0.5, 43.3],
  ['celtiberian', -2.6, 41.5], ['celtiberian', -4.5, 40.3], ['celtiberian', -4.8, 42.3], ['lusitanian', -8.3, 39.3], ['lusitanian', -8, 42.5],
  ['gaulish', 2.5, 46.5], ['gaulish', 0, 45], ['gaulish', 4, 48.5], ['gaulish', -2.5, 48], ['gaulish', 5, 44.5], ['gaulish', 7.5, 47], ['gaulish', 14, 47], ['gaulish', 14.5, 50],
  ['gaulish', 20.5, 45], ['gaulish', 16.5, 45.5], ['gaulish', 4.5, 50.5], ['british', -1, 52], ['british', -4, 51], ['british', -3, 55], ['british', -4, 57], ['gaelic', -7.5, 53.5],
  ['germanic', 9, 53], ['germanic', 12, 51.5], ['germanic', 9.5, 56], ['germanic', 13.5, 55.8], ['germanic', 16, 57.5], ['germanic', 8, 59.5], ['germanic', 17.5, 60], ['germanic', 17, 51.5],
  ['germanic', 19, 53.8], ['germanic', 26.5, 47.5], ['baltic', 21.5, 55.5], ['baltic', 24, 53.5], ['baltic', 27, 52.5], ['finnic', 25, 61], ['finnic', 30, 61], ['finnic', 36, 51],
  ['illyrian', 19.5, 42], ['illyrian', 17, 43.5], ['illyrian', 15, 45], ['illyrian', 14, 45.2], ['thracian', 25, 42.3], ['thracian', 22, 43], ['thracian', 26.5, 41.2],
  ['dacian', 24, 45.8], ['dacian', 26.5, 44.2], ['dacian', 27.5, 46.2], ['scythian', 34, 46.5], ['scythian', 31, 48], ['scythian', 55, 39.5], ['sarmatian', 42, 47], ['sarmatian', 40, 45.3], ['sarmatian', 46, 48.5],
  ['anatolian', 32, 39], ['anatolian', 29, 38.5], ['anatolian', 35.5, 38.5], ['anatolian', 36, 40.8], ['anatolian', 30.5, 37], ['anatolian', 32.5, 36.6], ['anatolian', 29.5, 40.3], ['anatolian', 33.6, 40.8], ['anatolian', 39.7, 41],
  ['galatian', 33, 39.8], ['armenian', 43.5, 39.5], ['armenian', 40.3, 38.8], ['kartvelian', 43.5, 42], ['kartvelian', 42, 42.2], ['caucasian', 47.8, 41.3],
  ['syrian', 36.8, 35.8], ['syrian', 36.3, 33.6], ['syrian', 38.5, 37], ['syrian', 40.7, 34.8], ['syrian', 41.5, 37], ['syrian', 44, 36.2], ['phoenician', 35.3, 33.5], ['phoenician', 35.8, 34.8],
  ['jewish', 35.2, 31.9], ['arab', 35.5, 30.3], ['arab', 38.3, 27], ['arab', 40, 29.8], ['arab', 50, 25.7], ['arab', 36.5, 32.5],
  ['babylonian', 44.5, 32.6], ['babylonian', 46, 31.3], ['persian', 48.3, 32.2], ['persian', 52.8, 29.9], ['persian', 57, 29], ['persian', 51, 29], ['median', 48.5, 34.8], ['median', 47.5, 36.6],
  ['median', 51.4, 35.6], ['parthian', 57, 37.5], ['parthian', 54.4, 36.4], ['chorasmian', 60, 41.8], ['egyptian', 31, 29.5], ['egyptian', 32.6, 25.7], ['egyptian', 30, 31], ['nubian', 31.5, 22.3], ['nubian', 32.7, 23.3],
];
const FPEOPLE = { rome: 'latin', carthage: 'punic', macedon: 'macedonian', seleucid: 'greek', ptolemaic: 'greek', massilia: 'greek', euxine: 'greek', bosporus: 'greek', byzantium: 'greek',
  pergamon: 'greek', rhodes: 'greek', crete: 'greek', ionians: 'greek', galatia: 'galatian', nabataea: 'arab', veneti: 'venetic', ligures: 'ligurian', thebaid: 'egyptian', kush: 'nubian',
  gerrha: 'arab', arabs: 'arab', parthia: 'parthian', persis: 'persian', atropatene: 'median', bithynia: 'thracian', pontus: 'persian', cappadocia: 'anatolian', armenia: 'armenian',
  mauretania: 'numidian', numidia: 'numidian', garamantes: 'libyan', scythia: 'scythian', sarmatia: 'sarmatian', budini: 'finnic', dahae: 'scythian', chorasmia: 'chorasmian',
  colchis: 'kartvelian', kartli: 'kartvelian', albania: 'caucasian', scordisci: 'gaulish', bastarnae: 'germanic', venedi: 'baltic', fenni: 'finnic', insubres: 'gaulish', boii: 'gaulish' };
// Famous cities with well-attested mixed populations.
const PEOPLE_OVERRIDE = {
  Alexandreia: { greek: 0.34, macedonian: 0.04, egyptian: 0.44, jewish: 0.14, syrian: 0.04 }, Antiocheia: { greek: 0.4, macedonian: 0.06, syrian: 0.46, jewish: 0.05, phoenician: 0.03 },
  'Seleukeia-Tigris': { greek: 0.33, macedonian: 0.04, babylonian: 0.42, syrian: 0.12, jewish: 0.05, persian: 0.04 }, Babylon: { babylonian: 0.8, greek: 0.1, jewish: 0.07, persian: 0.03 },
  Roma: { latin: 0.78, oscan: 0.06, greek: 0.08, etruscan: 0.04, punic: 0.02, gaulish: 0.02 }, Carthago: { punic: 0.68, libyan: 0.2, greek: 0.05, numidian: 0.05, iberian: 0.02 },
  Syracusae: { greek: 0.8, latin: 0.08, punic: 0.06, oscan: 0.06 }, Massalia: { greek: 0.8, ligurian: 0.13, gaulish: 0.07 }, Gades: { punic: 0.72, iberian: 0.22, latin: 0.06 },
  Hierosolyma: { jewish: 0.9, greek: 0.05, syrian: 0.05 }, Memphis: { egyptian: 0.84, greek: 0.1, jewish: 0.04, syrian: 0.02 }, Tyros: { phoenician: 0.85, greek: 0.1, syrian: 0.05 },
  Sidon: { phoenician: 0.85, greek: 0.1, syrian: 0.05 }, Sardeis: { anatolian: 0.68, greek: 0.25, persian: 0.05, jewish: 0.02 }, Ankyra: { galatian: 0.5, anatolian: 0.5 },
  Pergamon: { greek: 0.75, anatolian: 0.22, galatian: 0.03 }, Byzantion: { greek: 0.84, thracian: 0.16 }, Pantikapaion: { greek: 0.6, scythian: 0.4 }, Olbia: { greek: 0.7, scythian: 0.3 },
  Emporion: { greek: 0.6, iberian: 0.4 }, Sousa: { persian: 0.55, babylonian: 0.2, greek: 0.2, jewish: 0.05 }, Ekbatana: { median: 0.85, greek: 0.1, persian: 0.05 },
  Gerrha: { arab: 0.8, babylonian: 0.1, persian: 0.1 }, Kyrene: { greek: 0.7, libyan: 0.2, jewish: 0.1 }, Athenai: { greek: 0.9, anatolian: 0.03, thracian: 0.03, phoenician: 0.02, jewish: 0.02 },
  Rhodos: { greek: 0.86, anatolian: 0.06, phoenician: 0.05, syrian: 0.03 }, Korinthos: { greek: 0.86, macedonian: 0.08, anatolian: 0.03, jewish: 0.03 }, Petra: { arab: 0.92, greek: 0.04, syrian: 0.04 },
};
const pdist = (lon, lat, a) => Math.hypot((lon - a[1]) * KX, lat - a[2]);
function nativeAt(lon, lat) { let best = NATIVE[0], bd = 1e9; for (const a of NATIVE) { const d = pdist(lon, lat, a); if (d < bd) { bd = d; best = a; } } return best[0]; }
function secondNative(lon, lat, first) { let best = null, bd = 2.4; for (const a of NATIVE) { if (a[0] === first) continue; const d = pdist(lon, lat, a); if (d < bd) { bd = d; best = a[0]; } } return best; }
const facPeople = (f) => FPEOPLE[f] || (G && G.facPeople && G.facPeople[f]) || 'greek';
const pfam = (p) => PEOPLES[p][2];
function normPeople(m) { let s = 0; for (const k in m) { if (m[k] < 0.004) delete m[k]; else s += m[k]; } for (const k in m) m[k] /= s || 1; return m; }
function mixIn(m, other, w) { for (const k in m) m[k] *= 1 - w; for (const k in other) m[k] = (m[k] || 0) + other[k] * w; return normPeople(m); }
function initPeople(c) {
  if (PEOPLE_OVERRIDE[c.name]) { c.ppl = Object.assign({}, PEOPLE_OVERRIDE[c.name]); return; }
  const nat = nativeAt(c.lon, c.lat), rp = facPeople(c.owner), sec = secondNative(c.lon, c.lat, nat), m = {};
  const add = (k, v) => { m[k] = (m[k] || 0) + v; };
  if (nat === rp) add(nat, 1);
  else if (pfam(nat) === pfam(rp)) { add(rp, 0.55); add(nat, 0.45); }
  else if (c.capital || c.pop >= 8) { add(rp, 0.5); add(nat, 0.5); }
  else { add(rp, 0.28); add(nat, 0.72); }
  if (sec) add(sec, 0.1);
  if (c.port && rp !== 'greek' && nat !== 'greek' && ['semitic', 'italic', 'anatolian', 'hellenic', 'berber', 'nilotic', 'iberian'].includes(pfam(nat))) add('greek', 0.04);
  c.ppl = normPeople(m);
}
function foreignShare(c) { const rp = facPeople(c.owner); let f = 0; for (const k in c.ppl) if (k !== rp) f += c.ppl[k] * (pfam(k) === pfam(rp) ? 0.4 : 1); return f; }
function peopleTurn() {
  for (const c of G.cities) {
    if (!c.owner || !c.ppl) continue; const rp = facPeople(c.owner);
    if (c.order > 40) { const rate = 0.0012 * (1 + 0.3 * (c.b.temple || 0)) * (c.capital ? 1.3 : 1); mixIn(c.ppl, { [rp]: 1 }, rate); }
  }
  for (const r of G.routes) {
    if ((r.val || 0) < 3) continue; const a = C(r.a), b = C(r.b); if (!a.ppl || !b.ppl) continue;
    const pa = Object.assign({}, a.ppl), pb = Object.assign({}, b.ppl); mixIn(a.ppl, pb, 0.003); mixIn(b.ppl, pa, 0.003);
  }
}
function topPeoples(c, n) { return Object.entries(c.ppl || {}).sort((a, b) => b[1] - a[1]).slice(0, n); }
