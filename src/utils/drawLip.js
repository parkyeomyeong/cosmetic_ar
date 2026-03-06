import { OUTER_LIP, INNER_LIP } from './lipLandmarks.js';

function lmToXY(lm, videoW, videoH, scale, offsetX, offsetY) {
  return {
    x: lm.x * videoW * scale + offsetX,
    y: lm.y * videoH * scale + offsetY,
  };
}

/**
 * Draws a smooth closed curve through points using Catmull-Rom spline.
 * Much smoother than straight lineTo connections.
 */
function smoothPath(path, pts) {
  const n = pts.length;
  if (n < 2) return;

  path.moveTo(pts[0].x, pts[0].y);

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    // Catmull-Rom → cubic Bezier control points
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  path.closePath();
}

export function drawLipColor(ctx, landmarks, color, opacity, blendMode, transform) {
  const { scale, offsetX, offsetY, videoW, videoH } = transform;

  const toXY = (idx) => lmToXY(landmarks[idx], videoW, videoH, scale, offsetX, offsetY);

  const outerPts = OUTER_LIP.map(toXY);
  const innerPts = INNER_LIP.map(toXY);

  const outerPath = new Path2D();
  smoothPath(outerPath, outerPts);

  const innerPath = new Path2D();
  smoothPath(innerPath, innerPts);

  // even-odd: outer fills, inner becomes a hole (open mouth)
  const combined = new Path2D();
  combined.addPath(outerPath);
  combined.addPath(innerPath);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blendMode;
  ctx.fillStyle = color;
  ctx.fill(combined, 'evenodd');
  ctx.restore();
}
