# Oikoumene

A pixel-art grand strategy game set in Europe and the Mediterranean, starting in spring 200 BC.

Open `index.html` in a browser to play. It has no dependencies or build step. The only network request is for Google Fonts.

## What's in it

- **63 playable states** at their 200 BC positions, from Rome, Carthage, Macedon, Epirus, Athens, the Seleucids and the Ptolemies to Gauls, Iberians, Britons, Germans, Thracians and Scythians. The Second Macedonian War, the Fifth Syrian War and the Gallic revolt in the Po valley are all under way.
- **A 327×252 pixel map** built from coastline polygons, with mountains, rivers, deserts, steppe and forest. Cities claim territory by travel cost.
- **24 goods** with prices that follow world supply and demand. Each culture wants different things: Gauls want wine, Greeks want oil and papyrus, and forges want iron, copper and tin.
- **Trade routes** that merchants open automatically between a city with a surplus and one with a need, if both are at peace and have trade rights. Click any route to see cargo in each direction, value, tariffs, journey time and pirate risk. You can open, keep or close routes. Winter closes the sea (*mare clausum*).
- **16 building types**, named by culture (Forum, Agora, Nemeton, Cothon harbour, Murus gallicus and so on). You watch each one go up in the city scene: scaffolding, a treadwheel crane and workers carrying stone. Construction slows when a city lacks timber.
- **Colonies**: send settlers from a harbour city to unclaimed coastline. A colony founded near a known ancient site takes its name (Narbo, Aquileia, Mogador, Londinium and others).
- **Diplomacy and war**: trade rights, gifts, alliances, war and peace. Armies attack, raid or garrison cities.
- **Ambitions** for each faction, such as Macedon holding the Fetters of Greece or Carthage refilling its treasury.

## Layout

```
src/data.js     scenario data: goods, buildings, cultures, factions, cities, coastlines
src/engine.js   map generation, economy, trade, war, colonies, AI
src/render.js   map renderer and city construction scene
src/ui.js       panels, input, save/load
src/shell.html  markup and styles
build.mjs       concatenates src/ into index.html (standalone) and oikoumene.html (body fragment)
```

Rebuild with `node games/oikoumene/build.mjs`.

## Adding eras

Everything tied to 200 BC lives in `src/data.js`: the `SCENARIOS` list, factions, cities, diplomacy, goals and the map polygons and bounds. A later era, such as a worldwide 1500 AD map, would be a second data file with its own projection bounds and coastlines, loaded in place of this one.
