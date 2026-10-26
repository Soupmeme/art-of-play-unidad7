# EXPLAINER: how the piece works

For the oral defence (brief 1.2, criterion 2). Plain words first, then where it lives in the code, then a parameter table with predictions. Every prediction is a **draft, to be verified by Kiwi**; none is presented as verified. Measurements quoted from the test reports are measurements of the code, not playtest results.

## The piece in one paragraph

A homepage hero for Art of Play, set on a magic stage. The nine letters of ART OF PLAY are thin, die-cut letter-cards, dealt into a hand in a random order together with one or two decoys. The visitor holds a card with the mouse and flicks it at the backdrop. Each letter does something of its own on the way or on impact (it sticks, it curves, it ripples). Correct neighbours in reading order recognise each other near the backdrop and pull together into words, word by word: ART, OF, PLAY. Meanwhile the backdrop slowly crumbles and the wall sheds decoys. When the three words are set, the finale shows the phrase on one line, and the backdrop finally spells it too.

## Code map: what is physics, what is magic

The folders mirror the split the brief asks for (5.8).

| Folder | What it holds | Kind |
|---|---|---|
| `src/physics/` | the Rapier world and fixed 1/60 s clock, the room, air drag, the hold steering, collision groups | honest physics |
| `src/letters/` | letterforms and colliders, the family table, the effect rules, decoy rules, the hand layout | data, and effects (4a, 4e) |
| `src/words/` | the word function (pure) | rules (4b) |
| `src/wall/` | the brick grid, the decay scheduler | physics bodies, scheduler (4c) |
| `src/staging/` | the opening (shuffle, deal, fade), the finale | staging (4d) |
| `src/render/` | meshes, textures, the stage dressing, the type animation, lighting cues | drawing only, never moves a body |
| `src/input/` | hold and throw from the mouse, the throw mapping, picking | input |
| `src/dev/` | dev panel, overlays, scenario runner, smoke run, playtest log (all behind `?dev` or `?log`) | tools |
| `src/game.js` | ties it together: one physics step at a time | glue |

In code, every non-physical behaviour carries a comment `NON-PHYSICAL (4a|4b|4c|4d|4e)`.

## What is physics (honest)

- Rigid bodies, gravity (9.81), collisions, friction and restitution, all by Rapier, stepped at a fixed 1/60 s so runs replay exactly.
- **Air drag**, the same for every letter: acceleration = -0.015 x |v| x v (Nature of Code ch. 2). Agreed with Kiwi as physics, not magic.
- **The held-letter constraint:** while held, a card is a dynamic body pulled toward a point under the cursor by a steering "arrive" force (Nature of Code ch. 5): desired velocity toward the target, slowing inside 0.5 units, steering = desired minus current, capped. It turns upright while held. It still collides honestly; it cannot be pushed through the wall. Gravity is switched off while held (the hand carries the weight).
- **Flight, bounces, landings, falling bricks:** pure Rapier after release.

## What is magic (the only non-physical behaviours)

Rule 4 lists exactly these. Each is a force, constraint or staged move layered on the physics.

### 4a. The letter effects (`src/letters/effects.js`, applied in `game.js`)
- **Stick (A, A, T, F, L):** a flying Stick letter that touches a standing brick at 11 units/s or more, within 40 degrees of head-on, with its face within 50 degrees of the wall, embeds: it is pressed flat into the wall face (keeping its tilt in its own plane) and frozen there, remembering its brick. Slower or glancing hits bounce. A Stick letter that hits a stuck card at 9 units/s or more knocks it loose instead.
- **Curve (R, P):** while airborne, sideways acceleration = 0.12 x spin x speed, along the camera's right axis; clockwise spin hooks right. R and P leave the hand with -5 rad/s of built-in spin (a lopsided letter), so a straight flick hooks about 1.3 units right; a sideways flick adds or cancels spin. A stylized Magnus force, stated as such.
- **Ripple (O, Y):** they keep a bounce of 0.5 whatever they hit; any impact at 3 units/s or more kicks every free card within 2.5 units away from it by 2.0 / max(d, 0.4) units/s (some upward), and a hit on the wall adds stress to the bricks around it.

### 4b. The word pull (`src/words/resolve.js`, forces in `game.js`)
- The word function (below) decides, for each letter, whether it is being pulled and to which slot. A pulled letter gets a damped spring toward its slot (stiffness 40, damping ratio 0.9, capped at 80 units/s^2) plus a lift that cancels gravity, and turns upright. This is the one place a force is deliberately stronger than gravity.
- **Warm hint:** render only. The letter's mesh trembles and leans a few millimetres toward its partner; the body never moves for it.
- **Lock:** when a word is ready, every member is set exactly in its slot, upright, and frozen (kinematic). Locked letters glow.

### 4c. The wall decay scheduler (`src/wall/decay.js`)
- A seeded function of play time, the decay level D and the seed chooses which bricks shudder and fall (details below). Once released, a brick is an ordinary dynamic body.

### 4d. Staging (`src/staging/`, `game.js`)
- **The opening:** a fade from black, a camera push-in and the dealer's shuffle (split, riffle, deal) played on kinematic bodies along keyframe tracks.
- **The hand at rest:** a kinematic rack that holds the cards, breathing gently; cards in it touch nothing but the room, so a thrown card passes over the hand.
- **The finale:** the three words glide kinematically into one line.
- **Resets:** fade to black, the wall is rebuilt, a new round opens.

### 4e. Decoys (Kiwi's amendment, `src/letters/decoys.js`)
- The wall sheds extra letter-cards on a seeded schedule; one or two are also shuffled into the hand. A decoy obeys its letter's family but the word function never sees it. A stuck decoy melts back into the wall; a loose one erodes away after 35 s; all of them melt when the finale begins.

## Colliders: an approximation, stated plainly

Each card has two colliders:
1. **Detailed shape** (touches the wall, floor and room): the letter is rasterised on a 0.08 grid and the filled cells are merged into boxes. Counters (the holes of A, O, P, R) and empty corners (T, L, F, Y) stay open, so a letter bites and lands where its ink is. Box counts: A 12, R 10, T 5, O 14, F 4, P 6, L 4, Y 10.
2. **Solid outline** (touches other cards): the convex hull of the letter, counters filled, no mass. Two convex shapes cannot interlock, so letters never hook through each other's counters. Approximation: a letter cannot rest inside another's counter.

Cards are 0.03 thick (about 10 times a real card) so collisions stay stable; continuous collision detection stops fast thin cards tunnelling. Bricks are boxes (0.6 x 0.55 x 0.3).

## The throw mapping (2D mouse to 3D throw)

- **Aim:** the point on the backdrop under the cursor at release.
- **Power:** the pointer's speed over its last 80 ms, in screen heights per second. Below 0.6 the release is a drop; power rises to full at 2.6.
- **Launch:** 6 to 15 units/s by power; the angle is solved so a full-power throw arrives at the aim point (gravity scaled by 1.1 to offset drag). Weaker throws, same direction, fall short.
- **Spin:** -2 x the sideways pointer speed, capped at 9 rad/s, in the card's own plane.
- **Measured:** full-power throws land within 0.06 units of the aim point (`docs/reports/throws.md`).

## The word function, in plain words

1. Each letter serves the slot of its own character. The two As are interchangeable: a locked word keeps its A; otherwise each A goes where its neighbours are closer.
2. For each pair of neighbouring slots, both letters in play: if the right-hand letter is further right on screen (reading order) and closer than 2.5, the pair is **warm**; if closer than 1.5 and roughly at the same depth (within 1.0), it **pulls**. Wrong order gives nothing at all.
3. A word only forms from a **stuck anchor** (Kiwi's amendment): slots are laid out from the letter stuck in the backdrop, with the font's own spacing and kerning. With no anchor, pairs can be warm, but nothing pulls. If two members are stuck and not where the word needs them, the word is **unresolvable** until the wall drops one or a sharp letter knocks one out.
4. When every member sits within 0.12 of its slot, upright and facing the camera, the word **locks**.

## Decay and resets

- D starts at 0, rises 1/150 per second after 40 s of play, and drops by 0.25 when a word locks.
- Events every 9 s (D = 0) down to 2.5 s (D = 1), clusters of 1 to 4 neighbouring bricks; the first brick is drawn weighted by Ripple stress.
- A locked word gives a 20 s respite. Bricks behind a locked word never fall. A brick stressed by about three Ripple hits falls on its own, grace or not.
- A chosen brick shudders for 0.6 s (in the type), then slides out and falls; cards stuck to it come away.
- Reset after 25 s with no hold or throw (once play has started; never while holding), or when 60% of the bricks have fallen.

## Parameter table (predictions: draft, to be verified by Kiwi)

All values live in `src/config.js`; most can be changed live in the dev panel (`?dev`).

| Parameter | Value | What it changes | Predicted visible effect (draft, to be verified by Kiwi) | How to check |
|---|---|---|---|---|
| `THROW.dropSpeed` | 0.6 H/s | flick speed below which a release is a drop | Higher: more releases just drop at the hand; lower: lazy releases fly off | dev readout "last ... drop"; `test/layout.test.js` planThrow |
| `THROW.fullSpeed` | 2.6 H/s | flick speed for full power | Lower: full power is easy, throws reach the aim more often; higher: players must flick hard | `docs/reports/throws.md` (1.8 H/s hits 1.2 units low) |
| `THROW.maxLaunch` | 15 u/s | launch speed at full power | Higher: flatter, faster throws, more Stick embeds; lower: loopier arcs, fewer embeds | throws report, dev panel |
| `THROW.spinGain` | 2 | spin per sideways flick | Higher: diagonal aiming bends R and P more, harder to aim; lower: spin hardly matters | effects report (left/straight/right flick) |
| `HOLD.maxSpeed` | 32 u/s | how fast a held card follows the cursor | Lower: the card lags behind fast flicks | dev panel, by feel |
| `AIR.coefficient` | 0.015 | air drag | Higher: throws droop and fall short; lower: cards fly like stones | throws report |
| `CARD.restitution` | 0.15 | bounce of non-Ripple letters | Higher: letters bounce back from the backdrop toward the hand | effects report rest positions |
| `EFFECTS.stick.minSpeed` | 11 u/s | stick threshold | Lower: more letters embed on gentle hits; higher: only hard, square throws stick | `test/effects.test.js` soft vs hard |
| `EFFECTS.stick.approachCone` | 40 deg | stick cone | Wider: glancing throws still stick | `test/effects.test.js` glancing hit |
| `EFFECTS.stick.knockSpeed` | 9 u/s | knock-out threshold | Lower: stuck letters are easy to pry loose, commitments weaker | `test/wall.test.js` knock tests |
| `EFFECTS.curve.gain` | 0.12 | strength of the hook | Higher: stronger hook, harder to aim straight, easier to reach around an anchor | effects report (hook about 1.3 units) |
| `EFFECTS.curve.biasSpin` | -5 rad/s | built-in spin of R and P | 0: a straight flick flies straight and R, P look ordinary; larger: they hook even on careful throws | effects report |
| `EFFECTS.ripple.restitution` | 0.5 | Ripple bounce | Higher: O and Y fly back toward the hand, harder to capture in a pull | effects report rest positions |
| `EFFECTS.ripple.radius` / `strength` | 2.5 / 2.0 | reach and force of the kick | Higher: neighbours are shoved further, more nudging power, more chaos | effects report (0.53 units shove) |
| `EFFECTS.ripple.shakeAmount` | 0.35 | wall stress per Ripple hit | Higher: fewer hits drop a brick, repairs come cheaper but cost more wall | `test/decay.test.js` stress release |
| `WORD_RULES.hintRadius` | 2.5 | warm distance | Larger: the tremble shows from further away, the puzzle is easier to read | dev overlay "show word radii", `test/words.test.js` |
| `WORD_RULES.pullRadius` | 1.5 | pull distance | Larger: letters snap together from further, less precision needed | dev overlay, words tests |
| `WORD_RULES.snapDistance` | 0.12 | lock tolerance | Smaller: the lock needs a tighter fit, words take longer to settle | words tests (lock) |
| `WORD_RULES.requireAnchor` | true | words need a stuck anchor | false: words also form on the stage floor, easy to assemble by dropping letters | `test/words.test.js`, `test/sequences.test.js` |
| `WORD_RULES.pullStiffness` | 40 | pull spring | Higher: letters snap faster and may overshoot; lower: a slow, floaty gather | dev panel, by eye |
| `DECOYS.count` | 4 | decoys alive at once (0 = off) | 0: the puzzle is the bare word; more: more noise to sort | `test/decoys.test.js`; compare in playtests |
| `DECOYS.firstAfter` / `interval` | 5 s / 4 to 8 s | shedding pace | Shorter: the stage fills with lies quickly | decoys tests, dev readout |
| `DECOYS.tellBase` / `tellHeld` | 0.15 / 0.55 | how visible the tell is | Higher: decoys are spotted at a glance; lower: only near their false slot | by eye, playtests |
| `DECAY.grace` | 40 s | time before the wall starts to fall | Longer: more time to explore before the wall moves | `test/decay.test.js` |
| `DECAY.rise` | 1/150 per s | how fast pressure grows | Higher: pressure escalates faster | decay tests |
| `DECAY.telegraph` | 0.6 s | shudder before a brick falls | Longer: easier to read what will fall, less tense | by eye |
| `DECAY.respite` | 20 s | calm after a lock | Longer: finishing a word buys more calm | decay tests |
| `DECAY.collapseFraction` | 0.6 | share of bricks before a collapse reset | Lower: the round resets sooner as the wall fails | decay tests |
| `RESET.quietSeconds` | 25 s | idle time before a reset | Shorter: resets sooner after the player stops; may cut off a player thinking | decay tests (quiet reset) |
| `FAN.rows.min` | 8 | when the hand uses two rows | Lower: two rows even for small hands | `test/opening.test.js` |
| `OPENING.fade` / `dolly` | 1.2 s / 2.8 s | opening fade and camera push | Longer: a slower, more theatrical entrance | opening tests |
| `CAMERA.maxFov` | 62 deg | widest lens before the camera pulls back | Higher: narrow windows go fisheye; lower: the camera steps back sooner | browser check in DECISIONS (framing) |

## What the tests cover, and what they do not

Covered (`npm test`, 135 tests, real Rapier in Node, seed 1):
- the throw mapping (pure) and full-power accuracy; power and spin from the flick;
- letterforms, colliders (counters open), the hand and wall layouts;
- the family table; each effect rule alone; one scripted throw per letter; soft vs hard Stick; Curve left/straight/right; Ripple nudge vs a control; knock-out; stuck letters cannot be pushed; nothing gets behind the wall; letters never hook together; a warm pair never moves;
- the word function: warm, pull, wrong order, duplicate A, locked reservation, anchors, unresolvable, lock, the anchor rule; full scripted completion of all three words and the finale;
- decoys: schedule, tell, erosion, melting, impostor warmth, never pulled or locked;
- the opening: shuffle permutation with no hint pairs, deal tracks, fade; a real round;
- decay: scheduler alone and in the game; quiet and collapse resets.

Not covered by tests:
- anything that needs eyes: how the cards, shaders and lighting look; whether effects are distinguishable to a person; whether the throw feels learnable with a real hand (these are for Kiwi and the playtests);
- the browser input path is not unit tested; it was exercised with synthetic pointer events in the Claude desktop app's built-in browser (Chromium, real Rapier WebAssembly), including a 2-minute scripted smoke run (see DECISIONS, M7);
- rendering performance on other machines.
