# Deal Abroad

A pixel-art life sim for learning business languages. Every language is a
separate life: you start with $37 in a hostel bunk and talk your way up to
superyachts and private jets. It is a single self-contained page:
`deal-abroad.html`.

## Loop

- **Career**: 18 stops per language in six chapters of three, each a real place with a counterpart,
  stakes and local etiquette. Winning a stop opens the next; a new chapter also needs the next rank. Spanish runs from a beach bar in Aruba to an
  invitation-only island; Mandarin from a hawker stall in Singapore to a
  private jet. Other languages get a career written by Claude.
- **Explore**: a pixel world map per language. Fly to any place in your
  current chapter or earlier, then walk around (arrow keys, A/D, tap or the
  on-screen buttons). Order from vendors in the language (coffee sharpens you
  for the next meeting), make small talk with locals for XP and referrals,
  buy your circle a drink, trade barbs with rivals, or walk up to the
  counterpart and start the meeting on the spot.
- **Meetings**: scripted (offline) or live with Claude. Every line is graded
  and a deal meter decides the payout. Rank (XP) and cash gate the next rung.
- **Train**: meeting lines, a pitfall quiz and drills built from your own
  mistakes. Clearing drills pays.
- **Empire**: rides, boats, homes, watches, a jet, an island. Cars, boats and
  homes have a workshop (paint, names, home port, upgrades), with every option
  labeled in the target language. Everything grants perks.
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
- **Globe**: spin the world and jump between both passports' cities.
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
