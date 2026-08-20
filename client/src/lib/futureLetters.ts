import { getTimeCapsuleStatus } from "./lifeProgress";

export type FutureLetterEvent = {
  id: number;
  occurredAt: number;
  unlocksAt?: number | null;
  title: string;
  shareScope: "private" | "public" | "link";
  isPublic: boolean;
};

export type FutureLetter = {
  id: number;
  unlocksAt: number;
  isLocked: boolean;
  daysRemaining: number;
  title: string | null;
  isSoon: boolean;
};

/** Builds a private workspace-only index. Locked letters deliberately omit their title. */
export function getFutureLetters<T extends FutureLetterEvent>(events: T[], now = Date.now()): FutureLetter[] {
  return events
    .filter((event) => event.shareScope === "private" && !event.isPublic && typeof event.unlocksAt === "number")
    .map((event) => {
      const status = getTimeCapsuleStatus(event.unlocksAt, now);
      return {
        id: event.id,
        unlocksAt: event.unlocksAt!,
        isLocked: status.isLocked,
        daysRemaining: status.daysRemaining,
        title: status.isLocked ? null : event.title,
        isSoon: status.isLocked && status.daysRemaining <= 30,
      };
    })
    .sort((left, right) => {
      if (left.isLocked !== right.isLocked) return left.isLocked ? -1 : 1;
      return left.isLocked ? left.unlocksAt - right.unlocksAt : right.unlocksAt - left.unlocksAt;
    });
}
