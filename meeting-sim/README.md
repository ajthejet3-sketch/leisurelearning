# Deal Abroad

A pixel-art simulator for rehearsing business meetings in another language.
It is a single self-contained page: `deal-abroad.html`.

## What it does

1. **Brief**: pick a setting (a yacht off Oranjestad, Aruba, or the 42nd floor
   over Marina Bay, Singapore), a language, your level and your goal.
2. **Train**: a phrasebook for that meeting, a pitfall quiz (false friends,
   register, etiquette), and a drill deck of your own past mistakes.
3. **Meeting**: the counterpart talks, you answer, and a deal meter moves.
   Every line you say is graded and marked in a live transcript.
   - *Scripted* mode (Spanish on the yacht, Mandarin in Singapore) works offline.
   - *Live* mode lets you type anything in any supported language; Claude plays
     the counterpart and grades each line.
4. **Debrief**: line-by-line fixes, and one click to add slips to your drills.
5. **Real transcript**: paste or load a `.txt`, `.vtt` or `.srt` export from
   Zoom, Teams or Meet, pick which speaker you are, and get your mistakes
   highlighted in place with corrections.

Live mode, custom briefings and transcript checks use the Claude artifact
`sample` capability, so they only work when the page is opened as a published
artifact on claude.ai. Everything else works by opening the file in a browser.

## Adding a scene

Add an entry to `SCENES` with a `draw(ctx, t, state)` function that paints a
192×108 canvas, then optionally a `PACKS["<scene>_<lang>"]` phrasebook and a
`SCRIPTS[<scene>]` dialogue for offline play.
