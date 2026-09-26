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
