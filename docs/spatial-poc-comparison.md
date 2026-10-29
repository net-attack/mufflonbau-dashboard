> Follow-up: the user selected Pixi for an opt-in production 2D dev release.
> See [SPATIAL-2D.de.md](SPATIAL-2D.de.md). This report describes the isolated
> architectural experiment. The production renderer is separate from the simulator.
> The UI now starts in Pixi/2D; Compare and 3D remain available in the lab.

# Spatial Lab: rendering architecture POC

This development experiment compares the same small apartment scene in modern
SVG, SVG with Pixi effects, and a Pixi scene graph. It does not migrate or import
anything into the production floorplan or the HACS entry point.

## Open and reproduce

```sh
npm install
npm run dev:spatial-poc
# http://127.0.0.1:4173/dev/spatial-poc

npm run build:spatial-poc
npm run test:spatial-poc
```

The server binds to localhost and serves only explicit development routes. It
watches JavaScript; reload the page after editing. Build output, maps, screenshots,
the screenshot gallery, bundle sizes and measurements live in the ignored
`test-results/spatial-poc/` directory. After running the tests, the gallery is at
`http://127.0.0.1:4173/dev/spatial-poc/gallery/`.

Compare mode mounts all three implementations. Focused mode stops scene frames
for the hidden implementations; their GPU contexts remain allocated. Cameras
are linked by default and can be unlinked. Storybook uses existing dashboard
palette values; Blueprint is scoped to the development page.

The evolving interaction requirements are implemented as follows:

- Tap the light to toggle it. Tap the radiator to toggle it and open controls.
- Hold either device, then drag vertically like a mixer fader: brightness for
  the light, setpoint for heating. Movement before the hold threshold pans
  instead. A second finger cancels the fader gesture and starts camera control.
- Device controls fit their content, with no nested scrollbar. Light controls
  include brightness, Kelvin and RGB when the simulated capability is enabled.
  Heating's setpoint is separate from the measured room temperature.
- Tap Saugfried for mode, suction, start/resume, pause, stop and return controls.
  All actions update the simulator only.
- Drag to pan. Pinch to zoom and twist two fingers to orbit the isometric scene.
  Hold the right mouse button and drag horizontally to orbit on desktop;
  a rightward drag decreases the camera angle, and the reverse drag restores it.
  Desktop has zoom/orbit/reset buttons and Ctrl/Meta+wheel zoom; plain wheel
  scrolling remains page scrolling. Keyboard controls are also provided.

Device popups remain spatially anchored, clamped and connected to their device.
Controls now size to their content (maximum 340 px wide), with no nested scrollbar.
They support Escape/close and do not lock the page or pause the scene.

## Shared model and isolation

Added files: the isolated files under `src/dev/spatial-poc/` (entry page, shell, styles,
shared modules, SVG renderer and two Pixi modules),
`scripts/spatial-poc.mjs`, `scripts/spatial-poc-check.mjs`,
`test/spatial-poc.test.js` and this report. Changed existing files are only
`package.json`, `package-lock.json`, `README.md` and the test workflow.
Optional personal JSON and screenshot files remain ignored.

`src/dev/spatial-poc/shared/` owns semantic geometry, synthetic entity state,
commands, theme tokens, camera conversion, gesture intent and device controls.
There is no HA connection or service adapter that could control a physical device.
One store broadcasts state revisions; renderers implement geometry, effects and
hit testing. One clock drives deterministic movement and animation. The optional
vacuum trail is derived from that same simulated path, not HA position data.

The room is an orthographic **2.5D cutaway** built from explicit object heights,
prism faces and painter ordering. It produces a rotating isometric 3D image using
the requested 2D rendering architectures, without a separate 3D engine. It is
not a perspective, physically based renderer or a full depth-buffered 3D scene.
Height and projection helpers are shared; SVG and Pixi draw the faces independently.

The production `src/index.js`, strategy, theme definitions, floorplan renderer,
gesture helper and build script remain unchanged. `pixi.js` 8.22.0 is pinned as
a development dependency and is bundled only into the separate development build.
The test verifies the production bundle hash before and after the dev build.

### Optional private room preview

An explicit local JSON profile can supply room polygons, wall openings,
furniture footprints, illustrative heights and semantic device positions:

```sh
SPATIAL_POC_PROFILE=debug/my-room.local.json npm run dev:spatial-poc
# http://127.0.0.1:4173/dev/spatial-poc?profile=local
```

Without that opt-in, the profile endpoint does not exist. Personal layout data
belongs in ignored `debug/*.local.json`; private screenshots belong in `private_/`.
Do not put private data in the synthetic fixtures or CI artifacts. A private
profile changes the scene input shared by all renderers, not the production
dashboard. Profiles can omit devices that are not in the room. Source drawing
positions are distinct from illustrative heights and simulated robot positions.

## Implementations

### SVG

Native SVG nodes draw furniture, projected prism faces, device symbols, labels,
gradients, airflow and the vacuum trail. Semantic updates rebuild this small SVG
tree; animation frames change a few transforms, opacities and the route polyline.
SVG hit targets have keyboard focus and accessible labels. Complex controls stay
in native HTML. There is no GPU-library dependency for this renderer itself.

The implementation is straightforward to inspect in browser developer tools and
maintain with normal DOM APIs. Gradients provide convincing stylized spill at
this scale. Many independent nodes, expensive filters or large particle counts
would need separate testing; the current scene does not establish their limits.
The shared JavaScript animation loop is intentionally comparable to the GPU
variants; compositor-only CSS/WAAPI animation is not separately benchmarked.

### Hybrid

The SVG renderer supplies structural geometry, labels and interaction hit areas.
A transparent Pixi canvas above it draws light spill, heat, airflow, particles,
robot effects, scan line and route. The canvas ignores pointer events.

Both layers use the **same affine camera matrix**, including orbit, aspect-fit,
pan and zoom. Elevated hit targets use the same height projection as the mesh.
Device-pixel ratio changes canvas backing resolution, not world coordinates.
Browser tests compare SVG screen transforms with Pixi global transforms after
camera changes and resizing, with a subpixel alignment tolerance.

This preserves SVG semantics while adding a GPU effect surface, but introduces
two rendering trees, compositing and lifecycle coordination. The effect canvas
overlays the structural SVG as a whole; arbitrary interleaving of GPU effects
and individual SVG furniture pieces is not demonstrated.

### Pixi primary renderer

Pixi containers, Graphics, Text and sprites draw the room and furniture directly
from the shared primitives. The scene graph separates room, spatial objects,
device, lighting/effect and interaction responsibilities. Pixi's boundary hit
testing resolves pointer targets. Native HTML provides accessible device actions
and all settings; the WebGL image is not itself a screen-reader interface.

GPU effects use a locally generated radial texture, tinting, blending and moving
graphics. No external textures, fonts, CDN scripts or additional effect packages
are used. This is not a shader stress test or a physically accurate lighting demo.
The extra GPU lifecycle and text/resource management increase implementation
complexity relative to the small SVG scene.

## Measurement and idle behavior

Enable **Statistik** to see update cadence, JavaScript plus render-submit time,
scene-node count, backing resolution and actual backend. Node counts describe
different kinds of objects and are not memory or draw-call comparisons.
Updates/s are not independently measured SVG paints or proof of displayed FPS.
GPU execution time and total CPU/GPU utilization are not measured by these counters.

The benchmark writes its browser version, backend description, elapsed time,
callback counts and samples to `test-results/spatial-poc/measurements.json`.
The default automated run deliberately uses Chromium **SwiftShader software
WebGL**. Its timings cannot predict a desktop or wall tablet's hardware GPU.
Set `SPATIAL_POC_HARDWARE=1` to remove the software-renderer launch flags and
inspect the recorded GPU string before interpreting the result as hardware data.

In the verified idle preset, all three implementations issue **zero scene frame
updates and zero Pixi render submissions** during the sample interval. Pixi's
private application tickers are stopped. Its separate idle-pointer ticker is
also removed because this POC uses static hit areas and native pointer movement.
However, Pixi 8.22.0 retains **two system-ticker GC scheduler listeners**, one per
retained GPU renderer. This is residual CPU housekeeping, even in focused mode;
it must not be described as zero idle CPU. Those schedulers are left intact rather
than patched through private renderer methods.

Active animation resumes only for visible selected panels. Hidden tabs stop scene updates. Statistics sampling is optional and
adds a one-second interval while enabled. Build sizes are measured from esbuild
outputs, including per-chunk gzip sizes and bytes attributable to Pixi/dependencies;
they are available in `bundle-sizes.json`. Production bundle contribution is zero.

## Comparison

A representative local run of the isometric scene used Chromium 156.0.8078.4,
1560 × 1100 CSS pixels, DPR 1 and SwiftShader. The short samples were about 1.2 s:

| Mode | SVG updates/s; JS+submit | Hybrid updates/s; JS+submit | Pixi updates/s; JS+submit |
| --- | --- | --- | --- |
| Focused, active | 59.8; 0.236 ms | 58.2; 0.653 ms | 35.6; 1.363 ms |
| Compare, active | 23.3; 0.232 ms | 23.3; 0.475 ms | 23.3; 0.739 ms |
| Idle | 0 scene updates | 0 scene updates | 0 scene updates |

These observations show why focused and simultaneous modes must be distinguished:
the shared clock limits all panels to the slowest combined workload. They are
software-renderer observations, not a hardware ranking. In that run the semantic
rebuild took roughly 2 ms for SVG/hybrid and 4–6 ms for Pixi; the sample is not an
input-to-photon latency measurement. Scene node counts were 175 SVG DOM nodes,
183 combined hybrid nodes and 173 Pixi graph nodes, which are different metrics.

The corresponding development build contained about **610 KiB minified JS**,
**191 KiB summed per-chunk gzip**, of which esbuild attributed about **548 KiB
minified** to Pixi and its dependencies. This includes the generated chunk set,
not just requests made for a particular backend; source maps are excluded.
Current exact values are generated with every dev build. The production bundle
remains 5,236,932 bytes with SHA-256
`ae45fb2306d06e1ce8c7dd1a43de0c805ae1456d60b731e06476530786d62b0a`.

These are observations about this POC, not a selection of a production architecture.

| Criterion | SVG | SVG + Pixi | Pixi primary |
| --- | --- | --- | --- |
| Visual capability | Clear illustrated prisms and gradients | Same structure plus GPU effects | Same scene with GPU geometry and effects |
| WebGL effects | No custom WebGL layer | Dedicated GPU surface | Native to the scene graph |
| Light rendering | SVG radial gradients | GPU-tinted radial sprites | Same GPU effects, own object ordering |
| Animation flexibility | DOM transforms/attributes; many nodes can cost | SVG and GPU animation must coordinate | Scene graph transforms and particles |
| Interaction simplicity | Native SVG targets | Same SVG targets | Pixi hit testing plus DOM equivalents |
| Accessibility | Focusable SVG plus native controls | SVG semantics retained | Explicit HTML actions required |
| DOM integration | Direct | Direct controls; separate effect canvas | Coordinate bridge for informational overlays |
| Responsive scaling | Vector output | Vector + canvas/DPR coordination | Backing resolution, text and DPR management |
| Pan/zoom/orbit | One shared matrix applied to SVG | Same matrix applied twice; alignment tested | Same matrix applied to scene container |
| Implementation complexity | Smallest lifecycle surface here | Two trees and their composition | GPU initialization, events and resource cleanup |
| Debugging | Inspect nodes and attributes | Inspect DOM plus GPU graph | Graph inspection and instrumented hit tests |
| Testing | DOM, geometry and screenshots | Same tests plus layer alignment | Real canvas hit tests, backend and screenshots |
| Bundle size | No Pixi required intrinsically | Adds shared Pixi chunk set | Shares that chunk set with hybrid |
| Idle CPU/GPU | No POC frame loop in idle | No redraw; Pixi GC housekeeping persists | Same residual housekeeping |
| Active CPU/GPU | Small DOM mutations; browser paints not timed | SVG updates plus GPU submissions/compositing | GPU geometry/effects; actual GPU time unmeasured |
| Agentic maintainability | Familiar DOM with visible semantic targets | Shared data helps; cross-layer bugs need care | Shared primitives help; Pixi API/lifecycle knowledge needed |
| Future 2.5D potential | Explicit projected faces and painter order | Same faces plus richer effects | More scene graph/effect headroom; still 2D projection here |

## Validation, problems found and open questions

Node tests cover shared state, capability-aware color, independent setpoints,
fader clamping, theme vocabulary, inverse projection, zoom/orbit anchors, trails
and the regression where a flat window symbol duplicated the new vertical pane.
Browser checks exercise real scene clicks and holds, fader dragging, vacuum
settings, compact popup sizing without internal scrolling, keyboard access, pan, pinch,
two-finger rotation, resize, linked cameras, hybrid alignment, idle rendering and
both Galaxy Tab A11 profiles. Existing production checks remain separate.

The six baseline screenshots use the same state: light 70%, 2700 K, heating 60%,
22.1 °C, humidity 64%, dehumidifier running, vacuum cleaning at 78%, window open,
and time fixed at 3.5 seconds. Compare and tablet captures accompany them.

Important remaining questions are real tablet GPU/thermal/battery behavior,
long-running resource stability, context loss/recovery, larger scene limits,
correct depth sorting for intersecting furniture, dynamic hover on moving objects,
and hardware performance of more advanced effects. Projected scene hit areas
currently shrink with zoom; production would need minimum screen-space touch
targets in addition to the existing native device-action buttons. Current painter ordering is
not a full 3D occlusion solution. Real Saugfried position/history availability
from the installed HA integration is unverified; the demonstrated trail is simulated.

To remove the experiment, delete `src/dev/spatial-poc/`, its two scripts and tests,
the dev commands/dependency, this document and the optional CI step. No production
floorplan migration or rollback is necessary.
