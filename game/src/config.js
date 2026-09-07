/**
 * LANTERN RUN — tuning. One place, so a critic round can name a number and a fix agent can find it.
 * Palette hexes are copied from /Users/atlas/jam_test/STYLE-LOCK.md and must not drift from it.
 */

export const PALETTE = {
  surroundDark:  0x1b1e22,
  coolSteelDark: 0x2a2f35,
  stainless:     0x8f9aa3,
  galv:          0x5a6169,
  timber:        0xa9784f,
  timberDark:    0x6d4a2f,
  marketRed:     0xc4442f,
  boneCanvas:    0xe8dcc0,
  jade:          0x2f7a6a,
  tarpBlue:      0x1d5f8a,
  warmBulb:      0xffb45a,
  coldNeon:      0x63e0ff,
  brass:         0xd8cf7a,
};

export const LANE = {
  width: 7.0,          // metres, clear running width
  halfWalk: 3.2,       // |x| the player may reach
  bayInner: 3.5,       // stalls start here
  bayOuter: 5.7,       // and end here
  blockLength: 22,     // metres per streamed block
  blocksAhead: 7,      // how many blocks are alive in front of the player
  blocksBehind: 2,
  length: 1100,        // metres to the river gate
  canopyHeight: 3.6,
  lanes: [-2.1, 0, 2.1], // the three running lines
};

export const PLAYER = {
  height: 1.75,
  baseSpeed: 9.0,      // m/s at full run
  startSpeed: 6.5,
  accel: 3.2,
  brakeOnHit: 0.62,    // fraction of speed kept when you clip something.
                       // Was 0.45. On a phone viewport one clip was fatal: the runner dropped to
                       // 5.6 m/s against a pursuer surge of 11 and was caught before recovering,
                       // twice in three runs, at 33 m and 87 m of a 1100 m lane. A touch player
                       // reacts slower than a keyboard one and will clip more, not less.
  strafe: 7.5,         // m/s sideways
  vaultHeight: 1.05,
  vaultTime: 0.55,
  slideTime: 0.7,
  slideHeight: 0.85,
  stumbleTime: 0.6,
};

export const CHASE = {
  count: 3,
  startGap: 14,        // metres behind at the start
  speed: 8.6,          // slightly slower than the player at full run
  surge: 10.0,         // when the player is slow they close fast. Was 11.0; see PLAYER.brakeOnHit.
                       // The cost of a hit has to be felt and survivable, and 11.0 against a
                       // 9.0 top speed made it unsurvivable on touch.
  minGap: 1.4,         // caught
  maxGap: 34,
  toppleCost: 1.6,     // seconds a toppled stack costs a pursuer
  camera: { back: 5.2, up: 2.35, look: 3.2, fov: 68, fovSprint: 76 },
};

export const SCORE = {
  perMetre: 1,
  perDodge: 25,
  perVault: 40,
  perTopple: 60,
  perLantern: 100,
};

export const BUDGET = { draws: 900, tris: 1_700_000 };

// Night. rig.js is a daylight rig with a night keyframe at elevation -8; hour 21 with these
// sunrise/sunset numbers lands on it. Everything warm in this game comes from practicals.
export const NIGHT = {
  hour: 21,
  azimuth: 300,
  sunrise: 6,
  sunset: 18,
  exposure: 1.15,
  fogStart: 12,
  fogDensity: 0.0125,
  practicalBudget: 14,   // how many real point lights are alive at once
  practicalRange: 9.5,
};
