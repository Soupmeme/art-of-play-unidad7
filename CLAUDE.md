# CLAUDE.md

Project: Unidad 7, "Word as a Playable System". ART OF PLAY as nine thrown letter-cards (Three.js + Rapier). Owner: Kiwi.
The full brief is `docs/unidad7-brief-v2.md`. Read it before any non-trivial change.

## Hard rules (copied verbatim from the brief, section 2)

1. All graphics that carry meaning come from the letters of ART OF PLAY. The cards are letter-shaped (die-cut: the card silhouette IS the letterform, thin like a card, not a rectangle with a letter on it). The wall is built from small letter-bricks. Card edges, backs, wall texture and any ornament are built from repeated, rotated or scaled letterforms of the phrase. No suit glyphs, no illustrations, no hands, no logos or brand assets from Art of Play. Emissive glow, lighting and particles made of tiny letters are fine; sprites or shapes that are not letters are not.
2. Two player verbs only: hold and throw, performed with the mouse (press to hold, move to carry and aim, release to throw). No extra buttons, keys, menus, timers or tutorials in the play view. Debug and tuning tools are hidden behind a dev toggle.
3. No on-screen explanation of the method. The visitor discovers it by playing. No text in the play view beyond, at most, an invitation-level hint Kiwi approves.
4. The physics must be honest. Motion comes from the physics engine, never from canned tweens that fake throws, flight, bounces or landings. The only non-physical behaviors are exactly these, and each must be documented as such in code and EXPLAINER.md: (a) the letter effect rules (5.4), which are forces and constraints layered on real physics; (b) the word pull (5.5), an attraction force that is deliberately stronger than gravity near correct neighbors; (c) the wall decay scheduler (5.6); (d) the reset and finale staging (5.7). Nothing else.
5. Real time on the web, 60 fps target, works full window as a hero section.
6. Not an official Art of Play page. Visible "student concept, not affiliated with Art of Play" credit. No real logo, navigation, typeface files or product photography.
7. Never invent playtest results, predictions marked as verified, or self-evaluation scores. Those belong to Kiwi.
8. No em dashes in any prose (docs, comments, commit messages, logbook). Use commas, colons or parentheses.

## Amendments by Kiwi (these override the rules above where they differ)

- 2026-10-25, rule 1, wall and side lanes: the wall and the side lanes are solid single-colour surfaces (oxblood, set off from the green felt), not letter-bricks. Their only marking is a type animation made of the phrase's letters: a grid of character cells (text-mode, ASCII style) in which a large ART OF PLAY scrolls sideways in whole-cell steps with jagged row glitches. Physics still uses a grid of invisible brick colliders behind the wall. The letter-cards stay die-cut letterforms.

- 2026-10-25, decoys (amends the brief's "do not duplicate letters" and adds a fifth non-physical item to rule 4): the wall sheds extra letter-cards, made only of the phrase's letters, on a seeded schedule once play has started (at most 3 at once; `DECOYS.count = 0` turns them off). A decoy obeys its letter's family but never warms, pulls or locks, so the phrase stays exactly nine letters and always solvable. It shows a graded tell (faint glitch at rest, stronger held, strongest near the slot it pretends to fill). It never stays: stuck in the wall it melts back into the type, loose it erodes away after its lifetime. Rule 4 gains item (e): decoy shedding, melting and eroding, tagged `NON-PHYSICAL (4e)`.

## Working notes

- Log every non-trivial decision in `DECISIONS.md` (date, decision, alternatives, why). Escalations go in `ESCALATIONS.md`.
- Code layout mirrors "what is physics, what is magic": `src/physics/`, `src/letters/effects/`, `src/words/`, `src/wall/`, `src/staging/`, `src/render/`, `src/dev/`.
- Any non-physical behavior must carry a comment tag `NON-PHYSICAL (4a|4b|4c|4d)` naming which rule-4 exception it is.
- All randomness goes through `src/core/rng.js` (seeded). Never call `Math.random()`.
- Tests build state with the same factories the runtime uses. No hand-rolled stubs of runtime data.
- Dev mode: add `?dev` to the URL. Nothing dev-only may render without it.
- Commit at the end of each milestone (M0 to M7); keep the app runnable at every commit.
- Commands: `npm run dev`, `npm test`, `npm run build`.
