const DAY_MS = 24 * 60 * 60 * 1000;

export function getTimeCapsuleStatus(unlocksAt?: number | null, now = Date.now()) {
  if (typeof unlocksAt !== "number") return { isLocked: false, daysRemaining: 0, unlocksAt: null };
  const remaining = unlocksAt - now;
  return { isLocked: remaining > 0, daysRemaining: Math.max(0, Math.ceil(remaining / DAY_MS)), unlocksAt };
}

export function formatCapsuleCountdown(daysRemaining: number) {
  if (daysRemaining <= 0) return "已解鎖";
  if (daysRemaining === 1) return "剩 1 天解鎖";
  if (daysRemaining < 60) return `剩 ${daysRemaining} 天解鎖`;
  return `約剩 ${Math.ceil(daysRemaining / 30)} 個月解鎖`;
}

export function getLifeProgress(birthYear?: number | null, currentYear = new Date().getFullYear(), horizonYears = 90) {
  if (!birthYear || !Number.isInteger(birthYear) || birthYear < 1900 || birthYear > currentYear || horizonYears <= 0) return null;
  const age = currentYear - birthYear;
  return { age, horizonYears, percentage: Math.min(100, Math.max(0, Math.round((age / horizonYears) * 100))) };
}
