'use strict';
// ============================================================================
// Armies are made of units drawn from faction rosters. Battles are fought in
// phases: missile exchange, cavalry clash on the wings, charge, melee rounds
// with morale and rout, then pursuit. Terrain, walls, generals and unit matchups
// (pike against horse, skirmishers against elephants, legions on rough ground)
// all count. Every battle is recorded for a replay.
// ============================================================================
const UCLS = { heavy: 'Heavy infantry', spear: 'Spearmen', pike: 'Pike phalanx', sword: 'Swordsmen', light: 'Skirmishers', missile: 'Missile troops', cav: 'Cavalry', hcav: 'Shock cavalry', hacav: 'Horse archers', ele: 'War elephants', chariot: 'Chariots', camel: 'Camel riders' };
const CAV = new Set(['cav', 'hcav', 'hacav', 'camel']);
const INF = new Set(['heavy', 'spear', 'pike', 'sword']);
const UNITS = {};
// id, name, class, men, melee, defence, missile, charge, morale, speed, cost, description
function U(id, n, cls, men, M, D, R, C, Mo, S, cost, desc) { UNITS[id] = { id, n, cls, men, M, D, R, C, Mo, S, cost, desc }; }
// Rome
U('velites', 'Velites', 'light', 320, 4, 3, 6, 1, 50, 7, 25, 'Young skirmishers with javelins and a round parma who screen the maniples');
U('hastati', 'Hastati', 'sword', 480, 9, 7, 2, 3, 66, 5, 60, 'First line of the legion: pilum volleys, then the gladius and the great scutum');
U('principes', 'Principes', 'sword', 480, 10, 8, 2, 3, 74, 5, 75, 'Men in their prime, the second line that decides most battles');
U('triarii', 'Triarii', 'spear', 240, 9, 11, 0, 2, 88, 4, 70, 'Veteran spearmen kneeling in the third line. "It has come to the triarii."');
U('socii', 'Socii infantry', 'sword', 480, 8, 6, 1, 3, 60, 5, 50, 'Italian allied cohorts who fight beside every legion');
U('equites', 'Equites', 'cav', 160, 7, 6, 0, 7, 62, 8, 70, 'Citizen cavalry of the wealthy census classes');
// Greek world
U('hoplite', 'Hoplites', 'heavy', 480, 8, 10, 0, 3, 68, 4, 60, 'Citizen spearmen behind the great round aspis');
U('epilektoi', 'Epilektoi', 'heavy', 480, 10, 11, 0, 3, 80, 4, 85, 'Picked hoplites, the best citizens of the city in arms');
U('spartiate', 'Spartiates', 'heavy', 240, 12, 12, 0, 4, 95, 4, 110, 'The last true Spartans, raised in the agoge');
U('thureophoroi', 'Thureophoroi', 'spear', 480, 7, 8, 2, 3, 60, 5, 50, 'Hellenistic infantry with the oval thureos and javelins');
U('peltast', 'Peltasts', 'light', 320, 5, 4, 6, 2, 52, 7, 35, 'Javelin men with a light pelta shield');
U('rhodian_sling', 'Rhodian slingers', 'missile', 320, 2, 2, 10, 0, 45, 6, 45, 'Their lead bullets outrange Persian archers');
U('cretan_archer', 'Cretan archers', 'missile', 240, 3, 3, 11, 0, 55, 6, 55, 'The most sought-after archers of the age');
U('hippeis', 'Hippeis', 'cav', 160, 6, 5, 0, 6, 56, 8, 60, 'Greek citizen cavalry');
U('tarantine', 'Tarantine horse', 'cav', 160, 4, 3, 5, 3, 52, 9, 55, 'Light javelin cavalry in the fashion of Taras');
// Hellenistic kingdoms
U('phalangite', 'Phalangites', 'pike', 480, 7, 11, 0, 2, 70, 3, 55, 'Sixteen ranks deep with the five-metre sarissa. Unstoppable from the front, helpless on broken ground');
U('hypaspist', 'Royal peltasts', 'heavy', 320, 10, 10, 1, 3, 86, 5, 90, 'The king\'s guard infantry, heirs of Alexander\'s hypaspists');
U('companion', 'Companion cavalry', 'hcav', 160, 9, 9, 0, 11, 84, 7, 120, 'Noble lancers who ride with the king himself');
U('thessalian', 'Thessalian cavalry', 'cav', 160, 8, 7, 0, 8, 70, 8, 85, 'The finest horsemen of mainland Greece, riding in rhomboid');
U('thracian_peltast', 'Thracian peltasts', 'light', 320, 6, 4, 5, 3, 56, 7, 40, 'Hardy hill fighters with javelins and swords');
U('argyraspid', 'Argyraspides', 'pike', 480, 9, 13, 0, 3, 88, 3, 100, 'The Silver Shields: the royal phalanx of the Seleucids');
U('cataphract', 'Cataphracts', 'hcav', 160, 10, 14, 0, 10, 82, 5, 140, 'Horse and rider sheathed in scale. Slow, but no line can stop them');
U('scythed_chariot', 'Scythed chariots', 'chariot', 40, 5, 5, 0, 16, 50, 7, 90, 'Blades on the axles. Terrifying on open ground, useless anywhere else');
U('indian_ele', 'Indian elephants', 'ele', 24, 14, 10, 2, 18, 62, 4, 180, 'Brought back by Antiochus from India, with towers of archers');
U('african_ele', 'Forest elephants', 'ele', 24, 12, 9, 1, 15, 55, 4, 150, 'Small African elephants of the Atlas forests');
U('machimoi', 'Egyptian phalanx', 'pike', 480, 6, 10, 0, 2, 62, 3, 45, 'Native Egyptians drilled as phalangites; they won Raphia');
U('galatian_merc', 'Galatian mercenaries', 'sword', 480, 10, 5, 1, 7, 72, 5, 70, 'Celts from Anatolia who sell their long swords to every king');
U('camel_archer', 'Camel archers', 'camel', 160, 4, 4, 8, 3, 55, 7, 70, 'Arab riders whose camels panic horses');
// Carthage and Africa
U('libyan_spear', 'Libyan spearmen', 'heavy', 480, 8, 10, 0, 3, 70, 4, 60, 'Carthage\'s African subjects, the backbone of Hannibal\'s army');
U('sacred_band', 'Sacred Band', 'heavy', 240, 12, 13, 0, 4, 92, 4, 120, 'Punic citizens of the noblest families, sworn to fight to the last');
U('punic_cav', 'Punic cavalry', 'cav', 160, 6, 6, 0, 6, 60, 7, 60, 'Carthaginian citizen horsemen');
U('numidian_cav', 'Numidian cavalry', 'cav', 160, 4, 3, 6, 3, 58, 10, 55, 'Riding bareback with javelins, the best light horse in the world');
U('numidian_inf', 'Numidian skirmishers', 'light', 320, 5, 3, 5, 2, 50, 7, 28, 'Swift javelin men of the Atlas');
U('balearic', 'Balearic slingers', 'missile', 320, 2, 2, 11, 0, 50, 6, 50, 'Island slingers who learn as boys to hit their bread on a post');
U('libyan_chariot', 'Garamantian chariots', 'chariot', 40, 5, 4, 3, 11, 55, 8, 70, 'Four-horse chariots of the desert oases');
// Iberia
U('scutarii', 'Scutarii', 'sword', 480, 9, 8, 2, 4, 66, 5, 55, 'Iberian heavy infantry with the long scutum and falcata');
U('caetrati', 'Caetrati', 'light', 320, 6, 4, 4, 3, 56, 7, 35, 'Light Iberian infantry with the small caetra buckler');
U('iberian_cav', 'Iberian cavalry', 'cav', 160, 6, 5, 3, 6, 62, 9, 60, 'Agile horsemen who dismount to fight when needed');
U('celtiberian', 'Celtiberian swordsmen', 'sword', 480, 11, 8, 2, 6, 74, 5, 70, 'Iron-hard warriors of the meseta with soliferrum and short sword');
U('lusitanian', 'Lusitanian raiders', 'light', 320, 7, 4, 4, 4, 62, 8, 40, 'Hill raiders who will one day follow Viriathus');
// Celts
U('warband', 'Warband', 'sword', 480, 8, 4, 0, 7, 55, 5, 30, 'Free farmers who follow their chief to war');
U('celtic_spear', 'Celtic spearmen', 'spear', 480, 7, 6, 0, 4, 58, 5, 35, 'Spearmen behind tall oval shields');
U('gaesatae', 'Gaesatae', 'sword', 320, 12, 3, 0, 10, 85, 6, 70, 'Spear-bearing champions who fight naked for glory');
U('noble_cav', 'Noble cavalry', 'hcav', 160, 8, 7, 0, 9, 72, 7, 80, 'Mailed nobles, first to wear the iron ring shirt');
U('celtic_skirm', 'Slingers and javelins', 'light', 320, 4, 3, 6, 2, 45, 7, 25, 'Young men who harass before the charge');
U('brit_chariot', 'War chariots', 'chariot', 40, 6, 4, 3, 12, 62, 8, 70, 'British charioteers who hurl javelins and leap down to fight');
// Germania and the north
U('germ_spear', 'Germanic spearmen', 'spear', 480, 7, 5, 1, 5, 60, 5, 30, 'Men of the tribe with framea and shield, in a wedge');
U('germ_champ', 'Oathsworn', 'sword', 240, 11, 5, 0, 8, 84, 6, 60, 'A chief\'s sworn companions who will not outlive him');
U('germ_cav', 'Germanic horse', 'cav', 160, 6, 4, 1, 6, 62, 8, 50, 'Riders who fight mixed with fast foot runners');
U('framea_skirm', 'Framea skirmishers', 'light', 320, 4, 3, 5, 2, 46, 7, 22, 'Youths with throwing spears');
U('forest_archer', 'Forest hunters', 'missile', 320, 3, 2, 8, 0, 45, 6, 30, 'Hunters with bone-tipped arrows');
// Balkans
U('rhomphaia', 'Falxmen', 'sword', 320, 13, 4, 0, 6, 72, 5, 60, 'Two-handed rhomphaia and falx that shear through helmets');
U('thracian_cav', 'Thracian cavalry', 'cav', 160, 6, 4, 3, 6, 60, 9, 55, 'Horsemen of the Thracian plain with javelins');
U('illyrian_inf', 'Illyrian infantry', 'sword', 480, 7, 5, 3, 4, 60, 6, 35, 'Hill fighters with the curved sica');
U('dacian_archer', 'Dacian archers', 'missile', 240, 3, 3, 9, 0, 50, 6, 40, 'Archers of the Carpathian hills');
// Steppe and Iran
U('horse_archer', 'Horse archers', 'hacav', 160, 4, 3, 10, 3, 60, 10, 65, 'Steppe riders who shoot while turning away');
U('steppe_noble', 'Noble horse', 'hcav', 160, 9, 9, 4, 9, 76, 7, 100, 'Armoured nobles with bow and lance');
U('sarm_lancer', 'Sarmatian lancers', 'hcav', 160, 10, 10, 1, 12, 78, 7, 110, 'Scale-armoured riders with the two-handed kontos');
U('foot_archer', 'Foot archers', 'missile', 320, 3, 2, 8, 0, 40, 6, 30, 'Levy archers');
U('levy_spear', 'Levy spearmen', 'spear', 480, 5, 6, 0, 2, 45, 4, 25, 'Farmers called to arms');
U('persian_cav', 'Iranian cavalry', 'cav', 160, 7, 6, 4, 7, 66, 8, 70, 'Medes, Persians and Cappadocians on Nisaean horses');
U('east_archer', 'Eastern archers', 'missile', 320, 3, 3, 9, 0, 48, 6, 38, 'Composite-bow archers of Syria and Iran');
U('arab_cav', 'Arab horse', 'cav', 160, 5, 4, 3, 5, 58, 9, 50, 'Desert riders on swift mares');
U('bedouin', 'Desert skirmishers', 'light', 320, 5, 3, 5, 2, 50, 7, 28, 'Tribesmen with bows and javelins');
U('kush_archer', 'Kushite archers', 'missile', 320, 3, 3, 11, 0, 58, 6, 45, 'From Ta-Seti, the Land of the Bow');

// roster entries: [unit, flags] — m mercenary, c capital only, b1/b2 barracks level, t forbidden by the treaty of 201 BC while at peace with Rome
const R_GREEK = [['hoplite'], ['thureophoroi'], ['peltast'], ['rhodian_sling'], ['hippeis'], ['tarantine', 'm'], ['cretan_archer', 'm'], ['epilektoi', 'b1']];
const R_CELT = [['warband'], ['celtic_spear'], ['celtic_skirm'], ['noble_cav'], ['gaesatae', 'b1']];
const R_BRIT = [...R_CELT, ['brit_chariot']];
const R_EAST = [['levy_spear'], ['east_archer'], ['persian_cav'], ['thureophoroi'], ['galatian_merc', 'm'], ['cataphract', 'b2']];
const R_ARAB = [['bedouin'], ['camel_archer'], ['arab_cav'], ['levy_spear'], ['east_archer']];
const R_GERM = [['germ_spear'], ['framea_skirm'], ['germ_cav'], ['germ_champ', 'b1'], ['forest_archer']];
const R_NORTH = [['forest_archer'], ['germ_spear'], ['framea_skirm']];
const R_THRAC = [['thracian_peltast'], ['rhomphaia', 'b1'], ['thracian_cav'], ['illyrian_inf'], ['dacian_archer']];
const R_STEPPE = [['horse_archer'], ['steppe_noble', 'b1'], ['foot_archer'], ['levy_spear']];
const R_IBER = [['caetrati'], ['scutarii'], ['iberian_cav'], ['balearic', 'm']];
const ROSTERS = {
  rome: [['velites'], ['hastati'], ['principes', 'b1'], ['triarii', 'b1'], ['socii'], ['equites'], ['numidian_cav', 'm'], ['cretan_archer', 'm']],
  carthage: [['libyan_spear'], ['sacred_band', 'c'], ['punic_cav'], ['numidian_cav', 'm'], ['balearic', 'm'], ['scutarii', 'm'], ['caetrati', 'm'], ['warband', 'm'], ['african_ele', 'b2t']],
  macedon: [['phalangite'], ['hypaspist', 'b1'], ['companion', 'c'], ['thessalian'], ['thracian_peltast'], ['peltast'], ['cretan_archer', 'm'], ['galatian_merc', 'm']],
  epirus: [['phalangite'], ['hoplite'], ['peltast'], ['hippeis'], ['thessalian', 'm'], ['cretan_archer', 'm']],
  seleucid: [['phalangite'], ['argyraspid', 'c'], ['thureophoroi'], ['cataphract', 'b1'], ['companion', 'c'], ['scythed_chariot'], ['indian_ele', 'b2'], ['camel_archer'], ['persian_cav'], ['east_archer'], ['galatian_merc', 'm'], ['cretan_archer', 'm']],
  ptolemaic: [['phalangite'], ['machimoi'], ['thureophoroi'], ['companion', 'c'], ['hippeis'], ['african_ele', 'b2'], ['kush_archer'], ['galatian_merc', 'm'], ['cretan_archer', 'm']],
  sparta: [['spartiate', 'c'], ['hoplite'], ['peltast'], ['tarantine', 'm'], ['cretan_archer', 'm']],
  athens: [['epilektoi'], ['hoplite'], ['peltast'], ['rhodian_sling'], ['hippeis'], ['cretan_archer', 'm']],
  achaea: [['phalangite'], ['epilektoi', 'b1'], ['tarantine'], ['peltast'], ['rhodian_sling'], ['cretan_archer', 'm']],
  aetolia: [['peltast'], ['hoplite'], ['hippeis'], ['rhodian_sling'], ['thureophoroi']],
  rhodes: [['hoplite'], ['rhodian_sling'], ['peltast'], ['thureophoroi'], ['cretan_archer', 'm'], ['hippeis']],
  crete: [['cretan_archer'], ['peltast'], ['hoplite'], ['thureophoroi']],
  pergamon: [['phalangite'], ['thureophoroi'], ['galatian_merc'], ['cretan_archer', 'm'], ['hippeis'], ['peltast']],
  bithynia: [['thracian_peltast'], ['rhomphaia', 'b1'], ['phalangite'], ['hippeis'], ['galatian_merc', 'm']],
  bosporus: [...R_GREEK, ['horse_archer', 'm'], ['steppe_noble', 'm']],
  pontus: [['levy_spear'], ['phalangite'], ['scythed_chariot'], ['persian_cav'], ['east_archer'], ['cataphract', 'b2'], ['galatian_merc', 'm']],
  cappadocia: [['levy_spear'], ['persian_cav'], ['east_archer'], ['thureophoroi'], ['cataphract', 'b2']],
  armenia: [['levy_spear'], ['cataphract', 'b1'], ['persian_cav'], ['east_archer'], ['horse_archer', 'm']],
  parthia: [['horse_archer'], ['cataphract', 'b1'], ['levy_spear'], ['foot_archer']],
  persis: [['levy_spear'], ['persian_cav'], ['east_archer'], ['cataphract', 'b2']], atropatene: [['levy_spear'], ['persian_cav'], ['east_archer'], ['cataphract', 'b2']],
  sarmatia: [['sarm_lancer'], ['horse_archer'], ['levy_spear']], scythia: R_STEPPE, dahae: [['horse_archer'], ['steppe_noble', 'b1'], ['foot_archer']],
  galatia: [['galatian_merc'], ['warband'], ['noble_cav'], ['celtic_skirm'], ['gaesatae', 'b1']],
  numidia: [['numidian_cav'], ['numidian_inf'], ['levy_spear'], ['african_ele', 'b2']], mauretania: [['numidian_cav'], ['numidian_inf'], ['levy_spear'], ['african_ele', 'b2']],
  garamantes: [['libyan_chariot'], ['numidian_inf'], ['numidian_cav']],
  baleares: [['balearic'], ['caetrati']], celtiberi: [['celtiberian'], ['caetrati'], ['iberian_cav'], ['scutarii']], lusitani: [['lusitanian'], ['caetrati'], ['iberian_cav']], vettones: [['lusitanian'], ['caetrati'], ['iberian_cav']],
  britons: R_BRIT, dumnonii: R_BRIT, brigantes: R_BRIT, silures: R_BRIT, caledonii: R_BRIT, hiberni: R_BRIT,
  gerrha: R_ARAB, arabs: R_ARAB, nabataea: R_ARAB,
  thebaid: [['machimoi'], ['kush_archer'], ['levy_spear'], ['bedouin', 'm']], kush: [['kush_archer'], ['levy_spear'], ['african_ele', 'b1'], ['bedouin']],
  fenni: R_NORTH, venedi: R_NORTH, budini: [['forest_archer'], ['germ_spear'], ['horse_archer']],
  illyria: [['illyrian_inf'], ['thracian_peltast'], ['thracian_cav'], ['rhomphaia', 'b1']], veneti: [['socii'], ['hoplite'], ['equites'], ['celtic_skirm']],
  ligures: [['illyrian_inf'], ['celtic_skirm'], ['celtic_spear']], cilicia: [['illyrian_inf'], ['east_archer'], ['thureophoroi'], ['galatian_merc', 'm']],
  colchis: [['levy_spear'], ['east_archer'], ['persian_cav']], kartli: [['levy_spear'], ['east_archer'], ['persian_cav'], ['cataphract', 'b2']],
};
const CULT_ROSTER = { roman: ROSTERS.rome, greek: R_GREEK, eastern: R_EAST, punic: ROSTERS.carthage, numidian: ROSTERS.numidia, egyptian: ROSTERS.thebaid, celtic: R_CELT, iberian: R_IBER, germanic: R_GERM, thracian: R_THRAC, scythian: R_STEPPE };
const rosterFor = (f) => ROSTERS[f] || CULT_ROSTER[FAC[f].cul] || R_GREEK;

// ---- units and armies ------------------------------------------------------------
const TG = { ele: 20, chariot: 4, cav: 1.4, hcav: 1.8, hacav: 1.3, camel: 1.5 };
const SF = { heavy: 1, spear: 1, pike: 1, sword: 1, light: 0.8, missile: 0.85, cav: 1.1, hcav: 1.35, hacav: 1.25, camel: 1.15, ele: 2.2, chariot: 1.1 };
function unitBase(t) { const u = UNITS[t]; return ((u.M + u.D + u.R * 0.8 + u.C * 0.5) / 5) * SF[u.cls]; }
function unitPow(u) { return unitBase(u.t) * (u.men / UNITS[u.t].men) * (1 + 0.08 * (u.xp || 0)); }
function recalc(a) { a.str = R1(a.units.reduce((s, u) => s + unitPow(u), 0)); return a.str; }
function armyMen(a) { return a.units.reduce((s, u) => s + u.men, 0); }
function armyUpkeep(a) { return a.units.reduce((s, u) => s + (UNITS[u.t].cost / 60) * (u.men / UNITS[u.t].men), 0); }
function unitCost(c, e) { const f = e[1] || ''; return Math.round(UNITS[e[0]].cost * (f.includes('m') ? 1.4 : 1) * (isBarb(c.culture) ? 0.85 : 1) * (c.b.barracks ? 0.9 : 1)); }
function hasHorses(c) { return (c.res.horses || 0) > 0.4 || (c.b.pasture || 0) >= 1 || (c.fl.horses ?? 0) >= 0.5 || (c.imp.horses || 0) > 0.05; }
function recruitWhy(c, e, ignoreGold) {
  const U0 = UNITS[e[0]], f = e[1] || '', B = c.b.barracks || 0;
  if (f.includes('c') && !c.capital) return 'Capital only';
  if (f.includes('b2') && B < 2) return 'Needs barracks II';
  if (f.includes('b1') && B < 1) return 'Needs barracks';
  if (f.includes('t') && c.owner === 'carthage' && !atWar('carthage', 'rome')) return 'Forbidden by the treaty of 201 BC';
  if (f.includes('m') && !c.port && !(c.b.market >= 1) && !c.capital) return 'Mercenaries hire only in ports, markets or the capital';
  if ((CAV.has(U0.cls) || U0.cls === 'chariot') && !hasHorses(c) && U0.cls !== 'camel') return 'No horses here: build pastures or import horses';
  if (U0.cls === 'ele' && !(B >= 1)) return 'Needs barracks to keep elephants';
  if (!f.includes('m') && c.pop < 1.5 + U0.men / 1000) return 'Too few people to levy';
  if (!ignoreGold && G.fac[c.owner].gold < unitCost(c, e)) return 'Not enough ' + FAC[c.owner].cur;
  return '';
}
const GEN_NAMES = {
  roman: [['Publius', 'Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus', 'Gnaeus', 'Servius', 'Aulus'], ['Cornelius', 'Sulpicius', 'Quinctius', 'Aemilius', 'Fabius', 'Claudius', 'Valerius', 'Livius', 'Sempronius', 'Postumius', 'Furius', 'Minucius']],
  greek: [['Philokles', 'Nikanor', 'Demetrios', 'Lysimachos', 'Kallikrates', 'Aristainos', 'Antipatros', 'Menandros', 'Theodotos', 'Zeuxis', 'Nikias', 'Machanidas', 'Diophanes']],
  eastern: [['Zeuxis', 'Nikanor', 'Molon', 'Achaios', 'Artaxias', 'Zariadres', 'Mithradates', 'Ariarathes', 'Orontes', 'Tigranes', 'Hyspaosines', 'Bagadates']],
  punic: [['Hasdrubal', 'Hanno', 'Mago', 'Himilco', 'Bomilcar', 'Hamilcar', 'Gisco', 'Adherbal', 'Carthalo', 'Maharbal']],
  numidian: [['Gulussa', 'Mastanabal', 'Micipsa', 'Syphax', 'Vermina', 'Oezalces', 'Capussa', 'Bocchus']],
  egyptian: [['Horwennefer', 'Petosiris', 'Peteese', 'Harsiese', 'Nakhthorheb', 'Pasherienptah', 'Arkamani']],
  celtic: [['Boduognatos', 'Ateporix', 'Comontorios', 'Litaviccos', 'Dumnorix', 'Orgetorix', 'Cingetorix', 'Epasnactos', 'Brennos', 'Ortiagon']],
  iberian: [['Istolatios', 'Allucius', 'Olyndicus', 'Caros', 'Ambon', 'Indortes', 'Mandonius', 'Punicus']],
  germanic: [['Boiorix', 'Teutobod', 'Claodicus', 'Caesorix', 'Segimer', 'Malorix', 'Lugius', 'Ingiomer']],
  thracian: [['Seuthes', 'Kotys', 'Teres', 'Rhaskos', 'Dromichaites', 'Zalmodegikos', 'Bithys', 'Sadalas', 'Genthios']],
  scythian: [['Skilouros', 'Palakos', 'Ariapeithes', 'Saitaphernes', 'Gatalos', 'Tasios', 'Arsakes', 'Phriapatios', 'Spadines']],
};
function newGeneral(f) { const n = GEN_NAMES[FAC[f].cul] || GEN_NAMES.greek, pick = (l) => l[Math.floor(Math.random() * l.length)]; return { name: n.length > 1 ? pick(n[0]) + ' ' + pick(n[1]) : pick(n[0]), skill: 1 + Math.floor(Math.random() * 3), wins: 0 }; }
function newArmy(f, cityId, gen) { const a = { id: G.nid++, f, units: [], at: cityId, mv: null, name: armyName(f), gen: gen || newGeneral(f), str: 0 }; G.armies.push(a); return a; }
// Choose a unit the way the faction would: core infantry first, then missiles and horse.
function chooseUnit(f, c, have, free) {
  const ro = rosterFor(f).filter((e) => free ? !(e[1] || '').includes('t') : !recruitWhy(c, e));
  if (!ro.length) return null; const steppe = ['scythian'].includes(FAC[f].cul) || ['parthia', 'sarmatia', 'dahae', 'numidia', 'mauretania'].includes(f);
  const count = (pred) => have.filter((u) => pred(UNITS[u.t].cls)).length, n = have.length || 1;
  let best = null, bw = -1;
  for (const e of ro) {
    const cls = UNITS[e[0]].cls; let w = 1;
    if (INF.has(cls)) w = (steppe ? 1 : 5 - count((k) => INF.has(k)) / n * 6) / (1 + have.filter((u) => u.t === e[0]).length * 0.5);
    else if (cls === 'light' || cls === 'missile') w = 3 - count((k) => k === 'light' || k === 'missile') / n * 8;
    else if (CAV.has(cls)) w = steppe ? 6 - count((k) => CAV.has(k)) / n * 4 : 2.5 - count((k) => CAV.has(k)) / n * 8;
    else if (cls === 'ele' || cls === 'chariot') w = 1.2 - count((k) => k === cls) * 1.2;
    if ((e[1] || '').includes('m')) w *= 0.5; if ((e[1] || '').match(/c|b1|b2/)) w *= 0.7;
    w *= 0.6 + Math.random() * 0.8; if (w > bw) { bw = w; best = e; }
  }
  return best;
}
function makeArmy(f, city, power, gen) {
  const c = G.cities.find((x) => x.name === city || x.id === city); if (!c) return null; const a = newArmy(f, c.id, gen);
  let guard = 0; while (recalc(a) < power && guard++ < 16) { const e = chooseUnit(f, c, a.units, true); if (!e) break; a.units.push({ t: e[0], men: UNITS[e[0]].men, xp: Math.random() < 0.4 ? 1 : 0 }); }
  recalc(a); return a;
}
function recruit(c, e, army) {
  const why = recruitWhy(c, e); if (why) return why; const U0 = UNITS[e[0]];
  G.fac[c.owner].gold -= unitCost(c, e); if (!(e[1] || '').includes('m')) c.pop = R1(c.pop - U0.men / 1000);
  let a = army || G.armies.find((x) => x.at === c.id && x.f === c.owner && !x.mv && x.units.length < 16);
  if (!a) a = newArmy(c.owner, c.id);
  a.units.push({ t: e[0], men: U0.men, xp: 0 }); recalc(a); return '';
}
function raiseArmy(c) { // AI levy: two to four units
  let n = 2 + Math.floor(Math.random() * 3), err = ''; const a = G.armies.find((x) => x.at === c.id && x.f === c.owner && !x.mv) || null;
  let target = a;
  while (n-- > 0) { const e = chooseUnit(c.owner, c, target ? target.units : []); if (!e) break; err = recruit(c, e, target); if (err) break; target = target || G.armies.find((x) => x.at === c.id && x.f === c.owner && !x.mv); }
  return err;
}
function replenishCost(a) { return Math.round(a.units.reduce((s, u) => s + UNITS[u.t].cost * 0.6 * (1 - u.men / UNITS[u.t].men), 0)); }
function replenish(a) {
  if (a.at == null) return 'On the march'; const c = C(a.at); if (c.owner !== a.f) return 'Only in your own cities'; const cost = replenishCost(a);
  if (!cost) return 'Already at full strength'; if (G.fac[a.f].gold < cost) return 'Not enough ' + FAC[a.f].cur;
  const men = a.units.reduce((s, u) => s + UNITS[u.t].men - u.men, 0) / 1000; if (c.pop < men + 1.5) return 'Too few people in ' + c.name;
  G.fac[a.f].gold -= cost; c.pop = R1(c.pop - men * 0.7); for (const u of a.units) u.men = UNITS[u.t].men; recalc(a); return '';
}
function mergeAt(a) {
  if (a.at == null || a.mv || a.f === G.player) return;
  const o = G.armies.find((x) => x !== a && x.f === a.f && x.at === a.at && !x.mv && x.units.length + a.units.length <= 20);
  if (o) { o.units.push(...a.units); a.units = []; recalc(o); if ((a.gen.skill || 0) > (o.gen.skill || 0)) o.gen = a.gen; G.armies = G.armies.filter((x) => x.units.length); }
}
function splitArmy(a, idxs) {
  if (!idxs.length || idxs.length >= a.units.length) return 'Choose some units, but not all of them'; if (a.mv) return 'Cannot split on the march';
  const b = newArmy(a.f, a.at); idxs.sort((x, y) => y - x).forEach((i) => b.units.unshift(a.units.splice(i, 1)[0])); recalc(a); recalc(b); return b;
}
function mergeInto(a) { const o = G.armies.filter((x) => x !== a && x.f === a.f && x.at === a.at && !x.mv); if (!o.length) return 'No other army here'; for (const x of o) { a.units.push(...x.units); x.units = []; } G.armies = G.armies.filter((x) => x.units.length); recalc(a); return ''; }

// ---- battle -------------------------------------------------------------------------
function levyFor(c) { const ro = rosterFor(c.owner).filter((e) => !(e[1] || '').includes('m') && !CAV.has(UNITS[e[0]].cls) && UNITS[e[0]].cls !== 'ele' && UNITS[e[0]].cls !== 'chariot'); return (ro.sort((x, y) => UNITS[x[0]].cost - UNITS[y[0]].cost)[0] || ['levy_spear'])[0]; }
function garrisonUnits(c) {
  const out = [], mainT = levyFor(c), missile = rosterFor(c.owner).find((e) => UNITS[e[0]].cls === 'missile' && !(e[1] || '').includes('m')); let need = c.gar;
  if (missile && need > 4) { const u = { t: missile[0], men: UNITS[missile[0]].men * 0.6, xp: 0, gar: 1 }; out.push(u); need -= unitPow(u); }
  while (need > 0.5 && out.length < 8) { const b = unitBase(mainT), frac = Math.min(1, need / b); out.push({ t: mainT, men: Math.round(UNITS[mainT].men * frac), xp: 0, gar: 1 }); need -= b * frac; }
  return out;
}
const pick = (l) => l[Math.floor(Math.random() * l.length)];
function simBattle(att, def, ctx) {
  const T0 = ctx.terr, rough = T0 === T.HILLS || T0 === T.MTN || T0 === T.FOREST || T0 === T.MARSH, open = !rough;
  const gen = [att.gen ? att.gen.skill : 1, def.gen ? def.gen.skill : 1];
  const mk = (side, s) => s.units.map((u) => ({ u, side, U: UNITS[u.t], men0: u.men, men: u.men, lost: 0, routed: false, mor: UNITS[u.t].Mo + gen[side] * 3 + (u.xp || 0) * 4 + (ctx.siege && side === 1 ? 12 : 0) - (u.gar ? 8 : 0) }));
  const S = [mk(0, att), mk(1, def)], lines = [], frames = [], flank = [0, 0];
  const nm = (x) => x.U.n + (x.u.gar ? ' (garrison)' : ''), sname = (s) => FAC[[att, def][s].f].short;
  const alive = (s) => S[s].filter((x) => !x.routed && x.men > 1);
  const powOf = (x) => unitBase(x.u.t) * (x.men / x.U.men); const pow = (s) => alive(s).reduce((a, x) => a + powOf(x), 0);
  const p0 = [pow(0), pow(1)];
  const eff = (x) => x.men * (TG[x.U.cls] || 1), luck = [0.82 + Math.random() * 0.36, 0.82 + Math.random() * 0.36];
  const snap = (label) => frames.push({ label, m: S.map((side) => side.map((x) => [Math.round(x.men), x.routed ? 1 : 0])), flank: flank.slice() });
  const Deff = (x) => x.U.D * (ctx.siege && x.side === 1 ? 1 + 0.3 * ctx.walls : 1) * (x.U.cls === 'light' || x.U.cls === 'hacav' ? 1.2 : 1);
  const hit = (x, k) => { k = Math.max(0, Math.min(x.men, k / (TG[x.U.cls] || 1))); x.men -= k; x.lost += k; x.mor -= (k / x.men0) * 105; return k; };
  const target = (s, wf) => { const c = alive(s); if (!c.length) return null; let tot = 0; const w = c.map((x) => { const v = x.men * wf(x); tot += v; return v; }); let r = Math.random() * tot; for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; } return c[c.length - 1]; };
  const has = (s, cls) => alive(s).some((x) => x.U.cls === cls);
  snap('Deployment');
  // 1. missiles
  const shot = [0, 0], best = [null, null];
  for (let vol = 0; vol < 2; vol++) for (const s of [0, 1]) for (const x of alive(s)) {
    if (!x.U.R) continue; const tg = target(1 - s, (y) => (y.U.cls === 'light' || y.U.cls === 'missile' ? 1.2 : CAV.has(y.U.cls) ? 0.5 : 1)); if (!tg) break;
    const mul = ctx.siege ? (s === 1 ? 1.3 : 0.7) : 1, vsEle = tg.U.cls === 'ele' && (x.U.cls === 'light' || x.U.cls === 'missile') ? 1.8 : 1;
    const k = hit(tg, ((x.U.R * eff(x)) / 100) * 1.7 * mul * vsEle * luck[s] * (x.U.cls === 'hacav' && open ? 1.5 : 1) / (1 + Deff(tg) / 7) * (0.75 + Math.random() * 0.5)); shot[s] += k;
    if (!best[s] || k > best[s][2]) best[s] = [x, tg, k];
  }
  for (const s of [0, 1]) if (best[s] && best[s][2] > 20) lines.push(nm(best[s][0]) + ' of ' + sname(s) + ' shower the ' + nm(best[s][1]) + ' with missiles (' + Math.round(best[s][2]) + ' fall).');
  snap('Missile exchange');
  // 2. cavalry on the wings
  const cavs = (s) => alive(s).filter((x) => CAV.has(x.U.cls));
  const fear = (s) => (has(1 - s, 'ele') ? 0.72 : 1) * (has(1 - s, 'camel') && !has(s, 'camel') ? 0.85 : 1);
  const cavPow = (s) => cavs(s).reduce((a, x) => a + (x.U.M + x.U.C * 0.6 + (x.U.cls === 'hacav' ? x.U.R * 0.7 : 0)) * (eff(x) / 100) * (x.U.cls === 'hacav' && open ? 1.25 : 1) * (rough ? 0.8 : 1), 0) * fear(s) * (1 + 0.06 * gen[s]) * (ctx.siege ? (s === 0 ? 0.3 : 0.5) : 1);
  const cp = [cavPow(0), cavPow(1)];
  if (cp[0] + cp[1] > 0) {
    for (const s of [0, 1]) { const cs = cavs(s), tot = cs.reduce((a, x) => a + x.men, 0); for (const x of cs) hit(x, cp[1 - s] * 2.2 * (x.men / tot) * (TG[x.U.cls] || 1) / (1 + Deff(x) / 8)); }
    for (const s of [0, 1]) {
      if (cp[s] > cp[1 - s] * 1.3 && cp[s] > 3) {
        flank[s] = clamp((cp[s] - cp[1 - s]) / (p0[1 - s] * 5 + 1), 0.08, 0.45); for (const x of cavs(1 - s)) x.mor -= 25;
        const lead = cavs(s).sort((a, b) => b.men - a.men)[0];
        lines.push((lead ? nm(lead) : 'The horse') + ' of ' + sname(s) + (cp[1 - s] > 0 ? ' drive the enemy horse from the field and' : ' find no horse to oppose them and') + ' wheel onto the flank.');
      }
    }
    if (has(0, 'ele') || has(1, 'ele')) lines.push('The smell of the elephants unsettles the horses.');
  }
  snap('Cavalry on the wings');
  // 3. charge and melee
  let rounds = 0, broke = -1;
  const frontW = (y) => (INF.has(y.U.cls) ? 1 : y.U.cls === 'ele' ? 1.2 : y.U.cls === 'light' ? 0.6 : y.U.cls === 'missile' ? 0.45 : y.U.cls === 'chariot' ? 0.6 : y.U.cls === 'hacav' ? 0.12 : 0.35);
  for (let r = 1; r <= 6; r++) {
    rounds = r; const routs = [];
    if (r === 1) for (const s of [0, 1]) if (has(s, 'ele')) { for (const y of alive(1 - s)) y.mor -= CAV.has(y.U.cls) ? 12 : 6; }
    const deal = [];
    for (const s of [0, 1]) {
      const enemyPike = alive(1 - s).filter((y) => y.U.cls === 'pike').reduce((a, y) => a + y.men, 0) > alive(1 - s).reduce((a, y) => a + y.men, 0) * 0.35;
      for (const x of alive(s)) {
        const cls = x.U.cls; if (CAV.has(cls) && flank[s] <= 0 && cls !== 'hacav') continue;
        if (cls === 'hacav') { const tg = target(1 - s, frontW); if (tg) deal.push([tg, ((x.U.R * eff(x)) / 100) * (open ? 8 : 3) * luck[s] / (1 + Deff(tg) / 7), x]); continue; }
        let m = x.U.M + (r === 1 ? x.U.C : 0);
        if (cls === 'pike') m *= rough ? 0.72 : 1.0; if (cls === 'sword' && enemyPike) m *= rough ? 1.2 : 1.12;
        if (cls === 'light' || cls === 'missile') m *= 0.55; if (cls === 'ele') m *= r <= 2 ? 1 : 0.6;
        if (cls === 'chariot') m *= r === 1 ? (open ? 1.5 : 0.4) : 0.3; if (CAV.has(cls)) m *= 0.6;
        if (ctx.siege && s === 0) m *= 0.85;
        const pw = m * (eff(x) / 100) * clamp(x.mor / 70, 0.4, 1.2) * (1 + flank[s]) * (1 + 0.05 * gen[s]) * luck[s] * (0.85 + Math.random() * 0.3);
        const tg = target(1 - s, frontW); if (!tg) continue; let k = (pw * 4.2) / (1 + Deff(tg) / 8) * (tg.U.cls === 'hacav' && open ? 0.5 : 1);
        if (r === 1 && (CAV.has(cls) || cls === 'chariot' || cls === 'ele') && (tg.U.cls === 'pike' || tg.U.cls === 'spear')) { k *= tg.U.cls === 'pike' ? 0.45 : 0.7; deal.push([x, pw * 1.6 * (TG[x.U.cls] || 1), null]); }
        if (tg.U.cls === 'pike' && flank[s] > 0) k *= 1.3;
        deal.push([tg, k, x]);
      }
    }
    for (const [tg, k] of deal) hit(tg, k);
    for (const s of [0, 1]) {
      const frac = 1 - pow(s) / (p0[s] || 1);
      for (const x of alive(s)) {
        if (frac > 0.3) x.mor -= 4; if (flank[1 - s] > 0 && (x.U.cls === 'pike' || x.U.cls === 'missile')) x.mor -= 6;
        if (x.mor < 22 || x.men < x.men0 * 0.2) {
          x.routed = true; if (x.men0 >= 150 || x.U.cls === 'ele') (routs[s] = routs[s] || []).push(nm(x));
          if (x.U.cls === 'ele') { const own = alive(s); if (own.length) { const v = pick(own); hit(v, x.men * 4); lines.push('The maddened elephants trample their own ' + nm(v) + '.'); } }
        }
      }
    }
    for (const s of [0, 1]) if (routs[s]) { const n = {}; for (const u of routs[s]) n[u] = (n[u] || 0) + 1; lines.push('Round ' + r + ': ' + Object.entries(n).map(([k, v]) => (v > 1 ? v + ' units of ' : '') + k).join(', ') + ' of ' + sname(s) + ' break and run.'); }
    snap('Melee, round ' + r);
    const ok = [pow(0) / (p0[0] || 1), pow(1) / (p0[1] || 1)];
    if (ok[0] < 0.25 || !alive(0).length) { broke = 0; break; } if (ok[1] < 0.25 || !alive(1).length) { broke = 1; break; }
  }
  const ratio = [pow(0) / (p0[0] || 1), pow(1) / (p0[1] || 1)];
  const winner = broke >= 0 ? 1 - broke : ratio[0] > ratio[1] * (ctx.siege ? 1.25 : 1) ? 0 : 1, loser = 1 - winner;
  // 4. pursuit
  for (const x of S[loser]) if (!x.routed) x.routed = true;
  const pp = alive(winner).reduce((a, x) => a + (x.U.M + x.U.S) * (eff(x) / 100) * (CAV.has(x.U.cls) ? 1.4 : x.U.cls === 'light' ? 0.8 : 0.3), 0);
  const fleeing = S[loser].filter((x) => x.men > 1), fm = fleeing.reduce((a, x) => a + x.men, 0);
  const kill = Math.min(pp * 2.2, fm * 0.45) * (ctx.siege && loser === 1 ? 1.4 : 1); for (const x of fleeing) hit(x, (kill * x.men) / (fm || 1));
  if (kill > 50) lines.push('The ' + sname(winner) + ' pursuit cuts down ' + Math.round(kill) + ' fugitives.');
  snap('Pursuit');
  // apply
  for (const s of [0, 1]) for (const x of S[s]) { x.u.men = Math.round(x.routed && s === loser ? x.men * 0.8 : x.men); if (s === winner && x.u.men > 0) x.u.xp = Math.min(3, (x.u.xp || 0) + (Math.random() < 0.6 ? 1 : 0)); }
  const lost = S.map((side) => Math.round(side.reduce((a, x) => a + x.men0 - x.u.men, 0)));
  return { winner, frames, lines, lost, units: S.map((side) => side.map((x) => ({ t: x.u.t, gar: !!x.u.gar, men0: Math.round(x.men0), men1: Math.round(x.u.men), routed: x.routed }))), rounds };
}
function sideOf(armies, f) {
  const units = []; for (const a of armies) units.push(...a.units); const gen = armies.map((a) => a.gen).filter(Boolean).sort((x, y) => y.skill - x.skill)[0] || null;
  return { f, armies, units, gen };
}
function recordBattle(res, att, def, c, kind) {
  G.battles = G.battles || []; const id = G.nid++;
  const rep = { id, kind, turn: G.turn, date: dateStr(), place: c.name, x: c.x, y: c.y, terr: terr[c.y * W + c.x], walls: c.b.walls || 0,
    sides: [att, def].map((s) => ({ f: s.f, armies: s.armies.map((a) => a.name), gen: s.gen ? { name: s.gen.name, skill: s.gen.skill } : null })),
    units: res.units, frames: res.frames, lines: res.lines, lost: res.lost, winner: res.winner };
  G.battles.unshift(rep); if (G.battles.length > 30) G.battles.length = 30; return rep;
}
function cleanArmies(list) { for (const a of list) { a.units = a.units.filter((u) => u.men >= UNITS[u.t].men * 0.12); recalc(a); } G.armies = G.armies.filter((a) => a.units.length); }
// An army arrives at a hostile city: fight the field army first, then storm the walls.
function battle(army, c) {
  const defF = c.owner, mine = army.f === G.player || defF === G.player || G.armies.some((a) => a.at === c.id && a.f === G.player);
  const defArmies = G.armies.filter((a) => a.at === c.id && a.units.length && (a.f === defF || allied(a.f, defF)));
  const ctx = { terr: terr[c.y * W + c.x], siege: false, walls: 0 };
  if (army.mv.order === 'raid') {
    const gu = garrisonUnits(c), A = sideOf([army], army.f), D = sideOf(defArmies, defF); D.units = [...D.units, ...gu];
    const res = simBattle(A, D, ctx), rep = recordBattle(res, A, D, c, 'Raid on');
    c.gar = Math.max(1, gu.reduce((s, u) => s + unitPow(u), 0)); cleanArmies([army, ...defArmies]);
    if (res.winner === 0) {
      const loot = Math.max(0, Math.round(Math.min(G.fac[defF].gold * 0.1 + c.pop * 5, 160))); G.fac[defF].gold -= loot; G.fac[army.f].gold += loot; c.order = Math.max(0, c.order - 15); c.pop = R1(c.pop * 0.96);
      if (mine) logMsg(army.name + ' of ' + FAC[army.f].short + ' raids ' + c.name + ' and carries off ' + loot + ' ' + FAC[army.f].cur + '.', army.f === G.player ? 'good' : 'bad', rep.id);
    } else if (mine) logMsg('The raid on ' + c.name + ' is beaten off.', army.f === G.player ? 'bad' : 'good', rep.id);
    return army.units.length ? 'back' : 'die';
  }
  if (defArmies.length) {
    const A = sideOf([army], army.f), D = sideOf(defArmies, defF), res = simBattle(A, D, ctx), rep = recordBattle(res, A, D, c, 'Battle of');
    const wname = res.winner === 0 ? army.name : defArmies[0].name; if (res.winner === 0) army.gen.wins++; else if (defArmies[0].gen) defArmies[0].gen.wins++;
    for (const a of [army, ...defArmies]) if (a.gen && a.gen.wins >= 3 && a.gen.skill < 5) { a.gen.skill++; a.gen.wins = 0; }
    cleanArmies([army, ...defArmies]);
    if (mine || army.str + D.units.length > 30) logMsg('Battle of ' + c.name + ': ' + (res.winner === 0 ? FAC[army.f].short : FAC[defF].short) + ' victorious under ' + (res.winner === 0 ? army.gen.name : (D.gen ? D.gen.name : wname)) + '. Losses ' + res.lost[0] + ' to ' + res.lost[1] + '.', (res.winner === 0) === (army.f === G.player) ? 'good' : mine ? 'bad' : '', rep.id);
    if (res.winner === 1 || !army.units.length) return army.units.length ? 'back' : 'die';
    for (const a of G.armies.filter((x) => x.at === c.id && x.f !== army.f)) { let back = null, bd = 1e9; for (const o of citiesOf(a.f)) { const d = Math.hypot(o.x - c.x, o.y - c.y); if (o.id !== c.id && d < bd) { bd = d; back = o.id; } } if (back != null) a.at = back; else a.units = []; }
    G.armies = G.armies.filter((a) => a.units.length);
  }
  // storm the walls
  const gar = { f: defF, armies: [], units: garrisonUnits(c), gen: null };
  const A = sideOf([army], army.f), res = simBattle(A, gar, { terr: ctx.terr, siege: true, walls: c.b.walls || 0 }), rep = recordBattle(res, A, gar, c, 'Siege of');
  cleanArmies([army]);
  if (res.winner === 0 && army.units.length) {
    const old = c.owner; c.owner = army.f; c.capital = false; if (c.ppl) mixIn(c.ppl, { [facPeople(army.f)]: 1 }, 0.08); c.order = 22; c.pop = R1(c.pop * 0.9); c.gar = 2; c.q = [];
    G._terrDirty = true; addRel(army.f, old, -20); army.gen.wins++;
    if (mine || c.pop > 10) logMsg(FAC[army.f].short + ' storms ' + c.name + ' (' + FAC[old].short + ').', army.f === G.player ? 'good' : old === G.player ? 'bad' : '', rep.id);
    checkAlive(old); return 'stay';
  }
  c.gar = Math.max(1, gar.units.reduce((s, u) => s + unitPow(u), 0));
  if (mine) logMsg(army.name + ' (' + FAC[army.f].short + ') is thrown back from the walls of ' + c.name + '.', army.f === G.player ? 'bad' : 'good', rep.id);
  return army.units.length ? 'back' : 'die';
}
function battlePreview(a, t) {
  const def = G.armies.filter((x) => x.at === t.id && (x.f === t.owner || allied(x.f, t.owner))).reduce((s, x) => s + x.str, 0);
  return { field: def, walls: t.gar * (1 + 0.3 * (t.b.walls || 0)), odds: a.str / Math.max(1, def + t.gar * (1 + 0.3 * (t.b.walls || 0))) };
}
function setupStartingArmies() {
  const hist = [['rome', 'Apollonia', 24, { name: 'Publius Sulpicius Galba', skill: 3, wins: 0 }], ['rome', 'Placentia', 18, { name: 'Lucius Furius Purpurio', skill: 3, wins: 0 }], ['rome', 'Roma', 10],
    ['macedon', 'Pella', 30, { name: 'Philip V', skill: 4, wins: 0 }], ['macedon', 'Korinthos', 10], ['seleucid', 'Damaskos', 32, { name: 'Antiochus III', skill: 4, wins: 0 }],
    ['ptolemaic', 'Hierosolyma', 24, { name: 'Skopas of Aetolia', skill: 3, wins: 0 }], ['ptolemaic', 'Alexandreia', 10], ['boii', 'Felsina', 15, { name: 'Hamilcar the Carthaginian', skill: 3, wins: 0 }],
    ['insubres', 'Mediolanum', 11], ['carthage', 'Carthago', 13, { name: 'Hannibal Barca', skill: 5, wins: 0 }], ['thebaid', 'Waset', 12, { name: 'Ankhwennefer', skill: 2, wins: 0 }],
    ['parthia', 'Nisa', 12, { name: 'Arsaces II', skill: 3, wins: 0 }], ['numidia', 'Cirta', 14, { name: 'Masinissa', skill: 4, wins: 0 }], ['sparta', 'Sparte', 9, { name: 'Nabis', skill: 2, wins: 0 }],
    ['achaea', 'Megalopolis', 10, { name: 'Philopoemen', skill: 4, wins: 0 }]];
  for (const [f, city, p, gen] of hist) makeArmy(f, city, p, gen);
  for (const f of FIDS) if (!G.armies.some((a) => a.f === f)) { const cs = citiesOf(f), cap = cs.find((c) => c.capital) || cs[0]; const pop = cs.reduce((s, c) => s + c.pop, 0); if (cap) makeArmy(f, cap.id, Math.round(4 + pop * 0.3 * (0.5 + FAC[f].ai.aggr))); }
}

// ---- pixel unit icons --------------------------------------------------------------
const ICONS = new Map();
function unitIcon(t, col) {
  const key = t + col; if (ICONS.has(key)) return ICONS.get(key);
  const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12; const x = cv.getContext('2d'), U0 = UNITS[t], cls = U0.cls;
  const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const man = (ox, oy, shield) => { R(ox + 1, oy, 2, 2, '#e3b98c'); R(ox + 1, oy, 2, 1, '#8a8a8a'); R(ox, oy + 2, 4, 3, col); R(ox + 1, oy + 5, 1, 2, '#3a2a1a'); R(ox + 2, oy + 5, 1, 2, '#3a2a1a'); if (shield === 'round') R(ox - 1, oy + 2, 2, 3, '#c9a04a'); if (shield === 'long') R(ox - 1, oy + 1, 2, 5, '#a8322a'); if (shield === 'oval') R(ox - 1, oy + 1, 2, 4, '#c8b88a'); };
  if (cls === 'ele') { R(1, 4, 8, 5, '#8a8a88'); R(8, 3, 3, 3, '#8a8a88'); R(10, 6, 1, 4, '#8a8a88'); R(2, 9, 2, 3, '#7a7a78'); R(6, 9, 2, 3, '#7a7a78'); R(3, 1, 4, 3, col); R(9, 4, 1, 1, '#fff'); }
  else if (cls === 'chariot') { R(1, 6, 6, 3, '#7a5230'); R(2, 8, 3, 3, '#2a1a10'); R(3, 9, 1, 1, '#c9a04a'); R(7, 5, 4, 3, '#8a5a34'); R(10, 4, 2, 2, '#8a5a34'); R(2, 2, 2, 4, col); R(2, 1, 2, 1, '#e3b98c'); R(0, 9, 1, 1, '#ddd'); }
  else if (CAV.has(cls)) {
    const horse = cls === 'camel' ? '#c8a060' : cls === 'hcav' && U0.D >= 13 ? '#9a9a9a' : '#8a5a34';
    R(1, 6, 8, 3, horse); R(8, 4, 3, 3, horse); R(1, 9, 1, 3, horse); R(3, 9, 1, 3, horse); R(6, 9, 1, 3, horse); R(8, 9, 1, 3, horse); if (cls === 'camel') R(3, 4, 3, 2, horse);
    R(4, 2, 3, 4, col); R(4, 0, 3, 2, '#e3b98c'); if (cls === 'hacav') { R(7, 1, 1, 4, '#5a3a20'); R(8, 2, 1, 2, '#ddd'); } else R(0, 3, 9, 1, '#d8d0b8');
  } else if (cls === 'pike') { man(4, 3, 'round'); R(7, 0, 1, 12, '#d8d0b8'); R(1, 0, 1, 11, '#d8d0b8'); }
  else if (cls === 'missile') { man(5, 3); if (/sling/i.test(U0.n) || t === 'balearic') { R(9, 2, 1, 1, '#5a3a20'); R(10, 1, 1, 1, '#999'); } else { R(9, 2, 1, 6, '#5a3a20'); R(10, 3, 1, 4, '#ddd'); } }
  else if (cls === 'light') { man(5, 3, 'oval'); R(9, 1, 1, 7, '#d8d0b8'); }
  else if (cls === 'sword') { man(5, 3, 'long'); R(9, 3, 1, 4, '#dde'); if (U0.C >= 8) R(5, 5, 4, 3, '#e3b98c'); }
  else { man(5, 3, 'round'); R(9, 0, 1, 10, '#d8d0b8'); }
  const u = cv.toDataURL(); ICONS.set(key, u); return u;
}

// ---- battle replay ---------------------------------------------------------------
function battleLayout(rep) {
  const L = [[], []];
  for (const s of [0, 1]) {
    const dir = s === 0 ? 1 : -1, cx = s === 0 ? 58 : 182, cols = { front: 0, main: 0, wing: 0, rear: 0 };
    rep.units[s].forEach((u, i) => {
      const cls = UNITS[u.t].cls, cav = CAV.has(cls) || cls === 'chariot', w = cls === 'ele' ? 4 : cav ? 4 : 6;
      const dots = cls === 'ele' ? Math.max(1, Math.round(u.men0 / 4)) : cls === 'chariot' ? Math.max(2, Math.round(u.men0 / 5)) : Math.max(2, Math.round(u.men0 / 12));
      const rows = Math.ceil(dots / w), h = rows * 2; let x, y;
      if (cav) { const k = cols.wing++; x = cx - dir * 6; y = k % 2 ? 104 - h - 10 * Math.floor(k / 2) : 6 + 10 * Math.floor(k / 2); }
      else if (cls === 'light' || cls === 'missile' || cls === 'ele') { const k = cols.front++; x = cx + dir * 16; y = 22 + (k % 5) * 16; }
      else { const k = cols.main++; x = cx - dir * Math.floor(k / 4) * 16; y = 20 + (k % 4) * 20; }
      L[s].push({ i, x, y, w, dots, cls });
    });
  }
  return L;
}
function drawBattle(ctx, rep, t) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const tc = TCOL[rep.terr] ? TCOL[rep.terr][0] : '#8ea45a'; R(0, 0, 240, 120, tc);
  for (let k = 0; k < 90; k++) R(hash2(k, rep.id) * 240, hash2(rep.id, k) * 120, 2, 1, 'rgba(0,0,0,0.08)');
  if (rep.kind === 'Siege of') { R(206, 0, 34, 120, '#9a9282'); for (let y = 0; y < 120; y += 8) R(204, y, 4, 5, '#b8b09a'); R(212, 50, 10, 20, '#3a2a1a'); }
  const F = rep.frames, per = 1300, total = F.length * per, el = t % (total + 2500), fi = Math.min(F.length - 1, Math.floor(el / per)), k = Math.min(1, (el % per) / per);
  const fr = F[fi], prev = F[Math.max(0, fi - 1)], lab = fr.label, melee = /Melee|Pursuit/.test(lab), cavPh = /Cavalry/.test(lab), missPh = /Missile/.test(lab);
  const L = battleLayout(rep), mRound = melee ? (lab === 'Pursuit' ? 7 : +lab.replace(/\D/g, '')) : 0;
  const cols = rep.sides.map((sd) => FAC[sd.f].col);
  for (const s of [0, 1]) {
    const dir = s === 0 ? 1 : -1;
    for (const p of L[s]) {
      const [men, routed] = fr.m[s][p.i] || [0, 1], [men0] = prev.m[s][p.i] || [0], menNow = men0 + (men - men0) * k; if (menNow < 2) continue;
      let x = p.x, y = p.y; const cls = p.cls, adv = Math.min(1, (mRound - 1 + k) / 1.3);
      if (melee && INF.has(cls)) x += dir * adv * 46;
      if (melee && (cls === 'ele' || cls === 'chariot')) x += dir * Math.min(1, adv * 2) * 40;
      if ((cavPh || melee) && (CAV.has(cls) || cls === 'chariot')) { x += dir * (cavPh ? k : 1) * 44; if ((fr.flank || [])[s] > 0 && melee) x += dir * Math.min(1, adv) * 60; }
      if (melee && (cls === 'light' || cls === 'missile')) x -= dir * Math.min(1, adv * 2) * 30;
      if (routed) { x -= dir * (12 + ((t / 25 + p.i * 7) % 60)); ctx.globalAlpha = 0.55; }
      const dots = Math.max(1, Math.round(p.dots * menNow / (rep.units[s][p.i].men0 || 1)));
      for (let d = 0; d < dots; d++) {
        const cx0 = x + (d % p.w) * 2, cy0 = y + Math.floor(d / p.w) * 2, jig = melee && !routed && INF.has(cls) && (d % p.w) === (s === 0 ? p.w - 1 : 0) && Math.floor(t / 150 + d) % 2 ? dir : 0;
        if (cls === 'ele') { R(cx0, cy0, 2, 2, '#8a8a88'); R(cx0, cy0 - 1, 1, 1, cols[s]); continue; }
        R(cx0 + jig, cy0, 1, 1, cols[s]);
        if (CAV.has(cls) || cls === 'chariot') R(cx0 + jig, cy0 + 1, 1, 1, cls === 'camel' ? '#c8a060' : '#6a4424');
        else if (cls === 'heavy' || cls === 'pike' || cls === 'spear') R(cx0 + jig, cy0 + 1, 1, 1, '#c9a04a');
      }
      if (cls === 'pike' && !routed) for (let r0 = 0; r0 < Math.ceil(dots / p.w); r0++) R(s === 0 ? x + p.w * 2 : x - 5, y + r0 * 2, 5, 1, '#e8e0c8');
      if (missPh && (cls === 'missile' || cls === 'light') && !routed) for (let q = 0; q < 3; q++) { const kk = (k + q * 0.3) % 1, tx = x + dir * (10 + kk * 70), ty = y + q * 4 - Math.sin(kk * Math.PI) * 16; R(tx, ty, 2, 1, '#2a1a10'); }
      ctx.globalAlpha = 1;
    }
  }
  if (melee && mRound <= 6) for (let q = 0; q < 14; q++) R(112 + Math.random() * 16, 14 + Math.random() * 84, 1, 1, Math.random() < 0.5 ? '#fff4c0' : '#d8c8a0');
  ctx.fillStyle = 'rgba(10,16,20,0.75)'; ctx.fillRect(0, 108, 240, 12); ctx.fillStyle = '#f2e6c8'; ctx.font = '9px "Pixelify Sans", monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(el > total ? (rep.winner === 0 ? FAC[rep.sides[0].f].short : FAC[rep.sides[1].f].short) + ' victorious' : lab, 4, 114);
}
