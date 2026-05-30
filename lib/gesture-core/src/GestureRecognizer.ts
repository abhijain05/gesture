import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { GestureType } from "./types.js";

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isExtended(tip: NormalizedLandmark, pip: NormalizedLandmark, mcp: NormalizedLandmark): boolean {
  return tip.y < pip.y && pip.y < mcp.y;
}

function isCurled(tip: NormalizedLandmark, pip: NormalizedLandmark): boolean {
  return tip.y > pip.y;
}

export interface RecognitionResult {
  gesture: GestureType;
  confidence: number;
}

export function detectGesture(
  landmarks: NormalizedLandmark[],
  sensitivity = 0.6
): RecognitionResult {
  if (!landmarks || landmarks.length < 21) return { gesture: "NONE", confidence: 0 };

  const [wrist, , , , thumbTip, indexMcp, indexPip, , indexTip,
    middleMcp, middlePip, , middleTip,
    ringMcp, ringPip, , ringTip,
    pinkyMcp, pinkyPip, , pinkyTip] = landmarks;
  const thumbIp = landmarks[3];

  const pinchDist = dist(thumbTip, indexTip);
  const pinchThreshold = 0.06 * (1 - sensitivity * 0.3);

  const indexExt = isExtended(indexTip, indexPip, indexMcp);
  const middleExt = isExtended(middleTip, middlePip, middleMcp);
  const middleCurl = isCurled(middleTip, middlePip);
  const ringCurl = isCurled(ringTip, ringPip);
  const pinkyCurl = isCurled(pinkyTip, pinkyPip);

  const effectivePinch = middleExt ? pinchThreshold * 0.55 : pinchThreshold;
  if (pinchDist < effectivePinch) {
    return { gesture: "PINCH", confidence: Math.min(1, (effectivePinch - pinchDist) / effectivePinch) };
  }

  // FIST: all four fingers curled (checked before POINT_FINGER)
  const indexCurl = isCurled(indexTip, indexPip);
  if (indexCurl && middleCurl && ringCurl && pinkyCurl) {
    // Only call it FIST if pinch distance is also wide (thumb not pinching)
    if (pinchDist > pinchThreshold * 1.2) {
      return { gesture: "FIST", confidence: 0.8 };
    }
  }

  if (indexExt && middleCurl && ringCurl && pinkyCurl) {
    const conf = Math.min(1, (indexPip.y - indexTip.y + middleTip.y - middlePip.y) * 3);
    if (conf > 0.3) return { gesture: "POINT_FINGER", confidence: conf };
  }

  const clearThreshold = pinchThreshold * 1.6;
  if (indexExt && middleExt && ringCurl && pinkyCurl && pinchDist > clearThreshold) {
    const conf = Math.min(1, ((indexPip.y - indexTip.y) + (middlePip.y - middleTip.y)) / 2 * 4);
    if (conf > 0.3) return { gesture: "TWO_FINGER", confidence: conf };
  }

  const allExt = [
    isExtended(indexTip, indexPip, indexMcp),
    isExtended(middleTip, middlePip, middleMcp),
    isExtended(ringTip, ringPip, ringMcp),
    isExtended(pinkyTip, pinkyPip, pinkyMcp),
  ];
  const extCount = allExt.filter(Boolean).length;
  const thumbExt = thumbTip.x < thumbIp.x || dist(thumbTip, wrist) > dist(thumbIp, wrist);

  if (extCount >= 3 && thumbExt) {
    const conf = (extCount + (thumbExt ? 1 : 0)) / 5;
    if (conf > 0.5) return { gesture: "OPEN_PALM", confidence: conf };
  }

  return { gesture: "NONE", confidence: 0 };
}
