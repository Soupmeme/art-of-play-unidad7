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
