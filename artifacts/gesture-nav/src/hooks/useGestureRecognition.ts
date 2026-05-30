import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type GestureType = "POINT_FINGER" | "PINCH" | "OPEN_PALM" | "NONE";

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isFingerExtended(
  tip: NormalizedLandmark,
  pip: NormalizedLandmark,
  mcp: NormalizedLandmark
): boolean {
  return tip.y < pip.y && pip.y < mcp.y;
}

function isFingerCurled(
  tip: NormalizedLandmark,
  pip: NormalizedLandmark
): boolean {
  return tip.y > pip.y;
}

export function detectGesture(
  landmarks: NormalizedLandmark[],
  sensitivity: number = 0.6
): { gesture: GestureType; confidence: number } {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: "NONE", confidence: 0 };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const ringMcp = landmarks[13];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  const pinkyMcp = landmarks[17];

  const pinchDist = dist(thumbTip, indexTip);
  const pinchThreshold = 0.06 * (1 - sensitivity * 0.3);

  if (pinchDist < pinchThreshold) {
    const confidence = Math.min(1, (pinchThreshold - pinchDist) / pinchThreshold);
    return { gesture: "PINCH", confidence };
  }

  const indexExtended = isFingerExtended(indexTip, indexPip, indexMcp);
  const middleCurled = isFingerCurled(middleTip, middlePip);
  const ringCurled = isFingerCurled(ringTip, ringPip);
  const pinkyCurled = isFingerCurled(pinkyTip, pinkyPip);

  if (indexExtended && middleCurled && ringCurled && pinkyCurled) {
    const indexRaise = indexPip.y - indexTip.y;
    const middleCurl = middleTip.y - middlePip.y;
    const confidence = Math.min(1, (indexRaise + middleCurl) * 3);
    if (confidence > 0.3) {
      return { gesture: "POINT_FINGER", confidence };
    }
  }

  const allExtended = [
    isFingerExtended(indexTip, indexPip, indexMcp),
    isFingerExtended(middleTip, middlePip, middleMcp),
    isFingerExtended(ringTip, ringPip, ringMcp),
    isFingerExtended(pinkyTip, pinkyPip, pinkyMcp),
  ];
  const extendedCount = allExtended.filter(Boolean).length;
  const thumbExtended = thumbTip.x < thumbIp.x || dist(thumbTip, wrist) > dist(thumbIp, wrist);

  if (extendedCount >= 3 && thumbExtended) {
    const confidence = (extendedCount + (thumbExtended ? 1 : 0)) / 5;
    if (confidence > 0.5) {
      return { gesture: "OPEN_PALM", confidence };
    }
  }

  return { gesture: "NONE", confidence: 0 };
}
