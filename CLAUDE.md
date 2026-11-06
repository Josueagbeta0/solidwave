# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Important: bleeding-edge stack

This project runs on **Next.js 16**, React 19, Tailwind CSS v4, TypeScript 7, three.js 0.187 with `@react-three/fiber` v9 / `@react-three/drei` v10. APIs differ from older training data — read the bundled docs in `node_modules/next/dist/docs/` (`01-app/`, upgrade guide under `01-app/02-guides/upgrading/`) before writing Next.js code.

## Commands

```bash
npm run dev        # next dev
npm run build      # next build (also type-checks)
npm run start      # serve production build
npm run lint       # eslint . (flat config in eslint.config.mjs)
npm run typecheck  # tsc --noEmit (TypeScript 7)
```

- There is **no test suite**; verify with `lint`, `typecheck` and `build`.
- **TypeScript side-by-side setup:** typescript-eslint doesn't support TS 7 yet, so `typescript` in `package.json` is an alias for `@typescript/typescript6` (used by ESLint and Next's build type-check), and `@typescript/native` is an alias for TS 7, which provides the `tsc` binary. Don't "fix" these aliases.
- `react-hooks/immutability` is turned off for the R3F scene files (`IconCanvas.tsx`, `HeroScene.tsx`) because mutating three.js objects inside effects is intended there. Any other React Compiler rule exceptions are inline `eslint-disable` comments with a reason.
- `npm audit` reports a moderate `minimatch` advisory pulled in by the ESLint toolchain (dev-only). `npm audit fix --force` would downgrade `eslint-config-next` to v15 — don't run it.

## What it is

**The whole UI and copy are in French** (`<html lang="fr">`, decimal commas in readouts). Write new user-facing text in French.

**SolidWave** — a marketing landing page (`/`) plus an in-browser 3D studio (`/studio`) that turns an SVG/PNG logo into a true-to-size 3D object with glass/metal/colour finishes, renders PNGs up to 4K and exports GLB/STL. Everything runs client-side; there is no backend/API. Brand constants (name, tagline, site URL via `NEXT_PUBLIC_SITE_URL`) live in `lib/site.ts`. All artwork (logo in `components/LogoMark.tsx`, starter shapes in `lib/samples.ts`) is original — don't add third-party logos.

## Architecture

**Pipeline (shared by the studio and the landing hero):**

1. `lib/trace.ts` — input → `TraceResult` (`THREE.Shape[]` + colors + dimensions).
   - Vector: `svgToShapes()` parses SVG via `three-stdlib`'s `SVGLoader`.
   - Raster: `traceImageSource()` builds a scalar field from image pixels (modes `auto|dark|light|alpha|color`), blurs it, runs marching squares, then RDP simplification + Chaikin smoothing, and nests holes via point-in-polygon.
2. `lib/studio/geometry.ts` — `buildIcon(trace, {mode, widthMm, heightMm, depthMm, edgeMm, quality})` → `BuiltIcon`. Modes: `extrude | stack | inflate | relief`. `quality` (`draft|high|ultra`) scales curve samples and bevel segments; non-inflate meshes get crease-angle normals (`toCreasedNormals`) so bevels shade smooth while caps stay crisp. Sizes are real millimetres (scene uses `scale 0.1`). Always pair with `disposeIcon()`.
3. `lib/studio/materials.ts` — `finishes` catalogue (`glass | liquid | metal | color`), `createMaterial(finish, overrides)` → `MeshPhysicalMaterial`, plus backdrop presets / `backgroundStyle()` for the CSS stage behind the transparent canvas.
4. `lib/studio/lighting.ts` — lighting rigs: Lightformer panels baked into the environment map + key/fill directional lights. `lib/studio/floor.ts` — radial alpha fade for the mirror floor.
5. Rendering:
   - `components/studio/IconCanvas.tsx` — R3F `<Canvas>`. Per-quality budget (`qualityBudget`: DPR, env resolution, shadow res, MSAA, post on/off). With post on, `@react-three/postprocessing` owns tone mapping (`ToneMapping` effect; the composer forces `gl.toneMapping = NoToneMapping`); exposure is applied by scaling lights and `scene.environmentIntensity`, so it behaves the same with or without post. Floor modes: none / contact shadow / `MeshReflectorMaterial` mirror.
   - **Glass needs `StageBackdrop`.** The visible stage is CSS behind a transparent canvas, and three's transmission pass clears to 50% white when the canvas is transparent — glass then looks milky grey. `StageBackdrop` (exported from `IconCanvas.tsx`, also used by `HeroScene`) is a full-screen quad painting the stage that renders *only* into the transmission render target (detected in `onBeforeRender`) and discards in the main pass. Keep its painter in sync with the CSS backdrop (`paintStage` in `Studio.tsx`, `paintHeroCard` in `HeroScene.tsx`).
   - Floor modes: `none | shadow` (ContactShadows) `| soft` (drei `AccumulativeShadows` + `RandomizedLight`; high `alphaTest` and light intensity keep the plane edge invisible on light backdrops) `| reflect` (mirror).
   - **On-demand rendering:** the studio `<Canvas>` uses `frameloop="demand"` unless the turntable runs (`"never"` while recording). Anything that changes the picture outside React props must call `invalidate()`; the `Settle` component re-requests frames (6, or 110 for the accumulating soft floor) whenever its token (icon, material, settings, stage) changes, and `useFrame` animations (camera moves, damping back to rest) call `state.invalidate()` until they land.
   - `exportVideo` renders a seamless 360° turntable **frame by frame**: takes over the loop (`setFrameloop("never")` + `advance()`), drives rotation through `spinRef`, composites backdrop + canvas into a 2D canvas, and encodes every frame with WebCodecs `VideoEncoder` (H.264) at exact 1/60 s timestamps, muxed to MP4 with `mp4-muxer`, so it is smooth whatever the GPU speed. Falls back to real-time `MediaRecorder` without WebCodecs. Headless Chrome can't verify either path (MediaRecorder emits no data; `VideoEncoder.flush()` hangs); an empty recording throws instead of downloading.
   - **Environment:** `RigEnvironment` (exported) builds the reflected world for a rig: a CC0 studio HDRI (`public/hdri/studio_small_09_1k.hdr`, Poly Haven, loaded with three's `HDRLoader`) wrapped as a dome for rigs with `hdri` (studio, softbox), otherwise the `SkyDome` gradient, plus the Lightformer panels. The gradient version stands in while the HDRI loads (Suspense fallback).
   - **Front sweep:** rigs with `front` get `FrontSweep`, a wide additive radial softbox low in front of the object (`FRONT_SWEEP_DIR`). Flat front caps on chrome/glass reflect that direction from both the 3/4 and the straight-on views; without it they mirror the dark lower room and read as black plates. `geometry.ts` `flattenCaps` keeps cap normals exactly ±Z after creasing, otherwise the first bevel segment tilts them and mirror finishes show diagonal streaks.
   - `SkyDome` adds each rig's vertical `sky` gradient into the environment map so flat caps on metal/chrome get a light-to-dark falloff instead of reflecting a uniform void.
   - Exports are registered into an `actionsRef` (`StudioActions` in `lib/studio/types.ts`). PNG export resizes the composer, renders off-screen, supersamples ≤1K, then composites onto a 2D canvas; `paint` (from `Studio.tsx`'s `paintStage`) draws the backdrop when "Include backdrop" is on, otherwise the mirror floor is hidden and the PNG stays transparent.
   - `components/landing/HeroScene.tsx` — interactive hero scene (shape + finish pickers) on a light stage with the studio `RigEnvironment` and only a contact shadow (no mirror floor or bloom, for speed). Loaded lazily via `HeroSceneLazy` (`next/dynamic`, `ssr: false`) so three.js never blocks first paint; `CameraFit` backs the camera off on portrait stages; pauses when off-screen.

**`components/studio/Studio.tsx`** holds all studio state (`useState`), memoizes `buildIcon`, and passes `MaterialSettings`/`SceneSettings` to `IconCanvas`. Layout (light pro-tool style): top bar (logo, current-file chip, import, export popover with PNG / video / GLB / STL); viewport on the left with a floating view switcher, dimensions, quick actions and finish dock (all styled by `darkStage`); inspector on the right; tool rail on the far right with five tabs (Ambiances / Forme / Matière / Lumière / Rendu, keys 1–5). Default stage is white (`white` backdrop, chrome, soft floor, look `studio-blanc`); loading a sample keeps the current finish unless `?finish=` is given. **Automatic backdrop** (`autoStage`, on by default, and kept by the `studio-blanc` look): `lib/studio/backdrop.ts` `autoBackdrop(tint, metalness)` balances light and dark stages — silver metals → white studio, light/luminous objects (glass, gold, pale tints, white ceramic) → dark stage tinted with their hue, dark/deep objects → light pastel or white. The displayed stage tweens to its target (`mixHex`), `darkStage` is derived from the stage colour's luminance, and picking a preset or editing a colour switches auto off. Looks (`lib/studio/looks.ts`) are one-click art directions setting finish, rig, backdrop, floor and post together. `buildIcon` takes `edgeProfile: "round" | "chamfer"` (chamfer = one bevel segment; inflate ignores it), inspector panel, viewport with finish dock. Query params: `?sample=<id>&finish=<id>&quality=draft|high|ultra`. Panel widgets live in `components/studio/controls.tsx` (`Slider` supports double-click reset via `defaultValue`).

Routes `app/page.tsx` and `app/studio/page.tsx` are server components; anything touching three.js/DOM is `"use client"`. `app/icon.svg` and `app/opengraph-image.tsx` (generated with `next/og`) provide favicon and social image. `next.config.ts` transpiles `three`.

## Styling

Tailwind v4, CSS-first config in `app/globals.css` (no `tailwind.config`). Light "studio paper" theme, Swiss-minimal (direction chosen with the `ui-ux-pro-max` skill: light mode, one accent, no rainbow gradients):
- Tokens in `@theme`: ink `ink`…`ink-4` (near-black → stone), paper surfaces `shell` (#fafaf9) / `night` / `surface` (white) / `raised` / `stage`, translucent-ink `hairline` / `well`, and **one accent** `accent` (#2f5bff) with `accent-soft`. The old `wave-*` names still exist but all map onto the accent family — prefer `accent` in new code. Classes: `.panel`, `.glass`, `.eyebrow`, `.heading-hero`, `.heading-section`, `.serif-accent` (Instrument Serif italic word inside a heading), `.text-lead`, `.reveal` (scroll reveal), `.wave-flow` (progress bar).
- The studio shares these tokens: light UI chrome around a (by default dark) 3D viewport. Viewport overlays must not use `text-ink` on a dark stage — branch on `darkStage` (see the empty state).
- Motion: `components/motion.tsx` — `SmoothScroll` (Lenis, landing page only; skipped under reduced motion) and `Reveal` (IntersectionObserver fade/lift, `delay` to stagger). Lenis swallows programmatic `scrollTo`, so headless full-page screenshots should use a viewport as tall as the page instead of scrolling.
- Hero stage colours live in `lib/stage.ts` (shared by the CSS background and `paintHeroStage` for glass refraction) — not in the `"use client"` HeroScene, since server components can't import plain values from client modules.
- Breakpoints are **max-width custom variants**: `max-desk` (1180), `max-tab` (900), `max-mid` (799), `max-fold` (640), `max-phone` (480), `max-2xs` (390), `max-3xs` (350).
- Fonts: Geist Sans/Mono (`geist` package) for UI and headings, Instrument Serif (`next/font/google`, `--font-instrument-serif` → `font-serif`) for accent words.

## Verifying visually

Headless Chrome screenshots with `--virtual-time-budget` leave the R3F canvas at the initial (smaller) viewport size — a band appears at the bottom/right. Use `--timeout=<ms>` (real time) instead. Headless also enforces a ~500px minimum window width, so phone-width screenshots are cropped, not reflowed.
