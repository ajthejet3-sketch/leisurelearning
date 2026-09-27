# Oikoumene

A pixel-art grand strategy game set in Europe, the Mediterranean and the Near East, starting in spring 200 BC.

Open `index.html` in a browser to play. It has no dependencies or build step. The only network request is for Google Fonts. Music starts when you begin a game; turn it off with the Music button.

## What's in it

- **93 playable states and 356 settlements** at their 200 BC positions, from Rome, Carthage, Macedon, Epirus, Athens, the Seleucids and the Ptolemies to Gauls, Iberians, Britons, Germans, Finns, Thracians, Scythians, Parthians, Armenians, Arabs, the Theban pharaohs and Kush. The Second Macedonian War, the Fifth Syrian War, the Gallic revolt in the Po valley and the Theban revolt in Upper Egypt are all under way.
- **A 443×320 pixel map** from the Atlantic to the Aral Sea and from Nubia to Finland, built from coastline polygons, with the Caspian, the Persian Gulf and the Red Sea, mountains, rivers, deserts, steppe and forest. Cities claim territory by travel cost.
- **41 peoples.** Every settlement holds a mix, such as Carthage's Punics, Libyans, Greeks and Numidians, or Alexandria's Greeks, Egyptians and Judaeans. Foreign rule costs public order. Peoples assimilate slowly toward their rulers, spread along trade routes, sail out with colonists and arrive with conquerors. Townsfolk in the city scene wear their people's colours.
- **24 goods** with prices that follow world supply and demand. Each culture wants different things: Gauls want wine, Greeks want oil and papyrus, and forges want iron, copper and tin.
- **Trade routes** that merchants open automatically between a city with a surplus and one with a need, if both are at peace and have trade rights. A town's Trade tab lists each of its routes with the cargo going each way. Its ships and carts come and go in the town scene, and its routes stay highlighted on the map. Click any route to see cargo in each direction, value, tariffs, journey time and pirate risk. You can open, keep or close routes. Winter closes the sea (*mare clausum*).
- **16 building types**, named by culture (Forum, Agora, Nemeton, Cothon harbour, Murus gallicus and so on). You watch each one go up in the city scene: scaffolding, a treadwheel crane and workers carrying stone. Construction slows when a city lacks timber. Buildings also show on the map: fields, vineyards, groves and mines ring each town, and walls, temples and aqueducts grow with their level. Harbours go from a wooden jetty (I) to an enclosed harbour with a lighthouse (IV).
- **Colonies**: send settlers from a harbour city to unclaimed coastline. A colony founded near a known ancient site takes its name (Narbo, Aquileia, Mogador, Londinium and others).
- **Diplomacy**: trade rights, gifts, alliances, war and peace.
- **Armies built from faction rosters**: 68 unit types. Rome fields velites, hastati, principes, triarii, socii and equites. Macedon has phalangites, royal peltasts, Companions and Thessalians. Carthage has Libyan spearmen, the Sacred Band, Numidian horse, Balearic slingers, Iberian and Gallic mercenaries, and elephants that the treaty of 201 BC forbids while at peace with Rome. The Seleucids have Argyraspides, cataphracts, scythed chariots and Indian elephants. There are also Gaesatae, Celtiberians, falxmen, Cretan archers, Parthian horse archers, Sarmatian lancers, Kushite archers and camel riders.
  - **Recruiting**: elite units need barracks or the capital, cavalry needs horses, and mercenaries hire in ports and markets.
  - **Generals**: armies have named generals with a skill rating, among them Hannibal, Philip V, Antiochus III, Masinissa, Philopoemen and Sulpicius Galba.
  - **Army controls**: split, merge, replenish and disband armies, or attack, raid and move them.
- **Phased battles**: missile exchange, the cavalry fight on the wings (the winner turns onto the enemy flank), charge, melee rounds with morale and rout, then pursuit. Terrain, walls, generals, veterancy and matchups all count: pikes against horse, swordsmen against pikes on broken ground, skirmishers against elephants, horse archers on open steppe. An enemy field army must be beaten before the walls are stormed. Every battle has a report and a pixel replay, reached from the crossed swords on the map or View battle in the chronicle.
- **Music composed live in the ancient modes** with the Web Audio API and no audio files. Greeks and Romans get Dorian lyre and aulos in dactylic rhythm, Carthage and the Levant Phrygian harp, aulos and frame drum. The Nile gets Lydian harp and sistrum, the north and west pentatonic pipes and carnyx, and the steppe a fiddle and galloping drum. The style follows the people of the town you open, slows in winter and gains drums in wartime.
- **Ambitions** for each faction, such as Macedon holding the Fetters of Greece or Carthage refilling its treasury.

## Layout

```
src/data.js     scenario data: goods, buildings, cultures, factions, cities, coastlines
src/peoples.js  peoples, their homelands and population mixing
src/engine.js   map generation, economy, trade, colonies, AI
src/military.js units, rosters, recruitment, generals, battle simulation and replays
src/render.js   map renderer and city construction scene
src/music.js    generative music and sound effects
src/ui.js       panels, input, save/load
src/shell.html  markup and styles
build.mjs       concatenates src/ into index.html (standalone) and oikoumene.html (body fragment)
```

Rebuild with `node games/oikoumene/build.mjs`.

## Adding eras

Everything tied to 200 BC lives in `src/data.js`: the `SCENARIOS` list, factions, cities, diplomacy, goals, the map bounds (`MAP_BOUNDS`), coastline polygons and carved-out inland seas (`SEAS`). A later era, such as a worldwide 1500 AD map, would be a second data file with its own projection bounds and coastlines, loaded in place of this one.
