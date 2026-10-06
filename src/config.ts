const BASE = (import.meta.env.VITE_ANIMATIONS_BASE ?? "https://cdn.kleymorf.xyz/crash").replace(/\/+$/, "");

export const animationUrl = (file: string): string => `${BASE}/${file}`;

export const ANIMATIONS = {
  rocket: animationUrl("rocket.lottie"),
  explosion: animationUrl("explosion.lottie"),
  time: animationUrl("time.lottie")
} as const;
