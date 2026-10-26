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
