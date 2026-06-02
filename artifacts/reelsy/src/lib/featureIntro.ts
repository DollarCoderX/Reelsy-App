export type FeatureIntroKey = string;

const PREFIX = "reelsy_feature_intro_seen:";

export function hasSeenFeatureIntro(key: FeatureIntroKey): boolean {
  try {
    return localStorage.getItem(`${PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

export function markFeatureIntroSeen(key: FeatureIntroKey): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, "1");
  } catch {
    // ignore
  }
}

export function getFeatureIntroSeenKey(key: FeatureIntroKey) {
  return `${PREFIX}${key}`;
}

