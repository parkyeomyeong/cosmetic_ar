import { OUTER_LIP, INNER_LIP } from './lipLandmarks.js';

// 0.0 ~ 1.0 사이의 정규화된 좌표를 실제 캔버스 화면(픽셀) 좌표로 변환해주는 함수
// 영상의 가로세로 스케일(비율)과 잘린 여백(offset)을 고려하여 정확한 위치를 계산합니다.
function lmToXY(lm, videoW, videoH, scale, offsetX, offsetY) {
  return {
    x: lm.x * videoW * scale + offsetX,
    y: lm.y * videoH * scale + offsetY,
  };
}

/**
 * 딱딱하게 각진 직선(lineTo) 대신, 각 점과 점 4개를 참고해 휘어지는 곡선을 계산하여
 * 부드러운 입술 곡선(Catmull-Rom Spline 방식)을 그려주는 함수입니다.
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

    // 베지에 곡선(Bezier Curve) 계산을 위한 제어점(Control Points) 수학적 도출
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

  // 1. 계산 함수(toXY)를 이용해 478점 중 입술에 해당하는 바깥쪽/안쪽 점들을 화면 픽셀 위치로 변환
  const outerPts = OUTER_LIP.map(toXY);
  const innerPts = INNER_LIP.map(toXY);

  const outerPath = new Path2D();
  smoothPath(outerPath, outerPts);

  const innerPath = new Path2D();
  smoothPath(innerPath, innerPts);

  // 2. 바깥쪽 입술 전체를 덮는 매끄러운 패스(경로)와, 
  // 입을 벌렸을 때 칠해지면 안 되는 안쪽 이빨/혀 영역의 패스를 그립니다.
  const combined = new Path2D();
  combined.addPath(outerPath);
  combined.addPath(innerPath);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = blendMode;
  ctx.filter = 'blur(3px)'; // 입술 경계를 흐리게(페더링) 처리하여 피부와 자연스럽게 섞이게 함
  ctx.fillStyle = color;
  ctx.fill(combined, 'evenodd');
  ctx.restore();
}
