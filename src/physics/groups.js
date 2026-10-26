// Collision groups, in Rapier's packed form: (membership << 16) | filter.
// Two colliders touch only if each one's membership is in the other's filter.
//
//   world     table, room boundaries, bricks
//   card      a card's detailed shape (boxes along its strokes, counters open):
//             what touches the world, so letters bite and land precisely
//   cardHull  a card's solid outline (convex hull, counters filled): what
//             touches other cards. Two convex shapes cannot interlock, so a
//             stroke can never pass through another letter's counter and
//             hook the two together.
//   fan       cards resting in the hand: they touch nothing but the room
//             (NON-PHYSICAL, 4d: a thrown or held card passes over the hand)

export const GROUP = { world: 0b0001, card: 0b0010, fan: 0b0100, cardHull: 0b1000 };

const pack = (member, filter) => (member << 16) | filter;

export const WORLD_GROUPS = pack(GROUP.world, GROUP.world | GROUP.card | GROUP.fan);
export const CARD_IN_PLAY = pack(GROUP.card, GROUP.world);
export const HULL_IN_PLAY = pack(GROUP.cardHull, GROUP.cardHull);
export const CARD_IN_FAN = pack(GROUP.fan, GROUP.world);
export const HULL_IN_FAN = pack(GROUP.fan, 0);
