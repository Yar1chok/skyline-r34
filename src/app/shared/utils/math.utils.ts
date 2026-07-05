export function easeInOutCubic(progress: number): number {
  const isFirstHalf = progress < 0.5;
  if (isFirstHalf) {
    return 4 * progress * progress * progress;
  }
  const remaining = -2 * progress + 2;
  return 1 - Math.pow(remaining, 3) / 2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
