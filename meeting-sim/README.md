# Deal Abroad

A pixel-art life sim for learning business languages. Every language is a
separate life: you start with $37 in a hostel bunk and talk your way up to
superyachts and private jets. It is a single self-contained page:
`deal-abroad.html`.

## Loop

- **Career**: 18 stops per language in six chapters of three, each a real place with a counterpart,
  stakes and local etiquette. Winning a stop opens the next; a new chapter also needs the next rank. Spanish runs from a beach bar in Aruba to an
  invitation-only island; Mandarin from a hawker stall in Singapore to a
  private jet; Italian ("La Dolce Vita") from a Positano beach club through
  Capri, Rome, Montalcino, Milan, Porto Cervo, Portofino and the Arena di
  Verona to a private bank in Lugano. Other languages get a career written by
  Claude.
- **Explore**: a pixel world map per language. Fly to any place in your
  current chapter or earlier, then walk around (arrow keys, A/D, tap or the
  on-screen buttons). Order from vendors in the language (coffee sharpens you
  for the next meeting), make small talk with locals for XP and referrals,
  buy your circle a drink, trade barbs with rivals, or walk up to the
  counterpart and start the meeting on the spot.
- **Meetings**: scripted (offline) or live with Claude. Every line is graded
  and a deal meter decides the payout. Rank (XP) and cash gate the next rung.
  Each turn has five options, including fluent lines that answer the wrong
  question. There is no English by default. The hint button steps through
  keywords, then cuts one wrong answer, then gives a full translation that
  costs 4% of the payout (3 XP in walk-around talks).
- **Train**: meeting lines, a pitfall quiz and drills built from your own
  mistakes. Clearing drills pays.
- **Empire**: a catalog of 49 boats, 46 cars, 41 aircraft and 42 flex items,
  plus homes and watches. Each has real specs:
  - **Boats**: length, knots, range, guests, sail, shallow draft, toy garage,
    helipad, submarine, ice class.
  - **Cars**: horsepower, top speed, seats, class, convertible, off-road.
  - **Aircraft**: range, seats, speed, jet, vertical take-off, water landing.
  - **Flex items**: some unlock High Life events.

  Filter chips and a trimmed "show all" list keep the shop readable. Cars,
  boats, homes and aircraft have a workshop (paint or livery, names, upgrades),
  and cars also get randomizable V, batwing, bar, Y or halo light signatures
  and body accents. Only your three most valuable pieces per category grant
  perks.
- **Investments**: twelve assets per language, from treasury bills to a
  startup that can 5x or go to zero. Prices move after every meeting and
  every day that passes, dividends land in cash, and every buy and sale is
  spoken.
- **High Life board**: nine invitation-grade experiences per language, each
  three spoken moments with safe, bold or wild moves whose odds come from what
  you own. They end at an afterparty full of investors:
  - Spanish: a supercar convoy from Marbella to Ronda, polo in Sotogrande,
    the Barcelona paddock, heli-skiing in Portillo, a Mexico City art gala,
    a rivals' regatta in Ibiza, a full-moon party in Tulum, a three-star
    chef's table and a masked ball in Seville.
  - Mandarin: a Stelvio to Lake Como supercar rally, a Macau high-roller
    salon, the Singapore night race, Happy Valley, Sanya yacht week, Niseko
    heli-skiing, a Bund art gala, a Moutai cellar dinner and the Jade
    Masquerade.
  - Italian: a supercar convoy along the Amalfi Coast road, a Porto Cervo
    regatta, the Monza paddock, heli-skiing in Cortina, a Venice Biennale
    gala, the Palio di Siena, the Casinò di Venezia, a Puglia masseria
    party, a three-star table in Modena and a secret masked ball in Venice.
- **Voyages**: new day, new island, new connections, on your own boat.
  Routes are gated by range, draft and ice class:
  - Spanish: the ABC islands, Los Roques, San Blas, the Balearics,
    Galápagos, a transatlantic crossing and Cape Horn.
  - Mandarin: Tioman, Hong Kong to Sanya, around Taiwan, the Andaman Sea,
    Palau and Komodo.
  - Italian: the Amalfi Coast and Capri, Costa Smeralda, the Aeolian
    Islands, the Riviera to Monaco, Croatia, the Ionian islands and a
    Genoa to Antigua crossing.

  Each day you pick one of three activities built from what the stop and
  your boat allow: snorkel, toys out, tender to the beach club (flirt), raft
  up with a rival (network, and compare boats), dinner ashore, the market,
  a heli lunch, a sub dive, zodiacs among icebergs. You clear customs in the
  language at every border.
- **You**: skin, hair, facial hair, build and face shape, with a randomize
  button. Every character gets a build, jaw and hairstyle of their own.
- **Say it to do it**: buying, selling, customizing, flying and asking someone
  out all require typing the request in the target language.
- **Rivals**: four AI competitors per language whose fortunes track yours.
  They take the deals you lose, show up on a leaderboard, and moor their
  yachts next to yours in the marina.
- **Nightlife**: flirt with strangers in the language (win their number),
  a party or networking event at every place, investor cards that boost
  future deals, and parties you host on your boat, jet or villa. Swimwear at
  beaches and pool/yacht parties.
- **Reputation**: rises with wins, hosting and networking, falls with
  walkouts and breakups; decides who shows up and how easily they say yes.
- **Relationships**: go exclusive (asked in the language); seeing others
  makes a partner jealous, and a breakup costs reputation and your next deal.
  Overnights play out differently every time and fade to black.
- **Clients, staff, mentor**: every counterpart you beat becomes a client
  paying a daily retainer by loyalty (check in, gift, upsell, or lose them to
  a rival). Hire an assistant, tutor, bodyguard, fixer and publicist, who
  follow you around the world. A mentor sets escalating quests and a daily
  proverb.
- **Globe**: a draggable globe with the real day/night line, city lights,
  clouds, flight arcs, and your won cities in gold. Tap to jump between both
  passports.
- **Wardrobe and dress code**: outfits and accessories named in the target
  language; dress for the room for +1 on the deal meter, or pay for it.
- **Vacations**: book 3, 7 or 14 nights anywhere, pick a stay and a
  companion, and watch a day-by-day montage of language moments. The
  calendar moves forward while you're away.
- **Circle**: flirty locals you text in the target language (PG-13, fade to
  black). Chemistry unlocks gossip that helps your deals.
- **Dossier**: leverage on counterparts, from envelopes, flawless meetings,
  hidden rooms and your circle. Hidden achievements.
- **Real transcript**: paste a Zoom/Teams/Meet export and get your mistakes
  marked in place.

Live meetings, chats, grading of free text, new careers and transcript checks
use the Claude artifact `sample` capability; progress syncs through the `db`
capability. Opened as a plain file, the scripted Spanish and Mandarin careers
still work and progress is kept in the browser.
