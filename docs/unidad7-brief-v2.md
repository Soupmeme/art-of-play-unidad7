# BRIEF v2: Unidad 7, "Word as a Playable System" (Art of Play, thrown letters)

Audience: Claude Code, working autonomously in a fresh repo. Owner: Kiwi.
Read this whole document before writing code. Copy section 2 ("Hard rules") verbatim into the repo's CLAUDE.md so it is never forgotten.

This brief REPLACES the earlier "force" concept (face-down cards, positional assignment, flip verb, reveal staging, the tell). Nothing from that concept is to be built. The organization, the attribute, the context of use and the grading context are unchanged.

---

## 0. Why the concept changed

The first version was efficient at conveying the attribute but boring: all the delight lived in one reveal the system performed for the visitor, and nothing between throws had personality or answered back. A game has to be fun moment to moment. The new concept makes the visitor the magician: every throw produces a visible, characterful consequence, and the fun is in learning what each letter does and then chaining them on purpose.

Design principle to protect throughout: every action gets a legible reaction within about a second, and the reactions follow a hidden logic the player can deduce and then use. Charm without a deducible logic is a toy, and does not serve the attribute.

---

## 1. Context

### 1.1 The course and the commission

Course: Simulacion (Universidad Pontificia Bolivariana), Unit 7, "Tipografia jugable: Word as a Playable System", aligned with chapter 6 of The Nature of Code (physics libraries). Unit page (Spanish): https://juanferfranco.github.io/simulacion-2026-20/units/unit7/ . Worth 12.5% of the course grade.

The commission (translated): design and build, with web technologies, a small playable typographic system. Use the letters of a company or organization's name so that a person can explore a specific attribute of its identity through their actions and the system's responses. "Playable" means a person can explore, experiment and discover relationships through their actions. It can rest on a few rules and an open experience. The graphic elements that build meaning must come from the letters (Ji Lee's "Word as Image" rule: no external parts added).

Tools allowed by the unit: forces, oscillation, particles, steering, flocking, flow fields, plus physics libraries (the unit points to Matter.js with p5.js, and Rapier with Three.js). No restriction to a subset of behavior families.

### 1.2 Presentation and grading

Kiwi shows the system running and invites a classmate to play BEFORE explaining anything. The classmate says what they tried, discovered and how they read the responses. Only then does Kiwi explain the organization, attribute, context and how typography, rules and actions let the player explore that identity.

Self-evaluation, defended live, four criteria of 25 points:
1. Task fulfillment: uses the letters of an organization's name, is playable, runs in real time on the web for the defined context.
2. Understanding and verification: Kiwi can explain and justify the model, its states and rules, and can predict and verify the effect of changing a rule or parameter.
3. Interaction and identity: Kiwi can justify what the actions and consequences let you discover about the attribute, and contrast it with what playtests with other people showed.
4. Typographic resolution and play experience: composition, rhythm, reading moments and perceptible responses let people explore the system and sustain its intention.

Engineering implications: everything must be explainable by a student in an oral defense; prefer the simple, legible version of any rule; every parameter has a documented, predictable effect; playtests with other people are part of the deliverable, so the build must be playtest-ready early.

### 1.3 Decisions made by Kiwi (do not reopen)

- **Organization:** Art of Play, a curated house of designer playing cards, puzzles and curiosities, founded in 2013 by twin brothers Dan and Dave Buck, sleight-of-hand magicians and pioneers of cardistry. Audience: magicians, cardists, collectors and the card-curious.
- **Attribute:** the wonder of figuring it out. Magic as something you can learn, not only watch. Kiwi will source and cite the founders' own language in the logbook.
- **Context of use:** an interactive homepage hero on artofplay.com. One visitor, desktop, mouse, no instructions, time to explore.
- **Format:** 3D (Three.js for rendering, Rapier for physics, both named by the unit).
- **Core concept:** the nine letters of ART OF PLAY are a fan of thrown cards in front of the camera. The player throws them at a wall some distance away. Each letter's anatomy decides what it does when thrown (a small set of effect families, section 5.4). The phrase resolves through play: letters that are brought near their correct neighbors, in reading order, react to each other and pull together, word by word.
- **Verbs:** two only: hold (pull a letter from the fan, carry and aim it) and throw (release it). The old flip verb is dropped.
- **Pressure:** soft. The wall slowly crumbles. No visible clock, counter or text.
- **Recovery:** automatic reset after a long quiet period.
- **Discovery arc to support:** fooled or puzzled, then suspicious (the letters seem to behave differently), then in control (the player chains effects on purpose to spell the words).

---

## 2. Hard rules (copy into CLAUDE.md)

1. All graphics that carry meaning come from the letters of ART OF PLAY. The cards are letter-shaped (die-cut: the card silhouette IS the letterform, thin like a card, not a rectangle with a letter on it). The wall is built from small letter-bricks. Card edges, backs, wall texture and any ornament are built from repeated, rotated or scaled letterforms of the phrase. No suit glyphs, no illustrations, no hands, no logos or brand assets from Art of Play. Emissive glow, lighting and particles made of tiny letters are fine; sprites or shapes that are not letters are not.
2. Two player verbs only: hold and throw, performed with the mouse (press to hold, move to carry and aim, release to throw). No extra buttons, keys, menus, timers or tutorials in the play view. Debug and tuning tools are hidden behind a dev toggle.
3. No on-screen explanation of the method. The visitor discovers it by playing. No text in the play view beyond, at most, an invitation-level hint Kiwi approves.
4. The physics must be honest. Motion comes from the physics engine, never from canned tweens that fake throws, flight, bounces or landings. The only non-physical behaviors are exactly these, and each must be documented as such in code and EXPLAINER.md: (a) the letter effect rules (5.4), which are forces and constraints layered on real physics; (b) the word pull (5.5), an attraction force that is deliberately stronger than gravity near correct neighbors; (c) the wall decay scheduler (5.6); (d) the reset and finale staging (5.7). Nothing else.
5. Real time on the web, 60 fps target, works full window as a hero section.
6. Not an official Art of Play page. Visible "student concept, not affiliated with Art of Play" credit. No real logo, navigation, typeface files or product photography.
7. Never invent playtest results, predictions marked as verified, or self-evaluation scores. Those belong to Kiwi.
8. No em dashes in any prose (docs, comments, commit messages, logbook). Use commas, colons or parentheses.

---

## 3. Autonomy and escalation

Decide yourself, and log each non-trivial decision in DECISIONS.md (date, decision, alternatives, why): bundler, file layout, collider construction per letter, all numeric tuning, the open-licensed typeface (SIL OFL or similar, with the presence of a classic playing card or luxury deck: serif or engraved feel, not a generic UI sans), card thickness and proportions, brick count and size, lighting, palette (restrained, card-like, two inks on a paper or felt ground; Kiwi may override), camera framing, the mapping from 2D mouse motion to a 3D throw, debug overlays, test design.

Escalate (write in ESCALATIONS.md, keep working, do not block) ONLY when the answer would change the concept or the grade:
- Anything that adds a verb, a visible UI element, a timer, a counter, sound, or any text in the play view.
- Changing what a word resolving means, or adding a behavior that is not covered by the four non-physical items in rule 4.
- If the letters-only rule cannot be satisfied for some element while staying readable.
- If early prototypes show the method is not discoverable within about two minutes by a fresh player, or is discovered instantly. Report what you observed, then propose the change.
- Large dependencies beyond Three.js, Rapier and a bundler.

Do not ask about anything else. Pick a sensible default, log it, move on.

---

## 4. The experience, beat by beat

1. **Rest (reading moment).** The page loads. The camera looks over a table toward a wall made of small letter-bricks. At the bottom of the view, close to the camera, the nine letters are fanned in reading order like a hand of cards, legible as ART OF PLAY. Nothing moves except a subtle idle (the fan breathes slightly).
2. **Hold.** Pressing on a letter lifts it from the fan. It follows the pointer and can be carried and aimed.
3. **Throw.** Releasing with speed throws the letter toward where the cursor points, with the flick speed setting power and the flick shape setting spin. Releasing slowly just drops it.
4. **Consequence.** The letter flies, spins, hits the wall (or misses and lands on the table). What happens on impact depends on the letter (5.4): it bites in, it curved on the way and clips in, or it bounces and sends out a ripple.
5. **Retrieval.** Letters that land on the table can be held and thrown again. Letters stuck in the wall stay there.
6. **Warmth.** When two letters that belong next to each other (in reading order) are close, they react: a faint lean and tremble toward each other, stronger the closer they are. This is the "hangman" feedback, with no text.
7. **Pull.** When correct neighbors are close enough and in the right order, they are drawn together into position and lock. First pairs, then words: ART, OF, PLAY. Each locked word is a small payoff.
8. **Pressure.** Meanwhile, bricks occasionally shudder and fall from the wall. Anything stuck to a fallen brick falls with it. A word that is locked is safe.
9. **Finale.** When all three words are locked, the phrase ART OF PLAY is presented as one line (5.7). The player has "performed the trick".
10. **Reset.** After a long quiet period, the scene resets and the fan is full again.

Arc the design must support: the first throws are exploration (what does each letter do?), the middle is suspicion (the A sticks and the R curves; the duplicate A behaves like the first A, so the rule is about the letter, not the card), and the end is control (stick the anchors precisely, curve the rest into place, nudge with ripples).

---

## 5. Model specification

### 5.1 World and camera

- Fixed camera, slightly above the table, looking toward the wall. Perspective, modest field of view. A very slight idle sway is allowed. The fan sits at the bottom of the view.
- Table: a surface between the camera and the wall, with low rails or side walls so letters do not fall into the void. Wall: a vertical grid of letter-bricks (suggested 120 to 300 bricks, log the number) at a distance of roughly 8 to 12 card heights.
- Gravity down, light friction and restitution tuned so thrown letters feel like thin cards (sail, flutter, skid), not balls or bricks.
- Each brick is a rigid body, fixed until the decay scheduler releases it (5.6). Render bricks with instancing. Keep the physics scene small: 9 letters plus the bricks.
- Letter colliders: convex hulls or small compound boxes per letterform, an approximation (for example the hole of A, O, P, R is filled by a hull). State this plainly in EXPLAINER.md. Prefer a compound of a few shapes where the approximation would visibly hurt (O).

### 5.2 Entities

Nine letters (A, R, T, O, F, P, L, A, Y; the two As are interchangeable in identity), each a thin extruded letterform with a rigid body. Each letter has a `family` (5.4) and a `status`: `inFan`, `held`, `flying`, `onTable`, `stuck`, `locked`.

### 5.3 Verbs

- **Hold:** press on a letter (raycast) to grab it. A held letter follows the pointer through a kinematic or constraint-driven target on a plane in front of the camera. It cannot be forced through the wall. Letters in the fan, on the table and in flight are holdable if reachable (flying ones are not). Stuck and locked letters are not holdable.
- **Throw:** on release, the letter gets a launch velocity along the ray through the cursor, with speed from the recent pointer velocity (smooth over about 60 to 100 ms), clamped, plus spin derived from the flick (for example the lateral component of the recent pointer motion). Below a speed threshold the release is a drop, with no launch boost. This 2D-to-3D mapping is the biggest feel risk in the project: spend time on it, expose its parameters in the dev panel, and log the final mapping. The mapping must be learnable: a player should be able to predict where a throw lands after a few tries.

### 5.4 Letter effect families (three, derived from letter anatomy)

Each family is a short, defensible rule layered on real physics. The letter-to-family table is data (one file), so it can be retuned.

Proposed mapping (Claude Code may adjust after prototyping, but every assignment must be justified by the letter's shape, and every word must contain at least one Stick letter so it has an anchor):

| Family | Letters | Anatomy rationale | Rule |
|---|---|---|---|
| Stick | A, A, T, L, F | points, bars and flat terminals that bite | On first contact with the wall, if impact speed is above a threshold and the angle is within a cone of the wall normal, the letter embeds: it is joined by a fixed constraint to the brick it hit and becomes `stuck`. Below the threshold it bounces off like any card. If the brick later falls, the letter falls with it. |
| Curve | R, P | bowl and stem: a hooked, asymmetric shape that bites the air | In flight, add a lateral force proportional to spin times velocity (a Magnus-style force, deliberately exaggerated by a per-family gain). Aim becomes a skill: a curving throw can reach around an anchor. On wall contact it bounces or clings weakly, no embed. |
| Ripple | O, Y | round and open shapes that bounce and shed energy | On impact, bounce with higher restitution, and apply a radial impulse to letters within a radius, with 1/d falloff, to nudge neighbors. Optionally (parameter, default on, mild) the impact also shakes nearby bricks, increasing local decay (5.6): nudging has a cost. |

Roles for the player to discover: Stick commits (precise, permanent anchors), Curve reaches (skill shots), Ripple repairs (nudges letters into place, at a cost to the wall). Do not add splitting, duplication or deletion of letters: the phrase is exactly nine letters, so creating or destroying them would make it unsolvable.

### 5.5 Word resolution (the hidden rule, the hangman moment)

Keep this as a pure function, separate from rendering and physics, so it can be unit tested and explained. It takes plain data (letters with positions, orientation, status) and the camera's right axis, and returns, per word, a state and a set of target slot positions.

Words are resolved separately: ART, OF, PLAY. This gives three small payoffs and also solves word spacing, since each word gathers in its own place.

- **Slots and order.** Each word has ordered slots. "Order" means increasing position along the camera's right axis (reading order as the player sees it). A letter may serve a slot only if its letter matches.
- **Duplicate A.** Both As are interchangeable. A letter may be assigned to ART slot 0 or PLAY slot 2. Resolve with a documented rule (for example greedy by lowest total distance across both words, locked words reserve their letters first). Test this thoroughly.
- **Anchors and leaders.** Stuck letters are anchors: they never move. Words gather around them. If a word has a stuck member, its slots are laid out from that member's position. If it has none, the leader is the member nearest the group's centroid.
- **Warm (hint).** For each adjacent correct pair (in correct order), if the distance is below `hintRadius`, both letters tremble and lean toward each other with an amplitude that rises as the distance falls. Pairs in the wrong order show nothing. There is no repulsion and no negative feedback: cold is just silence.
- **Pull.** If an adjacent correct pair is below `pullRadius` (smaller than `hintRadius`), in order, and roughly at the same depth, apply an attraction force on the non-stuck member(s) toward their slot, strong enough to overcome gravity, with damping so it still reads as physical. Also apply a gentle torque so the letter turns to face the camera and stands upright. This force is the one deliberate piece of magic (rule 4b).
- **Lock.** When all adjacent pairs of a word are within `snapDistance` of their slots and aligned, the word locks: the members are joined by fixed constraints (and to the wall bricks if there is an anchor), they glow slightly (emissive change, not an added shape), and they are immune to decay, ripples and holding.
- **Lockout is allowed to happen.** If anchors are stuck too far apart or in the wrong order for their word, that word cannot complete. The only ways out are the wall crumbling away the offending anchor or the reset (5.7). This is intended: it makes anchoring a commitment.

### 5.6 Soft pressure: the wall decay scheduler

The wall is the clock. There is no UI for it. Decay is a scalar `D` in [0, 1] that rises slowly with time and falls on progress.

- After a grace period (default about 40 s from the start of play), the scheduler picks seeded clusters of bricks. Each chosen brick shudders for a short telegraph (default 0.6 s, so the player can see it coming), then is released and becomes a dynamic body that falls physically.
- The number of bricks per event and the rate rise as `D` rises. Locking a word grants a respite (default 20 s without events) and lowers `D`. Ripple impacts add local decay if the optional shake is on.
- Letters stuck to released bricks fall with them. Locked words are immune.
- The scheduler is the only non-physical trigger in the wall and must be a documented, seeded function of time, `D` and the seed.
- If more than a threshold fraction of the bricks has fallen (default 60%), the scene resets (5.7).

### 5.7 Reset and finale (staging)

These are the only choreographed moments and must be documented as such.

- **Quiet reset:** if there has been no hold or throw input for `quietSeconds` (default 25 s, tune with playtests), or if the wall has collapsed past its threshold, the scene resets: letters return to the fan, the wall is rebuilt, `D` returns to 0, the seed advances. Implement it simply (for example a fade or scale-out and in of letters and bricks, or a quick physical re-spawn). Choose the least ugly option that is not a fake throw, and log it. The reset must never trigger while the player is actively holding a letter.
- **Finale:** when all three words are locked, present them as one line, ART OF PLAY, with word gaps: the words move into a shared line (the one place where a kinematic move is allowed), light up slightly, and hold for a few seconds. The wall stops decaying during the finale. The reset then follows the normal quiet rule. Keep it brief and restrained: the reading moment is the payoff.

### 5.8 What is physics, what is magic (for the defense)

Document in EXPLAINER.md, in plain words, and mirror it in the code structure (suggested folders: `physics/`, `letters/effects`, `words/resolve`, `wall/decay`, `staging/`, `render/`):
- Physics (honest): bodies, gravity, collisions, friction, restitution, the held-letter constraint, flight, bounces, falling bricks.
- Letter effects (forces and constraints on top of physics): Stick, Curve, Ripple.
- The word function: pure rules that decide warmth, pull and lock.
- Decay and staging: the scheduler, the reset, the finale.

---

## 6. Typography and look

- Each letter card is a die-cut extruded letterform in the chosen typeface, thin like a card. Faces carry small repeated letter ornament (a tiny border or corner repeats of the same letter) built only from the phrase's letters. Backs and edges can use a pattern tessellated from the phrase's letterforms.
- The wall is a field of small letter-bricks, dense enough to read as a wall and as a texture, with enough contrast against the letters that the big letters read at a glance.
- Lighting: restrained, with soft shadows so the thin letters read as objects in space. Palette: card-like, two inks on paper or felt, with the glow of locked words as the one accent.
- Reading moments must be designed: the fan at rest reads ART OF PLAY, and the finale reads ART OF PLAY.

---

## 7. Verification and explainability

1. Unit tests for the word function (pure, no physics): correct neighbors in correct order produce warm then pull; wrong order produces nothing; the duplicate A resolves correctly in both words; locked letters are reserved; a word with no anchor chooses a leader; a word with mis-spaced anchors reports unresolvable. Also test the decay scheduler (seeded, reproducible) and the letter-to-family table (every letter has a family, every word has at least one Stick letter). Tests must use the same data types as the runtime (lesson from an earlier unit: a permissive test stub hid a real browser bug). State exactly what tests cover and what they do not.
2. Seeded randomness for all randomness (decay clusters, idle sway, reset seed), so a scenario can be replayed.
3. Debug overlay (dev toggle, hidden by default): each letter's status, family, assigned slot, warmth; hint, pull and snap radii; the current `D` value and next decay event; time since last input; the throw mapping values.
4. A parameter sweep tool or scripted scenario runner (dev only): throws a given letter with fixed parameters from a fixed seed and records where it lands and what it does, so effect predictions can be compared with outcomes.
5. A parameter table in EXPLAINER.md: parameter, what it changes, predicted visible effect. Mark every prediction "draft, to be verified by Kiwi". Do not present any as verified.
6. A smoke check that the page runs without console errors for a few minutes of scripted interaction, if feasible. Say plainly whether it ran in a real browser, and whether Rapier physics ran for real.

---

## 8. Playtest support (criterion 3)

Create PLAYTESTS.md with a template per session: date, player (first name or alias), device, time until first throw, until they noticed letters behave differently, until they named a rule (if ever); what they said they tried; what they discovered; how they interpreted it; anything that confused or bored them; changes made afterward. Kiwi fills it in. Optionally add an opt-in, local-only dev logger that records timestamps of key events (first hold, first throw, first stick, first warm pair, first lock, first reset); never send data anywhere.

The build should be playtest-ready by the end of milestone M3.

---

## 9. Documentation deliverables

- README.md: what it is, how to run, controls (hold and throw with the mouse), credits (Art of Play as the subject, not a partner; typeface; Three.js; Rapier; Ji Lee's Word as Image as the reference rule; The Nature of Code ch. 6), and the non-affiliation note.
- EXPLAINER.md: see 5.8 and 7.5.
- DECISIONS.md and ESCALATIONS.md: see section 3.
- PLAYTESTS.md: see section 8.
- LOGBOOK.md: the course "bitacora". Record references, sketches, experiments, decisions and tests with dates. Include a self-evaluation skeleton with the four criteria (0 to 25 each), empty score fields, and an evidence list per criterion pre-filled with links to code, tests, screenshots and playtest entries. Kiwi writes the scores and reflections. Headings bilingual: English with Spanish in parentheses.

Language: English for code and technical docs.

---

## 10. Milestones

Commit at the end of each. Keep the app runnable at every commit.

- **M0 Scaffold.** Repo, bundler, Three.js and Rapier initialized, full-window canvas, fps readout behind the dev toggle. Acceptance: opens with no console errors.
- **M1 Honest physics.** Table, rails, wall of fixed bricks, the fan of nine placeholder letters, hold and throw with the 2D-to-3D mapping, tuned so thrown letters feel like cards. Acceptance: throws are predictable after a few tries; results clearly depend on how you flick; letters that land on the table can be picked up again.
- **M2 Letter effects.** The family table, Stick, Curve and Ripple. Acceptance: each effect is visible and distinguishable by a person who does not know the rule; the duplicate A behaves like the first; a scripted throw per letter shows the predicted outcome.
- **M3 Word resolution.** The pure word function with tests, warm hint, pull, lock, finale. Acceptance: ART, OF and PLAY can each be completed deliberately by someone who knows the rules; wrong order never completes; partial progress is visible; mis-anchored words stay unresolved. Playtest-ready.
- **M4 Wall decay and reset.** The scheduler with telegraph, brick release, respite on lock, quiet reset and collapse reset. Acceptance: with no input, the wall crumbles and the scene resets as configured; with active play, the reset never interrupts a held letter; locked words survive decay.
- **M5 Typographic resolution.** Typeface, die-cut letters, ornament, brick texture, lighting, palette, reading moments. Acceptance: screenshots at rest, mid-flight, mid-pull and at the finale all read as one designed piece, and the phrase is legible at rest and at the finale.
- **M6 Hero framing.** The piece sits as a homepage hero (full width, sensible behavior on resize; a minimal surrounding page is optional and must not imitate Art of Play's real site). Non-affiliation credit visible.
- **M7 Verification and docs.** Debug overlay complete, EXPLAINER parameter table, LOGBOOK skeleton, PLAYTESTS template, README. Acceptance: every rule in section 5 has a documented prediction and a way to check it.

---

## 11. Default parameters (starting values, all to be tuned by feel and logged)

| Parameter | Default | Predicted effect (draft, to be verified by Kiwi) |
|---|---|---|
| stick speed threshold | tune | Lower: more letters embed on gentle hits. Higher: only hard, square throws stick |
| stick cone | tune | Wider: glancing throws still stick |
| curve gain (R, P) | tune | Higher: stronger hook, harder to aim straight, easier to reach around an anchor |
| ripple radius and impulse | tune | Higher: nearby letters are shoved farther, more nudging power, more chaos |
| ripple wall shake | on, mild | On: nudging speeds up local decay, so rearranging has a cost |
| hintRadius | about 2.5 card heights | Larger: the tremble shows from farther away, the puzzle is easier to read |
| pullRadius | about 1.5 card heights | Larger: letters snap together from farther, less precision needed |
| snapDistance | tune | Smaller: the lock needs a tighter fit |
| decay grace period | 40 s | Longer: more time to explore before the wall moves |
| decay rate growth | tune | Higher: pressure escalates faster |
| brick telegraph | 0.6 s | Longer: easier to read what will fall, but less tense |
| lock respite | 20 s | Longer: finishing a word buys more calm |
| quietSeconds | 25 s | Shorter: resets sooner after the player stops |
| collapse reset fraction | 60% | Lower: the scene resets sooner as the wall fails |

---

## 12. Things explicitly NOT to do

- Do not add verbs, buttons, keyboard controls, timers, counters or tutorials to the play view.
- Do not explain the method anywhere a player can see it.
- Do not fake physics with tweens for throws, flight, bounces or landings.
- Do not split, duplicate or destroy letters.
- Do not draw suits, rectangles with letters printed on them as cards, hands, or anything not built from the phrase's letters.
- Do not use Art of Play's logo, real site layout, fonts or images.
- Do not add sound.
- Do not fill in playtest results, mark predictions verified, or write self-evaluation scores.
- Do not use em dashes.
