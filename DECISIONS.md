# Decisions

Format: date, decision, alternatives considered, why. Newest at the bottom. Values marked "starting value" are expected to change with tuning; later entries supersede earlier ones.

## 2026-10-25, before M0 (agreed with Kiwi in conversation)

### Stack
- **Decision:** Vite, plain JavaScript ES modules, `three`, `@dimforge/rapier3d-compat`, Vitest.
- **Alternatives:** TypeScript; Rapier's non-compat package (needs a WASM bundler plugin); Jest.
- **Why:** plain JS keeps every line defensible in the oral exam and matches the course's JS lineage. The compat build inlines the WASM, so it works in Vite and in Node with no plugin, which lets the scenario runner run headless. Vitest shares Vite's module resolution.

### Shared data types between runtime and tests
- **Decision:** letter, word and wall state are created only through factory functions in the runtime modules. Tests import those same factories.
- **Alternatives:** test-local fixtures.
- **Why:** the brief's lesson from an earlier unit: a permissive stub hid a real browser bug.

### Dev tools and dev toggle
- **Decision:** `?dev` in the URL enables dev mode. Panel uses lil-gui and the fps meter uses Stats, both from `three/addons/libs` (no new dependency).
- **Alternatives:** a hidden key; a separate dev page.
- **Why:** rule 2 forbids keys in the play view; a URL flag adds nothing a visitor can trigger by accident.

### Units and world layout
- **Decision:** 1 world unit = one card (cap) height. Table top is the plane y = 0. Wall at about 10 units from the camera. Fixed physics step of 1/60 s with an accumulator. Continuous collision detection (CCD) on letters.
- **Why:** the brief sets distances in card heights; a fixed step keeps physics reproducible for seeded replays; CCD stops thin fast cards tunnelling.

### Card thickness
- **Decision:** 0.03 units (3% of card height). Starting value.
- **Alternatives:** real card proportion (about 0.3%).
- **Why:** a real-proportion card is unstable for collision and invisible in shadow. 3% still reads as thin.

### Letter colliders
- **Decision:** compound boxes along the strokes, authored as data per letter. O is a ring of 8 boxes. A, P, R may use a convex hull where it matches the silhouette closely enough.
- **Alternatives:** one convex hull per letter; automatic convex decomposition.
- **Why:** a single hull misrepresents T, L, F, Y (it fills their empty corners), which would change where they bite the wall. Hand-authored boxes are easy to show and explain.

### Typeface
- **Decision:** Cinzel, Black weight (SIL OFL). Locked words are spaced with the font's own advance widths and kerning.
- **Alternatives:** Playfair Display (Didone hairlines break when die-cut thin); IM Fell (too rough at small sizes).
- **Why:** inscriptional all-caps with an engraved, luxury-deck feel; heavy strokes survive extrusion as thin cards.
- **Note (found during M0):** three's `TTFLoader` now imports opentype.js from a CDN at runtime. To avoid a runtime CDN fetch, M5 will convert the TTF once with a small dev-only script into three's typeface JSON (only the glyphs needed) and commit the JSON plus the font licence.

### Palette (Kiwi may override)
- **Decision:** green-black felt ground, ivory card stock, oxblood red as the second ink (backs, edges, ornament), bricks in low-contrast dark ink, a warm amber emissive glow on locked words as the one accent.

### Hold
- **Decision:** the held letter stays a dynamic body. A steering "arrive" force (Nature of Code) drives it toward a target on a hold plane about 2 units in front of the camera.
- **Alternatives:** kinematic body moved to the pointer; teleport to the hand.
- **Why:** collisions stay honest, the letter cannot be forced through the wall, and it is a course concept Kiwi can explain. Letters picked up from the table swoop back to the hand under that force.

### Throw mapping (starting design, tuned in M1)
- **Decision:** aim is the point on the wall plane under the cursor. Power is the pointer speed smoothed over 80 ms, clamped. Launch elevation is solved ballistically (ignoring drag) so a full-power throw arrives at the cursor point, weaker throws fall short. Lateral pointer velocity sets spin in the card's own plane (pinwheel). Below a speed threshold, release is a drop. All values live in the dev panel.

### Embed look and Curve force (flag 2, agreed with Kiwi)
- **Decision:** letters fly face toward the wall and spin in their own plane. A Stick letter embeds face-flat, keeping whatever in-plane tilt it arrived with. The Curve rule is a stylized sideways force: gain x spin x speed along the camera's right axis, sign from spin direction.
- **Alternatives:** edge-first embed (card in a watermelon) with spin about the vertical axis and a literal Magnus cross product.
- **Why:** edge-on anchors would be unreadable from the camera, and words are laid out from anchors. For in-plane spin the literal Magnus cross product is zero, so the Curve force is documented as stylized (rule 4a).

### Air drag (flag 3, agreed with Kiwi)
- **Decision:** simple quadratic drag on every letter, identical for all letters, no lift. Counted as honest physics (Nature of Code ch. 2), not a fifth non-physical behavior.
- **Why:** without drag letters fly like bricks, not cards.

### Tremble on stuck letters (flag 4, agreed with Kiwi)
- **Decision:** a stuck (welded) letter's warm tremble is a render-only offset of a few millimetres on its mesh; its body does not move. Documented under rule 4b. Free letters tremble through small physical forces.

### Surfaces that are not letters (flag 5, agreed with Kiwi)
- **Decision:** the table top is the plain felt ground (not a graphic). Side rails are low rows of letter-bricks. Bricks render as letters but collide as boxes, packed tightly so a card rarely sticks in a visible gap.

### Lockout mitigation (flag 1, agreed with Kiwi)
- **Decision:** (a) a letter currently under a correct word pull cannot embed; the pull wins. (b) The Ripple wall-shake ignores the decay grace period and is strong enough that 2 or 3 nearby Ripple hits release a brick, so O and Y are the player's tool for clearing a badly placed anchor.
- **Why:** ART (A, T) and PLAY (L, A) each have two Stick letters; random exploration would otherwise make both words unsolvable within the first minute, with only slow random decay as a way out. To be verified with the scenario runner at M3, then in playtests.

### Other defaults
- Wall: 20 x 9 = 180 bricks cycling the letters of ARTOFPLAY in offset rows, one instanced mesh per distinct glyph. Starting value.
- Word function: radii measured in 3D, reading order along the camera's right axis, depth tolerance along the camera's forward axis. Duplicate A assigned greedily by lowest total distance, locked words reserve their letters first.
- Reset: letters and bricks scale out, then reappear in place; no fake flight. Finale: locked words release their joints and glide kinematically into one centred line, hold about 4 s.
- Randomness: mulberry32 seeded PRNG, one stream per subsystem (decay, idle sway, reset seed) so retuning one subsystem does not change another's replay.
- Scenario runner: runs in the dev panel and headless in Node with the same step code.
- Smoke check: the Claude desktop app's built-in browser (Chromium, real Rapier WASM). No Playwright (large browser download).
- Hint text: none by default. Kiwi decides whether to add one.
- Git: repository in the project folder, brief moved to `docs/`, a commit per milestone, no remote.

## 2026-10-25, M0
- **Decision:** git author for this repo set locally to Kiwi with the owner's account email.
- **Decision:** the non-affiliation credit is a small fixed line in a corner of the hero from M0 on (rule 6), styled with system fonts until M5.
- **Note:** the production bundle is about 4.9 MB (1.8 MB gzipped), mostly Rapier's compat build with its WASM inlined as base64 (4.2 MB unminified). Accepted for now because it keeps one build path for browser and Node. Revisit in M6 (hero framing) if load time on a homepage matters: options are the non-compat Rapier package with a separate `.wasm` file, or a loading state.
- **Note:** three r186 removed `PCFSoftShadowMap`; using `PCFShadowMap`. Soft shadow quality to be revisited in M5.

## 2026-10-25, M1 (honest physics)

### Typeface brought forward from M5
- **Decision:** Cinzel Black is converted now. `scripts/build-font.mjs` (run with `npm run build:font`) reads the WOFF from `@fontsource/cinzel` with `opentype.js` (both dev dependencies only) and writes `src/assets/fonts/cinzel-black.typeface.json` with the 8 glyphs used and the kerning of the 6 in-word pairs. The OFL licence is copied next to it.
- **Alternatives:** a placeholder font until M5.
- **Why:** colliders are derived from the real letterforms; a placeholder would mean redoing colliders and retuning every throw in M5.

### Colliders: automatic raster boxes (supersedes "hand-authored boxes")
- **Decision:** each letter's collider is computed: a grid of 0.08 card heights is laid over the glyph, a cell is filled when at least half of its 3 x 3 samples are inside the letter, and filled cells are merged greedily into rectangles. Box counts: A 12, R 10, T 5, O 14, F 4, P 6, L 4, Y 10.
- **Alternatives:** hand-authored boxes per letter; convex hulls.
- **Why:** same goal (keeps the counters of A, O, P, R and the empty corners of T, L, F, Y open), but works for any typeface, is easy to show (dev panel, "show colliders"), and is tested (O counter open, L corner empty).

### Camera and framing
- **Decision:** camera at (0, 1.5, 0) looking at (0, 1.0, -12), vertical field of view 50 degrees at 16:9 and wider. Narrower windows widen the vertical field of view so the horizontal coverage never shrinks.
- **Why:** the nine letters, about one card wide each in Cinzel, need about 7 units of width at the hand. 50 degrees is still a modest lens.

### Wall
- **Decision:** front face at z = -12 (12 card heights from the camera, about 7 from the hand). 9 rows of 0.55, letters of cap height 0.46, rows filled to 12 units and centred: **222 bricks**. Each row is the phrase typeset with real advance widths, starting 4 letters further than the row below, which staggers the joints.
- **Why:** reads as both a wall and a texture of type, like lines of movable type.

### Fan
- **Decision:** arc of radius 10 centred at (0, 0.95, -5.2); letters spaced by 0.64 x their mean advance width, with an extra 0.45 between words so the hand reads ART OF PLAY. Later cards sit 0.04 in front.
- **Decision:** letters in the fan are kinematic and in a collision group that only touches the room, so a held or thrown letter passes over the hand instead of crashing into it. This is part of staging (rule 4d), tagged in code.
- **Why:** in the first prototype, thrown letters flew into the fan and were deflected (measured: a centre throw ended 4.7 units off to the side).

### Room boundaries
- **Decision:** invisible "glass" colliders bound the play area: front at z = -4.35 (just in front of the hold plane), sides from x = ±3.9 at the front to ±6.4 at the wall, back at z = -14 behind the wall, 8 units tall. The rails drawn on the table (letters cap height 0.24) mark the side glass; the glass, not the rail, is the collider.
- **Why:** letters must never leave the frame or the reachable table. A low rail alone let letters hop out. The front glass sits where the table first becomes visible, so a dropped letter always lands in view. The first prototype had the sides at ±3.0, which overlapped the outer fan letters and pushed A and Y out of the room when grabbed; ±3.9 fixed it.

### Hold
- **Decision:** hold plane at z = -4.6. Gravity scale is 0 while held (the hand carries the weight). Linear: Reynolds arrive, max speed 22, slow radius 0.5, max acceleration 600. Orientation: angular velocity eases toward the rotation that stands the letter upright facing the camera (gain 14, blend 25 per second).

### Throw mapping (as implemented)
- **Decision:** pointer velocity over the last 80 ms, in screen heights per second. Below 0.6 it is a drop. Power rises linearly to 1 at 2.6. Launch speed 6 to 15 units/s by power. Elevation solved for full power with gravity scaled by 1.1 (offsets drag). Spin = -4 x sideways pointer velocity, clamped to ±18 rad/s, about the axis that points at the camera.
- **Measured (scenario runner, seed 1, see `docs/reports/throws.md`):** full-power throws of all nine letters hit within 0.06 units of the aim point; at the same aim, a 1.8 H/s flick hits 1.2 units lower and a 1.0 H/s flick falls short. These are measurements of the code, not playtest results.
- **Change:** spin gain lowered from 6 to 4 after scripted diagonal flicks saturated the spin.

### Card material
- **Decision:** restitution 0.15 (lowered from 0.3: letters bounced back from the wall like balls), friction 0.5, angular damping 0.4, density 1. Air drag coefficient 0.015.

### Status rules
- **Decision:** a flying letter becomes `onTable` after 0.25 s below 0.15 units/s and 0.6 rad/s (or when Rapier puts it to sleep). A resting letter knocked above 0.8 units/s is `flying` again. Holdable: `inFan` and `onTable` only.

### Cursor feedback
- **Decision:** the system cursor shows "grab" over a holdable letter and "grabbing" while holding. No element is added to the view. Kiwi may veto it as a hint.

### Dev tooling
- **Decision:** `?dev` shows the tuning panel (throw mapping, hold, card and air, return letters to fan, show colliders) and a readout of every letter's status and the last throw's values. `aop.flick(...)` in the console drives the real input path with synthetic pointer events. The headless scenario runner (`src/dev/scenario.js`) is exercised by `test/throws.test.js`.
- **Note:** synthetic pointers cannot be captured, so pointer capture is wrapped in try/catch; real pointers are unaffected.

## 2026-10-25, M1 revision after Kiwi's first look

### Wall and side lanes become solid surfaces with a type animation (Kiwi's direction, amends rule 1)
- **Decision:** the wall is one oxblood slab (12 x 4.95 x 0.3) and the side lanes are low oxblood bars (0.22 high, 0.12 wide). Their faces carry a type animation, a lit standard material with a patched fragment shader (`src/render/asciiMaterial.js`):
  - the surface is a grid of character cells (wall: 100 x 36, exactly 5 x 4 cells per brick), each showing one letter of ARTOFPLAY from a glyph atlas drawn from the Cinzel outlines;
  - content moves in whole-cell steps (text-mode feel): 7 cells/s sideways on the wall, 5 cells/s toward the wall on the lanes;
  - at 1.6 changes per second, about 30% of rows jump out of line by up to 4 cells (the jagged glitch);
  - a large ART OF PLAY (62% of the wall height, centred at 60% so the fan does not hide it) is sampled once per cell from a banner mask set with the font's advances and kerning, so the big letters are built out of the small ones; cells outside it are dim, with 4% flickering.
- **Alternatives:** keep the letter-brick wall (Kiwi found it on the nose); a pure unlit shader (would lose the letters' shadows on the wall).
- **Physics:** unchanged in kind. The wall is still a grid of fixed box colliders, now uniform: 20 x 9 bricks of 0.6 x 0.55 (**180 bricks**, was 222 of varying width). The visible slab and the colliders cover the same volume.
- **Consequence for M4 (wall decay), my default unless Kiwi says otherwise:** a released brick will cut its 5 x 4 cell block out of the slab (the shader masks it) and fall as a box carrying the same animated type, so the crumble reads as cells dropping out of the text.
- **Rule 1:** amendment recorded in CLAUDE.md; the letter-cards remain die-cut letterforms.

### Camera raised, fan lowered (fixes hard-to-grab flat letters)
- **Observation (Kiwi):** letters lying flat far from the hand were hard to grab; from a camera 1.5 high they were seen almost edge-on. Also found while testing: on screen the fan sat over the far end of the table, so it hid letters lying near the wall, and a press there grabbed a fan letter instead.
- **Decision:** camera at (0, 3.2, 0) looking at (0, 0.6, -12). The fan moves to (0, 0.58, -4.85) with its arc sag reduced to 0.35, so it sits at the bottom of the screen (about 72% to 91% of the height) and the table from 8 units out appears above it. Hold plane at z = -4.5, front glass at z = -4.3 (where the table first comes into view).
- **Measured:** a flat letter near the wall now spans about 20 px on a 720 px tall view. Throw accuracy unchanged (full-power hits within 0.05 of the aim, `docs/reports/throws.md`).

### Picking fallback
- **Decision:** when the pointer ray misses every letter, the nearest holdable letter on screen is picked if any of its collider box centres, projected, is within 0.045 screen heights of the pointer (`src/input/picking.js`). Ray hits always win, so a letter in front still takes precedence.
- **Checked in the browser:** pressing 20 px above a flat letter near the wall grabs it.

## 2026-10-25, M2 (letter effects)

### Family table kept as the brief proposed
- **Decision:** Stick: A, A, T, F, L. Curve: R, P. Ripple: O, Y. Data in `src/letters/families.js` with a one-line anatomy reason per letter. Each word has a Stick anchor (tested). Families are looked up by letter, so the two As always match (tested).

### Contact detection
- **Decision:** letter colliders raise Rapier collision events. After each step, the first contact a flying letter starts decides its effect (letters have several box colliders, so later events in the same step are ignored). The impact velocity is the letter's velocity recorded just before the step, because the solver has already changed it by the time events are read.

### Stick
- **Decision:** embeds when a flying Stick letter touches a brick at 11 units/s or more, within 40 degrees of head-on, with its face within 50 degrees of the wall face. The letter is pressed flat into the wall face (sunk 0.012), keeping its in-plane tilt, and joined to that brick by a fixed joint with contacts between the two disabled. Status becomes `stuck`.
- **Why 11:** measured full-power impacts are about 12.2 to 12.5 units/s and medium flicks (1.8 screen heights/s) about 10. At 9, every medium throw stuck; at 11, hard throws stick and soft ones bounce, which makes "how hard" part of what the player learns.
- **Not yet:** "a letter under a correct word pull cannot embed" (lockout mitigation a) needs the word function; it lands in M3.

### Curve
- **Decision:** while a Curve letter is airborne (released and not yet touching anything), it gets a sideways acceleration along the camera's right axis: 0.09 x spin (about its face normal) x speed. Clockwise spin, as the camera sees it, hooks right.
- **Decision (added):** a Curve letter leaves the hand with -7 rad/s of built-in spin, so a plain straight flick visibly hooks right (measured: about 1.3 units at the wall). A left flick cancels it (lands within 0.5 of the aim), a right flick doubles it (about 3.2 units).
- **Alternatives:** spin only from the sideways flick, as M1 had it.
- **Why:** Kiwi noted the most intuitive throw is a straight upward flick, which has no sideways motion. Without the built-in spin, most players would never see R or P do anything. Justified by anatomy: a lopsided letter leaves the hand spinning. Documented as part of the Curve rule (4a).
- **On wall contact:** no embed, it bounces like any card ("clings weakly" from the brief not implemented).

### Ripple
- **Decision:** O and Y have restitution 0.5 with a Max combine rule, so they keep their bounce against anything (other letters use 0.15). On any contact at 3 units/s or more (with a 0.25 s cooldown per letter), every other free letter (flying or on the table) within 2.5 units gets a velocity change away from the impact of 2.0 / max(d, 0.4) units/s, with half of that as lift so flat letters hop. A Ripple hit on the wall adds stress to bricks within 1 unit (0.35 at the centre, linear falloff); the decay scheduler will read it in M4. Letters in the fan, held, stuck or (later) locked are never kicked.
- **Change:** restitution lowered from 0.65 to 0.5: at 0.65 a Y bounced all the way back to the hand.
- **Measured:** an O thrown low beside a T lying at the foot of the wall shoves the T 0.53 units; the same throw with F moves it 0.

### The wall answers impacts (visual only)
- **Decision:** wall impacts become pulses in the wall's type animation (four most recent kept): a Stick hit lights the cells within 0.6 of it, fading over 0.7 s; a Ripple sends a ring outward at 4 units/s for 1.4 s that lights cells and shoves alternate rows sideways; a plain bounce gives a faint 0.3 s flash. Made only of the phrase's letters, never moves anything physical.
- **Why:** M2's acceptance asks that each effect be distinguishable by someone who does not know the rule. The wall reacting differently to each family gives a second, immediate cue besides the letter's own motion.

### Test and dev support
- `game.debugPlace` (tests and dev only, never in play) puts a letter at a pose to set up scenarios. The scenario runner takes a `setup(game)` callback and returns the game for inspection.
- `test/effects.test.js` covers the table, each pure rule, one scripted throw per letter with the rule's expected outcome, soft vs hard Stick, left/straight/right Curve, Ripple nudging vs a control, and Ripple wall stress. It writes `docs/reports/effects.md`.
- Dev panel: "Letter effects" folder; the readout shows each letter's family initial and the last contact (speed, approach, face, stick or bounce, ripple).

## 2026-10-25, M3 (word resolution)

### The word function
- **Decision:** `src/words/resolve.js`, a pure function from plain letter data (built by `letterSnapshot`, the same factory the runtime uses) to per-word state (`cold`, `warm`, `pulling`, `ready`, `locked`, `unresolvable`), slot positions, anchor or leader, and per-letter warmth, pull and target. Rules are written at the top of the file in plain words.
- **Typesetting:** slots are set with Cinzel's advance widths and kerning plus 0.08 tracking (`wordLayout` in `glyphs.js`). Without the tracking, neighbouring cards overlap slightly (R and T do) and their colliders fight the pull. Slots share a baseline taken from the anchor or leader.
- **Duplicate A:** a locked word keeps its A; otherwise the assignment with the lower total of "distance from ART's A to R" plus "distance from PLAY's A to the nearer of L and Y" wins; ties put the lower id in ART. Letters out of play count as very far.
- **Warmth:** 0 at hintRadius (2.5), rising linearly to 1 at the typeset spacing.
- **Pull:** in order, under pullRadius (1.5) and within 1.0 in depth.
- **Anchors:** a stuck member anchors the word (lowest slot if several). Further stuck members must already be within snapDistance of their slots, otherwise `unresolvable` and no pull (warmth still shows). Free members of an anchored word hover 0.02 in front of the wall.
- **Leaders:** with no anchor, the pulled member nearest the group's centroid leads, kept from step to step while it still qualifies (so targets do not jump); the word stands on the table (baseline 0.02).
- **Ready to lock:** every member in play, every pair in order, every free member within 0.12 of its slot and within 15 degrees of upright and facing the camera.

### Warm hint (4b)
- **Free letters:** a rattle (angular velocity kicks of 3.0 x warmth rad/s per step, oscillating at 9 Hz, so it averages out to a wobble of a few degrees) and a lean (a 1.2 x warmth units/s^2 push toward the partner, weaker than friction, so letters creep only while rattling).
- **Stuck letters:** render-only tremble of up to 6 mm on screen, as agreed (flag 4).
- Not glowing: glow is reserved for locked words.

### Pull (4b)
- **Decision:** damped spring toward the slot (stiffness 40, damping ratio 0.9, acceleration capped at 80) plus a lift that cancels gravity, plus a gentle upright turn (gain 6). A pulled Curve letter stops curving. Pulled letters stay holdable (the player can pull one back out).
- **Lockout mitigation (a), now in:** a Stick letter under a pull does not embed. Measured: a T thrown hard at its slot beside a stuck A is caught and locks ART instead of sticking.

### Lock (4b)
- **Decision:** every member, the anchor included, is set exactly in its slot, upright, and made kinematic: frozen in place, immune to holding, ripples and (M4) decay. Locked letters glow (emissive 0.28, the amber accent).
- **Alternatives:** fixed joints between members, as the brief suggests. A word standing on the table is a row of thin plates on their edges and would topple; freezing is simpler and equally explainable ("a locked word is set in type").
- **Change found in the browser:** at first the anchor kept its stuck tilt; a Stick letter arrives spinning, so an F locked nearly upside down inside OF. The lock now straightens it.

### Finale (4d)
- **Decision:** when the third word locks, all nine letters glide kinematically (1.6 s, smoothstep) into one line, ART OF PLAY, baseline centred at (0, 1.7, -8), word gap 0.7, upright and facing the camera, glow rising to 0.6. It holds; the reset after it is M4's quiet rule.

### Throw spin retuned (found in the browser)
- **Observation:** to aim at a spot far to the side, a scripted flick moved diagonally, and its sideways speed maxed out the spin. R then hooked several units off, the next Stick letter stuck in the wrong place, and ART was locked out. A player who first carries the letter under the target and then flicks straight up avoids this, but the spin was too touchy.
- **Decision:** spinGain 4 to 2, maxSpin 18 to 9 rad/s. To keep R and P visibly curving, curve gain 0.09 to 0.12 and built-in spin -7 to -5: a straight flick still hooks about 1.3 units right, a firm left flick (2.5 screen heights/s sideways) cancels it, a firm right flick hooks about 2.9.
- **Open for playtests:** whether players learn "carry, then flick straight". An alternative, if they do not: take spin from the flick's curvature (how much the flick bends) instead of its sideways speed, so straight diagonal flicks carry no spin.

### Verified sequences (headless and in the browser)
- `test/sequences.test.js` (report `docs/reports/words.md`): OF, ART and PLAY completed deliberately one after another, then the finale; a word with no anchor locks standing on the table; wrong order never pulls or locks; A and T stuck 1.2 apart leave ART unresolvable and R unpulled.
- In the built-in browser, through the real pointer input (scripted with `aop.flick(..., { carry: true })`), the full phrase was completed and the finale played.

### Playtest readiness
- `PLAYTESTS.md` holds the session template (brief section 8). The optional local event logger is not built yet.

## 2026-10-25, after M3: wider hold, decoys (Kiwi's direction)

### Hold area widened
- **Observation (Kiwi):** flicking felt like hitting a wall. Cause: the held letter's height was clamped at 3.2 units, which on the hold plane is about a quarter of the way down the screen; during an upward flick the letter stopped there while the pointer kept going.
- **Decision:** ceiling raised to 4.8 (above the top of the screen at the hold plane), side inset 0.6 to 0.35, front side boundary 3.9 to 4.3 (just past the screen edge at the front), and the hold steering made quicker (max speed 22 to 32, max acceleration 600 to 900) so the letter keeps up with a flick.
- **Checked in the browser:** dragging a held letter to 6% from the top of the screen, the letter followed to 6%. Throw accuracy unchanged (`docs/reports/throws.md`).

### Decoys (amends the brief; Kiwi chose wall-shed, graded tell, inert noise)
- **Where from:** the wall sheds them. A seeded schedule (`src/letters/decoys.js`) on the play clock (which starts at the first hold): first after 18 s, then every 12 to 22 s, at most 3 at once. Each pops out of the wall face (0.03 in front of it) with 2.4 units/s toward the camera and 1.5 up, then falls to the table under ordinary physics. The wall's type flashes where it leaves. Letters drawn only from ARTOFPLY.
- **Rule:** a decoy obeys its letter's family (a decoy R curves, a decoy T can stick, a decoy O ripples), so "the rule is about the letter" still holds. The word function never sees decoys: they never warm, pull or lock, and the phrase stays exactly nine letters.
- **Inert noise, never a blocker:** a decoy that sticks in the wall melts back into its type within 1.2 s, so it never squats on a slot. A loose decoy erodes over the last 6 s of a 35 s life and is removed. The clock pauses while it is held.
- **Graded tell (`src/render/decoyMaterial.js`):** the letter is cut into thin horizontal bands that jump sideways now and then (like the wall's glitching rows), its ivory greys, and at the end it drops out in blocks. Strength: 0.15 at rest (faint), 0.55 while held, rising to 1 as it nears the slot it pretends to fill. "Near" is impostor warmth: the warmth its real neighbours would give it if it were real, by the same formula as real pairs (`impostorWarmth` in `src/words/resolve.js`). So the closer a decoy gets to the answer, the more the lie breaks up. The shown tell eases toward the game value over about a sixth of a second.
- **Engineering:** letters and decoys are now "cards" sharing one code path (hold, throw, effects, contacts, rendering, picking). Decoy ids 9 to 11 are reused. Dev panel: "Decoys" folder (count, timing, tell levels, "shed a decoy now").
- **Tests (`test/decoys.test.js`):** schedule determinism and spacing; tell grading; impostor warmth (full at the right slot, zero in wrong order or far); erosion and melting; in real Rapier: a shed decoy lands on the table, count 0 never sheds, a decoy sitting exactly in O's slot beside a stuck F never pulls or locks while the real O still completes OF, a stuck decoy melts away, a loose decoy erodes away.
- **Checked in the browser:** a decoy O placed in OF's open slot shows the full tell (sliced bands, greyed); a decoy R lying far from any A shows only the faint one. A GLSL compile error (`active` is a reserved word) was found there and fixed.
- **Open for playtests:** whether the at-rest tell is too faint to notice at all, or the near-slot tell gives the game away. Compare sessions with `DECOYS.count` 0 and 3.

## 2026-10-25, the magic stage; wall contact fixes; faster decoys (Kiwi's direction)

### Decoys shed sooner
- **Decision:** first shed after 8 s of play (was 18), then every 6 to 12 s (was 12 to 22). Still at most 3 at once.

### Stuck letters are frozen, not jointed
- **Observation (Kiwi):** a letter that stuck sometimes ended up beyond the wall and could not be got out, even by hitting it with a sharp letter.
- **Cause:** a stuck letter was held to its brick by a fixed joint with contacts against that brick switched off. Rapier solves joints softly, so hits from other letters could shove the stuck letter through its own brick, behind the visible wall face.
- **Decision:** a stuck card is made kinematic at its embedded pose. Nothing can push it. Tested: a stuck T hit straight on by a hard O and a hard Y does not move at all.
- **M4 note:** when the decay scheduler releases a brick, the cards stuck to it will be released too.

### Knock-out: a sharp letter pries a stuck one loose (NON-PHYSICAL, 4a)
- **Decision:** a flying Stick letter that hits a stuck card at 9 units/s or more knocks it loose: the stuck card becomes dynamic again with 30% of the hitter's sideways and vertical velocity, 1.2 units/s away from the wall and a little spin, and falls back onto the stage. The hitter bounces off and does not bite. Ripple letters and soft hits do not knock anything out (tested). The wall's type sends a small ring where it happens.
- **Why:** answers Kiwi's expectation, and it is a third way out of a lockout (after the pull beating the stick, and Ripple wall stress), in the hands of the player: Stick commits, but a sharp, hard throw can undo a commitment.
- **Contact priority:** a card touching another card and the wall in the same step now counts the card first, then the wall, then the room. Without this, a hitter striking a stuck letter sometimes registered the brick behind it first and bit in on top of it.

### Nothing gets behind the wall
- **Decision:** the side boundaries meet the wall's edges (x = ±6.05 against a wall half width of 6.0, was ±6.4, a 0.4 gap a letter could slip through) and the back boundary sits right behind the wall (z = -12.35, was -14). A letter that bounces over the top now comes to rest on top of the wall, in sight and holdable, instead of falling out of reach behind it. Tested with throws at the wall's corners and top.

### The magic stage (Kiwi: "our playing field is a magic stage")
- **Decision:** the green card table becomes a stage in a dark auditorium:
  - **Floor:** plain dark stage boards (`#241a15`), the one surface that is not a letter, as the felt was.
  - **Backdrop:** the wall, near black (`#151114`) with warm ivory type, so the cards and the marquee words read.
  - **Curtains:** red velvet made of letters: about 1,500 small letters of the phrase (cap 0.3) hung in strands 0.15 apart, folded along a sine and turned with the fold so they catch the light, drawn open at both sides of the backdrop, with a scalloped swag across the top. Instanced, decoration only, no colliders.
  - **Marquee bulbs:** small glowing Os framing the backdrop, chasing in turn (every third dim, stepping 5 times a second). Unlit, so they glow.
  - **Lighting:** dim house light, a key spot from the rig above casting the shadows, two warm washes on the backdrop, and a soft front fill standing in for footlights so the hand of cards at rest always reads.
  - **Side lanes:** dark wood colour, still streaming type toward the backdrop.
- **Palette:** the felt green is gone; the cards keep ivory with oxblood edges; amber stays reserved for locked words. The brief allows Kiwi to override the palette.

### The backdrop no longer spells the answer
- **Observation (Kiwi):** a backdrop that scrolls ART OF PLAY gives the word away, which works against the decoys.
- **Decision:** the big marquee words are words of the show, spelled only with the letters of ART OF PLAY, so rule 1 holds (and the font file only carries those letters): TAROT, TRAP, FLOAT, PARLOR, PROP, PORTAL, RAPT, PARROT, LOFT, ROYAL, TOP. Never ART, OF or PLAY, nor words containing ART (PARTY was rejected for that). Each alludes to the act: tarot cards, the trap door, levitation, parlour magic, props, the vanishing portal, a rapt audience, the magician's parrot, the fly loft, the royal flush, the big top. They also work as misdirection, like the decoys.
- **Decision:** the small cells now show letters picked by a hash of their position, each re-picking now and then, so the background type never spells the phrase either.
- **Alternative offered to Kiwi:** words with letters outside the phrase (SHOW, MAGIC, CIRCUS) would need an amendment to rule 1 and a regenerated font file.

## 2026-10-25, shuffled hand, opening, words need an anchor (Kiwi's direction)

### Decoys faster again
- **Decision:** first shed after 5 s of play (was 8), then every 4 to 8 s (was 6 to 12). Up to 4 decoys alive at once (hand and shed together; ids 9 to 13 reserved).

### Words only form from a stuck anchor (resolves E8)
- **Decision:** `WORD_RULES.requireAnchor = true`. A word with no stuck member gets no slots: its correct pairs can still be warm (the hint), but nothing pulls and nothing locks. The brief's leader rule is kept in the function behind `requireAnchor: false`, and the unit tests exercise pair, slot and lock mechanics through it, plus new tests for the anchor rule (a pair lying in its exact slots on the table never becomes ready).
- **Why warmth stays:** it is the hangman feedback. A warm pair that will not join on the table teaches that words need the backdrop.

### The shuffled hand
- **Decision:** at the start of every round the hand is a seeded random order of the nine letters plus 1 or 2 decoys (`DECOYS.inHandMin/Max`), redrawn until no hint pair (AR, RT, OF, PL, LA, AY) sits side by side (`shuffleHand` in `src/staging/opening.js`; tested over 300 seeds). Word gaps are dropped; the hand is squeezed to at most 6.8 units of arc so 11 cards still fit (they overlap more, like a real hand).
- **Decoys in the hand** are dealt like any card, show the faint tell at rest, and only start ageing once played.
- **Consequence:** the fan no longer reads ART OF PLAY at rest (brief 4.1, 6). The finale is now the reading moment.

### The opening (staging, 4d)
- **Decision:** each round opens with:
  - a fade from black over 1.2 s (an overlay above the canvas, below the credit);
  - a camera push-in from 1.6 units back (and a little up) over 2.8 s, looking at the same point;
  - the dealer's shuffle, played on kinematic bodies from keyframe tracks: the deck sits in reading order (decoys on top), splits into two halves (0.55 s), riffles back onto the pile one card every 0.075 s, then deals into the hand left to right one card every 0.1 s, each move a 0.32 s hop arcing 0.45 up. About 3.3 s with 11 cards.
- Nothing can be held until the deal ends. The play clock (and so decoy shedding) starts at the first hold, as before.
- `startRound()` builds a round: it clears decoys, locks and the finale, reshuffles from a new round seed, and plays the opening. The dev panel's button now reads "new round (shuffle and deal)"; M4's quiet and collapse resets will call it.
- **Tests:** shuffled hands are permutations, seeded, free of hint pairs; tracks start every card on the deck, split it in two, deal left to right and end each card in its slot; the fade and push run 1 to 0; a real round deals 9 plus 1 or 2 decoys, blocks holding until the deal ends, and settles every card in its slot; hand decoys do not age; a new round deals a different shuffle.
- **Test sessions** start from a known hand (reading order, no hand decoys, no opening) unless they ask for the real round, so the throw, effect and sequence measurements stay comparable.

## 2026-10-25, M4 (wall decay and resets)

### The decay scheduler (4c)
- **Decision:** `src/wall/decay.js`, seeded per round. D starts at 0, rises 1/150 per second once a 40 s grace period of play has passed (play starts at the first hold), and drops by 0.25 when a word locks. Scheduled events come every lerp(9, 2.5, D) seconds (+/- 20%), each a cluster of 1 to 4 neighbouring bricks (1 + round(3D)). The first brick of a cluster is drawn at random, weighted by 1 + 3 x its Ripple stress.
- **Respite:** a lock stops scheduled events for 20 s.
- **Stress releases (lockout mitigation b):** a brick whose Ripple stress reaches 1 (about three Ripple hits on it) goes on its own, grace period and respite notwithstanding.
- **Immunity:** bricks behind a locked word's letters (within 0.6 x and 0.55 y of a locked letter near the wall) are never chosen.
- **Paused:** before play, during the opening, in the finale and while resetting.
- Brick count stays 180 (20 x 9). Expected pace from the parameters (not playtested): the first scheduled bricks fall at 40 s of play; a round left to decay collapses after a few minutes.

### Telegraph and release
- **Telegraph:** a chosen brick shudders for 0.6 s: in the backdrop's type, its 5 x 4 block of cells jitters sideways and flickers (render only; the brick is still fixed).
- **Release:** the brick becomes an ordinary dynamic body with 1 unit/s outward. Found while testing: with ordinary friction it slid 0.12 and rested on the brick below (Rapier averages the two frictions), and its tipping spin jammed it against the back boundary, which also overlapped the wall's back face by 0.05. A released brick is now slick (friction 0.1, combined by the minimum), gets no spin, and the back boundary moved to z = -12.42, clear of the wall. It now slides out and falls. Cards stuck to it come away with it (tested).
- **Visuals:** the brick's cells vanish from the backdrop, leaving a dark hole to the house behind, and the brick falls as its own block carrying the moving type. A rebuild removes the loose blocks.
- **Contacts:** a Stick letter can only bite a standing brick; a falling or fallen brick is something to bounce off.

### Resets (4d)
- **Quiet reset:** once play has started, 25 s with no hold or throw starts a reset (also after the finale). It never starts while a card is held, and never before play has started, so a page left open does not keep re-dealing.
- **Collapse reset:** when 60% of the bricks have fallen.
- **Sequence:** fade to black over 0.9 s (nothing can be held), then the wall is rebuilt (every brick fixed in place, stress cleared, D back to 0, a new decay seed) and `startRound()` deals a new round, whose opening fades back in with the camera push and the dealer's shuffle.
- **Checked in the browser:** a dev reset faded out over 0.9 s, rebuilt the wall (10 fallen bricks back to 0) and played the opening; no console errors.

### Tests
- `test/decay.test.js`: the scheduler alone (silent during grace; reproducible by seed; D, cluster size and rate grow; clusters are neighbours; a lock lowers D and silences events for the respite; ineligible bricks are never picked; Ripple stress releases a brick even during grace); and in the game with real Rapier (bricks shudder then fall after grace; a stuck letter falls with its brick; bricks behind a locked word stay standing through 160 s of decay while more than 10 others fall; a lock grants the respite; quiet reset rebuilds the wall and restarts the round; no quiet reset before play; never while holding; collapse reset at 60%).

### Dev tools
- "Decay and reset" folder in the dev panel (grace, rise, intervals, cluster size, telegraph, respite, collapse fraction, quiet seconds; "drop a brick now", "reset now"); the readout shows D, the next event, fallen bricks, the quiet timer and any reset in progress.

## 2026-10-25, letters clinging together; the hand in two rows (Kiwi's report)

### Cause 1: the warm hint moved the bodies
- **Observation (Kiwi):** a letter that fell to the floor sometimes stuck together with another.
- **Measured:** a correct pair (O then F) lying 1.0 apart on the floor walked onto each other in about 5 s: the warm hint's rattle spun them at up to 6.8 rad/s and its lean force pushed them together until they overlapped and hooked; lifting the O then dragged the F 3.1 units. A pair that is not a word pair (T, O) did not move at all.
- **Decision:** the warm hint is now render only for every letter, as it already was for stuck ones: the mesh trembles (up to 7 mm) and leans toward its partner (up to 3.5 cm, tipping up to 0.06 rad); the body never moves for it. This also removes a non-physical force from the simulation (4b is now: the pull, plus a purely visual hint).
- **Tested:** the same warm pair now stays 1.0 apart for 6 s, and lifting one leaves the other where it was.

### Cause 2: strokes could pass through another letter's counter
- **Measured:** a T knocked loose by an A ended up hooked to it; lifting the T dragged the A 3.4 units. Each letter's collider is a set of boxes with its counters left open (so letters bite and land precisely), and a stroke of one letter could pass through the open counter of another and lock the two like rings.
- **Decision:** each card now has a second collider, its solid outline (the convex hull of its glyph outline, counters filled, no mass). Cards touch each other only through these outlines; they touch the wall, floor and room only through their detailed boxes (`src/physics/groups.js`). Two convex shapes cannot interlock.
- **Approximation, stated plainly:** letters now bounce off each other's empty space (a letter cannot sit inside an O's counter). Against the wall and floor nothing changes.
- **Tested:** in 8 knock-out cases, lifting one letter afterwards never moved the other by more than 1.3 cm (3 kept as regression tests).

### The hand in two rows
- **Observation (Kiwi):** with 10 or 11 cards the fan was too tightly packed.
- **Decision:** a hand of 8 or more cards is dealt in two rows, one above the other: the back row (the first half of the hand order) 0.62 higher and 0.3 further away, shifted 0.42 left; the front row below and in front, shifted 0.42 right, so back-row letters show between front-row ones. Within a row the cards overlap less (0.86 of their mean advance, was 0.64). The deal fills the back row left to right, then the front row.
- **Trade-off:** the back row's tops reach about 58% down the screen (the single row reached 72%), so the hand now covers a little more of the middle of the stage; the stage near the backdrop stays clear.
