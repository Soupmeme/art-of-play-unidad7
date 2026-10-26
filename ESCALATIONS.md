# Escalations

Items that could change the concept or the grade (brief, section 3). Status: open, resolved (with who and when).

## E1. Lockout will be the normal outcome during exploration
- **Raised:** 2026-10-25, before M0.
- **Observation (reasoning, not yet tested):** ART has two Stick letters (A, T), PLAY has two (L, A). Early throws will scatter all five Stick letters across the wall, and two stuck letters almost never land at the exact spacing their word needs. Without help, ART and PLAY become unsolvable in the first minute, with only slow, random decay as a way out.
- **Resolution:** Kiwi, 2026-10-25: accept the mitigation in DECISIONS.md ("Lockout mitigation"): the pull beats embedding, and the Ripple wall-shake clears anchors from the start. Verify with the scenario runner at M3.
- **Status:** resolved, pending verification.

## E2. Embed look (face-flat vs edge-first)
- **Raised:** 2026-10-25. **Resolution:** Kiwi chose face-flat with in-plane spin and a stylized Curve force. **Status:** resolved.

## E3. Air drag as honest physics
- **Raised:** 2026-10-25. **Resolution:** Kiwi agreed uniform quadratic drag counts as physics, not a fifth non-physical behavior. **Status:** resolved.

## E4. Tremble on stuck letters
- **Raised:** 2026-10-25. **Resolution:** Kiwi agreed to a render-only micro tremble on welded letters, documented under rule 4b. **Status:** resolved.

## E5. Table, rails and brick colliders under the letters-only rule
- **Raised:** 2026-10-25. **Resolution:** Kiwi agreed: felt ground plane, rails of letter-bricks, box colliders under letter-shaped bricks. **Status:** resolved.

## E6. Wall and side lanes not built from letter-bricks
- **Raised:** 2026-10-25 by Kiwi, who found the letter-brick wall and rails too literal.
- **Resolution:** Kiwi directed solid oxblood surfaces with an animated text-mode type pattern of ART OF PLAY. Amendment to rule 1 recorded in CLAUDE.md; details and the M4 decay consequence in DECISIONS.md.
- **Status:** resolved.

## Tuning watch list (not escalations yet)
- quietSeconds at 25 s may wipe progress for a player who pauses to think.
- Ripple restitution: O and Y may bounce out of a pull too fast to be captured. (M3: in scripted runs a hard O and Y were captured beside their anchors.)
- Discoverability: whether a fresh player brings a correct pair close enough to see a warm tremble within about two minutes.
- Throw spin (M3): sideways flick speed sets spin, so aiming far to the side by flicking diagonally adds spin, which bends R and P. Watch whether players learn to carry first and flick straight; if not, consider spin from flick curvature (DECISIONS, M3).

## E7. Decoy letters
- **Raised:** 2026-10-25 by Kiwi, to make the word harder to figure out.
- **Resolution:** Kiwi chose wall-shed decoys with a graded tell, as inert noise. Amends the brief's "do not duplicate letters" (the nine stay exactly nine and always solvable) and adds rule 4 item (e). Recorded in CLAUDE.md; details in DECISIONS.md.
- **Status:** resolved.

## E8. Words can form trivially in front of the hand (open)
- **Raised:** 2026-10-25, by Claude, found while testing the stage build.
- **Observation:** a word with no anchor locks wherever its letters lie in order (brief 5.5: "if it has none, the leader is the member nearest the group's centroid"). Letters dropped from the hand land on the stage right in front of the fan, roughly in fan order, so dropping A then R then T beside each other assembles ART without throwing anything. Verified headless: O and F lying 1.1 apart in order stand up and lock (test/sequences.test.js, "no anchor"). This undercuts Kiwi's aim of making the word harder to figure out.
- **Proposal:** words only form at the backdrop. Either (a) a word needs a stuck anchor before anything pulls (drop the leader rule), or (b) pulling only happens near the backdrop (for example deeper than z = -9). (a) is the simpler rule to explain: "Stick commits; a word grows from a letter in the wall." Both are a change to brief 5.5, so Kiwi decides.
- **Status:** open, waiting on Kiwi.
