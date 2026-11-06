/**
 * The landing hero stage: a bright photo-studio sweep. The CSS background and
 * the canvas the glass refracts must match, so both read from here.
 */
export const HERO_STAGE = { center: "#ffffff", mid: "#f3f2ef", edge: "#e2e0dc" };

export const heroStageCss = `radial-gradient(80% 90% at 50% 30%, ${HERO_STAGE.center} 0%, ${HERO_STAGE.mid} 45%, ${HERO_STAGE.edge} 100%)`;

export function paintHeroStage(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height * 0.3,
    0,
    width / 2,
    height * 0.3,
    Math.max(width, height) * 0.85,
  );
  gradient.addColorStop(0, HERO_STAGE.center);
  gradient.addColorStop(0.45, HERO_STAGE.mid);
  gradient.addColorStop(1, HERO_STAGE.edge);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
