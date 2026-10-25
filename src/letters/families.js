// The letter-to-family table (brief 5.4). Data only, so it can be retuned.
// Each assignment is justified by the letter's anatomy. Every word must hold
// at least one Stick letter so it has an anchor (tested).

export const FAMILY = Object.freeze({
  stick: 'stick', // commits: bites into the wall
  curve: 'curve', // reaches: hooks in the air
  ripple: 'ripple', // repairs: bounces and nudges neighbours
});

export const FAMILY_OF = Object.freeze({
  A: FAMILY.stick, // a pointed apex and two splayed feet that bite
  T: FAMILY.stick, // a flat bar on a stem, like a blade's edge
  F: FAMILY.stick, // flat bars and a square terminal
  L: FAMILY.stick, // a stem and a flat foot, a hard corner
  R: FAMILY.curve, // bowl and stem plus a kicking leg: hooked and lopsided
  P: FAMILY.curve, // bowl on one side of a stem: lopsided, catches the air
  O: FAMILY.ripple, // round and closed: rolls off and sheds its energy outward
  Y: FAMILY.ripple, // open arms that flex and spring back
});

export function familyOf(char) {
  return FAMILY_OF[char];
}
