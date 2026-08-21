import { asc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  growthEventRevisions,
  growthPhaseReflections,
  growthTags,
  type GrowthDiary,
} from "../../drizzle/schema";
import { getEnrichedDiaryEvents } from "./diaryRead";
import { parseDiaryEventRevisionSnapshot } from "./revisions";

type DbClient = MySql2Database<Record<string, unknown>>;

export type FullArchiveAssetSource = {
  id: string;
  kind: "image" | "live_motion" | "voice" | "cover";
  sourceUrl: string;
  fileName: string;
  mimeType: string | null;
};

export type FullDiaryArchiveSource = {
  data: {
    format: "chronicle-growth-diary-full";
    version: 1;
    diary: {
      title: string;
      subtitle: string | null;
      birthYear: number | null;
      educationStartYear: number | null;
      educationEndYear: number | null;
      careerStartYear: number | null;
      careerEndYear: number | null;
      childhoodStartYear: number | null;
      childhoodEndYear: number | null;
      aiEnabled: boolean;
      publicCoverTitle: string | null;
      publicStoryLayout: "editorial" | "gallery" | "minimal";
      publicCoverAssetId: string | null;
    };
    tags: Array<{ name: string; color: string; kind: "general" | "skill" }>;
    events: Array<Record<string, unknown>>;
    reflections: Array<{ phaseKey: string; recap: string; reflection: string; model: string; createdAt: string | null; updatedAt: string | null }>;
    revisions: Array<{ eventArchiveId: string; version: number; changeType: "create" | "update" | "restore"; snapshot: ReturnType<typeof parseDiaryEventRevisionSnapshot>; createdAt: string | null }>;
    exclusions: string[];
  };
  assets: FullArchiveAssetSource[];
};

function iso(value: Date | null) {
  return value ? value.toISOString() : null;
}

/**
 * Produces a content-only, owner-scoped export source. Private URLs are kept
 * solely in this short-lived response so the browser can fetch selected assets;
 * the portable payload itself references archive IDs and never serializes URLs.
 */
export async function buildFullDiaryArchiveForDiary(db: DbClient, diary: GrowthDiary): Promise<FullDiaryArchiveSource> {
  const [events, tags, reflections] = await Promise.all([
    getEnrichedDiaryEvents(db, diary.id),
    db.select().from(growthTags).where(eq(growthTags.userId, diary.userId)).orderBy(asc(growthTags.name)),
    db.select().from(growthPhaseReflections).where(eq(growthPhaseReflections.diaryId, diary.id)).orderBy(asc(growthPhaseReflections.phaseKey)),
  ]);
  const eventIds = events.map((event) => event.id);
  const revisions = eventIds.length
    ? await db.select().from(growthEventRevisions).where(inArray(growthEventRevisions.eventId, eventIds)).orderBy(asc(growthEventRevisions.eventId), asc(growthEventRevisions.version))
    : [];
  const assets: FullArchiveAssetSource[] = [];
  const coverAssetId = diary.publicCoverUrl ? "public-cover" : null;
  if (coverAssetId && diary.publicCoverUrl) {
    assets.push({ id: coverAssetId, kind: "cover", sourceUrl: diary.publicCoverUrl, fileName: "public-cover", mimeType: null });
  }

  const archiveEvents = events.map((event) => {
    const media = event.media.map((item) => {
      const assetId = `event-${event.id}-media-${item.id}`;
      assets.push({ id: assetId, kind: item.mediaKind, sourceUrl: item.url, fileName: item.fileName, mimeType: item.mimeType });
      return {
        assetId,
        mediaKind: item.mediaKind,
        fileName: item.fileName,
        mimeType: item.mimeType,
        caption: item.caption,
        sortOrder: item.sortOrder,
        createdAt: iso(item.createdAt),
      };
    });
    const voiceNotes = event.voiceNotes.map((item) => {
      const assetId = `event-${event.id}-voice-${item.id}`;
      assets.push({ id: assetId, kind: "voice", sourceUrl: item.url, fileName: item.fileName, mimeType: item.mimeType });
      return {
        assetId,
        fileName: item.fileName,
        mimeType: item.mimeType,
        durationMs: item.durationMs,
        transcript: item.transcript,
        language: item.language,
        transcriptionModel: item.transcriptionModel,
        consentedAt: iso(item.consentedAt),
        createdAt: iso(item.createdAt),
      };
    });
    return {
      archiveId: `event-${event.id}`,
      occurredAt: event.occurredAt,
      datePrecision: event.datePrecision,
      eventType: event.eventType,
      title: event.title,
      body: event.body,
      ageLabel: event.ageLabel,
      place: event.place,
      color: event.color,
      track: event.track,
      milestoneType: event.milestoneType,
      milestoneWeight: event.milestoneWeight,
      comparisonGroup: event.comparisonGroup,
      unlocksAt: event.unlocksAt,
      phaseKeywords: event.phaseKeywords,
      mapLatitudeE6: event.mapLatitudeE6,
      mapLongitudeE6: event.mapLongitudeE6,
      locationPrivacy: event.locationPrivacy,
      soundtrackTitle: event.soundtrackTitle,
      soundtrackUrl: event.soundtrackUrl,
      shareScope: event.shareScope,
      isPublic: event.isPublic,
      timelinePosition: event.timelinePosition,
      createdAt: iso(event.createdAt),
      updatedAt: iso(event.updatedAt),
      tags: event.tags.map((tag) => ({ name: tag.name, color: tag.color })),
      skills: event.skills.map((skill) => ({ name: skill.name, color: skill.color })),
      media,
      voiceNotes,
    };
  });

  return {
    data: {
      format: "chronicle-growth-diary-full",
      version: 1,
      diary: {
        title: diary.title,
        subtitle: diary.subtitle,
        birthYear: diary.birthYear,
        educationStartYear: diary.educationStartYear,
        educationEndYear: diary.educationEndYear,
        careerStartYear: diary.careerStartYear,
        careerEndYear: diary.careerEndYear,
        childhoodStartYear: diary.childhoodStartYear,
        childhoodEndYear: diary.childhoodEndYear,
        aiEnabled: diary.aiEnabled,
        publicCoverTitle: diary.publicCoverTitle,
        publicStoryLayout: diary.publicStoryLayout,
        publicCoverAssetId: coverAssetId,
      },
      tags: tags.map((tag) => ({ name: tag.name, color: tag.color, kind: tag.kind })),
      events: archiveEvents,
      reflections: reflections.map((reflection) => ({
        phaseKey: reflection.phaseKey,
        recap: reflection.recap,
        reflection: reflection.reflection,
        model: reflection.model,
        createdAt: iso(reflection.createdAt),
        updatedAt: iso(reflection.updatedAt),
      })),
      revisions: revisions.map((revision) => ({
        eventArchiveId: `event-${revision.eventId}`,
        version: revision.version,
        changeType: revision.changeType,
        snapshot: parseDiaryEventRevisionSnapshot(revision.snapshot),
        createdAt: iso(revision.createdAt),
      })),
      exclusions: [
        "分享 token、分享密碼雜湊、session 與 OAuth state",
        "媒體與語音的來源 URL、private storage key 與 share-safe storage key",
        "分享存取紀錄、邀請、協作稽核紀錄與協作者識別資料",
        "排程 task UID 與通知執行狀態",
      ],
    },
    assets,
  };
}
