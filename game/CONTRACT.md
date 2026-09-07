# LANTERN RUN — module contract

The lead decided this split. Every engine agent owns the files listed against its name and edits
no others. Interfaces below are fixed; if you need one changed, say so in your report rather than
changing it, because someone else is writing against it in parallel.

Game: third-person night-market chase. The player is a courier sprinting down a packed night
market lane. Enforcers chase from behind and close the gap when the player slows or clips
something. Steer between stalls, vault low obstacles, slide under hanging racks, knock over stacks
to slow the chase, reach the river gate 1100 m away. Caught = over.

## Layout

```
nightmarket/
  index.html      shell: importmap, loading screen, menus, HUD markup, touch controls  [HUD agent]
  assetlib.js     copied from the repo. DO NOT EDIT OR REWRITE.
  surfaces.js     copied from the repo. DO NOT EDIT.
  rig.js          copied from the repo. DO NOT EDIT. night.js configures it.
  night.js        night lighting: rig.js at night + the market's own practicals   [LIGHT agent]
  src/config.js   all tuning constants and the palette                            [lead]
  src/main.js     boot, the frame loop, __GAME__ telemetry                        [lead]
  src/lane.js     the level: lane layout, stall bays, placement, per-block bake   [LANE agent]
  src/player.js   the runner: movement, lanes, vault, slide, limb animation       [PLAYER agent]
  src/chase.js    pursuers and the chase camera                                   [PLAYER agent]
  src/fx.js       steam, embers, smoke, sparks, speed lines                       [LIGHT agent]
  src/hud.js      HUD, menus, start/over screens, touch input                     [HUD agent]
  src/audio.js    sfx and music playback                                          [HUD agent]
  assets/*.js     generated asset modules. Asset agents own these.
  audio/*.mp3     generated audio.
```

Everything loads with relative `./` paths. Nothing reaches above `nightmarket/`.

## Coordinates

The lane runs along **+Z**. The player starts at `z = 0` and the gate is at `z = 1100`.
`x` is across the lane: `x = 0` is the centreline, the lane is 7.0 m wide, so walkable is
roughly `-3.2 .. +3.2`. Stall bays sit outside that, from |x| = 3.5 to |x| = 5.7.
`y` is up, ground at `y = 0`.

## Interfaces

```js
// src/lane.js
export async function buildLane(THREE, scene, opts) -> {
  group,                       // added to scene by the caller
  length,                      // metres of lane built
  obstacles: [ {x, z, halfW, halfD, kind, height, group} ],   // kind: 'block'|'vault'|'duck'|'topple'
  sampleAhead(z, ahead) -> [ {x, halfW, kind} ],   // obstacles between z and z+ahead, for the gate and the AI
  emissives: [ Object3D ],     // things that glow, for the light agent to place point lights near
  lampPoints: [ {x, y, z, warm} ],  // where a practical light should go, warm=true|false
  update(playerZ, dt),         // stream blocks in/out; must be cheap
}

// src/player.js
export function createPlayer(THREE, scene, lane, opts) -> {
  object,                      // the hero Group in the scene
  update(dt, input, lane),     // input: {steer:-1..1, run:bool, jump:bool, slide:bool}
  pos: {x, y, z}, speed, lane, state,   // state: 'run'|'vault'|'slide'|'stumble'|'caught'
  screenBox(camera, renderer) -> [x, y, w, h],   // hero's box in screen pixels, for the critic
  hit(kind),                   // called when the player clips something
}

// src/chase.js
export function createChase(THREE, scene, player, lane, opts) -> {
  pursuers: [ {object, pos, dist} ],
  gap,                         // metres from player to the nearest pursuer
  camera,                      // the PerspectiveCamera. chase.js owns it.
  update(dt),
  caught,                      // true once gap <= 0
}

// night.js
export function createNight(THREE, renderer, scene, opts) -> {
  render(camera, dt),          // instead of renderer.render()
  addPractical({x,y,z,warm,intensity,range}),   // a market light; pooled and budgeted
  update(camera, dt),
  setTier(name),
}

// src/hud.js
export function createHud(handlers) -> { show(screen), set(fields), input, dispose }
//   handlers: { onStart(), onRestart() }
//   input is a live object { steer, run, jump, slide } fed by both keyboard and touch.

// src/audio.js
export function createAudio() -> { unlock(), play(name, opts), music(on), duck(x) }
```

## Telemetry, non-negotiable, read by the gate

```js
window.__READY__ = true;
window.__START__ = () => {};
window.__GAME__ = {
  pos: [x, z],            // metres
  fps,                    // from REAL elapsed time. Never a clamped delta.
  frame, speed, score, over,
  draws: renderer.info.render.calls,
  tris:  renderer.info.render.triangles,
  gap,                    // metres to the nearest pursuer
  lane,                   // -1 | 0 | 1
  dodges, vaults, slides, topples,   // counters, so the gate can assert the genre happened
  aheadX,                 // x offset of the nearest obstacle within 18 m, or null: the gate steers by this
  aheadKind,              // 'block' | 'vault' | 'duck' | 'topple' | null
  heroBox,                // [x, y, w, h] of the hero on screen, in pixels
  distance,               // metres down the lane
};
```

## Rules everyone follows

- The style lock at `/Users/atlas/jam_test/STYLE-LOCK.md` is law. Read it, do not restate it.
- Load assets only through `ASSET()` from `./assetlib.js`. Do not write a loader.
- Anything with moving parts loads with `{ keepHierarchy: true }`; everything else merges.
- Scenery is baked per block with `bakeStatic()`, per block and never over the whole world.
- Budget: 900 draw calls, 1.7M triangles, the repo's numbers. Measure, do not assume.
- No image files inside asset modules. The game itself may use textures the lead provides.
- No printed text or glyph geometry anywhere.
