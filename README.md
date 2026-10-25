# ART OF PLAY: Word as a Playable System

Student concept for Simulacion, Unidad 7 (Universidad Pontificia Bolivariana). **Student concept, not affiliated with Art of Play.**

The nine letters of ART OF PLAY are thrown letter-cards. Hold a letter with the mouse, flick, release, and find out what each one does.

Work in progress: milestone M1 (honest physics: table, wall, fan, hold and throw). See `docs/unidad7-brief-v2.md` for the full brief.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. Add `?dev` to the URL for the fps meter, tuning panel and state readout.

```bash
npm test
```

Tests include headless throw scenarios with real Rapier; they write `docs/reports/throws.md`.

```bash
npm run build:font
```

Regenerates the committed typeface JSON from Cinzel (only needed if the glyph set changes).

## Controls

Press on a letter to hold it, move to carry and aim, release to throw. That is all.

## Credits

- Subject: Art of Play (artofplay.com), a house of designer playing cards founded by Dan and Dave Buck. Subject of the study, not a partner.
- Typeface: [Cinzel](https://github.com/NDISCOVER/Cinzel) by Natanael Gama, SIL Open Font License 1.1 (`src/assets/fonts/OFL.txt`).
- Rendering: [Three.js](https://threejs.org). Physics: [Rapier](https://rapier.rs).
- Reference rule: Ji Lee, "Word as Image".
- Course text: Daniel Shiffman, *The Nature of Code*, chapter 6 (physics libraries).
