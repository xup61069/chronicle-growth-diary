import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  growthArchiveRestoreAssets,
  growthArchiveRestoreSessions,
  growthDiaries,
  growthEvents,
  growthEventMedia,
  growthEventRevisions,
  growthEventTags,
  growthEventVoiceNotes,
  growthPhaseReflections,
  growthShareAccessLogs,
  growthTags,
  type GrowthDiary,
} from "../../drizzle/schema";
import { safeMediaName } from "../diaryHelpers";
import { storagePut } from "../storage";

type DbClient = MySql2Database<Record<string, unknown>>;
const RESTORE_TTL_MS = 30 * 60 * 1000;
const MAX_ARCHIVE_EVENTS = 250;

const nullableString = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value?.trim() || null);
const tagSchema = z.object({ name: z.string().trim().min(1).max(24), color: z.string().trim().max(16).default("#587A8B"), kind: z.enum(["general", "skill"]).default("general") });
const mediaSchema = z.object({ assetId: z.string().regex(/^[-a-zA-Z0-9]+$/).max(128), mediaKind: z.enum(["image", "live_motion"]), fileName: z.string().trim().min(1).max(180), mimeType: z.string().trim().min(1).max(80), caption: nullableString(240), sortOrder: z.number().int().min(0).max(2000).default(0) });
const voiceSchema = z.object({ assetId: z.string().regex(/^[-a-zA-Z0-9]+$/).max(128), fileName: z.string().trim().min(1).max(180), mimeType: z.string().trim().min(1).max(80), durationMs: z.number().int().min(0).max(14_400_000).nullable().optional(), transcript: z.string().max(20_000), language: nullableString(16), transcriptionModel: z.string().trim().max(80).default("archive-restore"), consentedAt: z.string().datetime().nullable().optional() });
const eventSchema = z.object({
  archiveId: z.string().regex(/^event-\d+$/).max(64), occurredAt: z.number().int().min(-2208988800000).max(4102444800000), datePrecision: z.enum(["day", "month", "year"]), eventType: z.enum(["memory", "learning", "achievement", "chapter"]), title: z.string().trim().min(1).max(180), body: z.string().max(8000), ageLabel: nullableString(80), place: nullableString(180), color: z.string().trim().max(16).default("#EE623B"), track: z.enum(["career", "skills", "life", "hardware"]).default("life"), milestoneType: z.enum(["standard", "highlight", "turning_point", "gear_workflow", "reflection"]).default("standard"), milestoneWeight: z.number().int().min(1).max(5).default(1), comparisonGroup: nullableString(96), unlocksAt: z.number().int().min(0).max(4102444800000).nullable().optional(), phaseKeywords: z.array(z.string().trim().min(1).max(24)).max(8).default([]), mapLatitudeE6: z.number().int().min(-90_000_000).max(90_000_000).nullable().optional(), mapLongitudeE6: z.number().int().min(-180_000_000).max(180_000_000).nullable().optional(), locationPrivacy: z.enum(["none", "city", "precise"]).default("none"), soundtrackTitle: nullableString(120), soundtrackUrl: nullableString(1024), timelinePosition: z.number().int().min(0).max(10_000).default(0), tags: z.array(tagSchema.omit({ kind: true })).max(8).default([]), skills: z.array(tagSchema.omit({ kind: true })).max(8).default([]), media: z.array(mediaSchema).max(120).default([]), voiceNotes: z.array(voiceSchema).max(120).default([]),
});
const restoreDataSchema = z.object({
  format: z.literal("chronicle-growth-diary-full"), version: z.literal(1),
  diary: z.object({ title: z.string().trim().min(1).max(160), subtitle: nullableString(240), birthYear: z.number().int().min(1900).max(2200).nullable().optional(), educationStartYear: z.number().int().min(1900).max(2200).nullable().optional(), educationEndYear: z.number().int().min(1900).max(2200).nullable().optional(), careerStartYear: z.number().int().min(1900).max(2200).nullable().optional(), careerEndYear: z.number().int().min(1900).max(2200).nullable().optional(), childhoodStartYear: z.number().int().min(1900).max(2200).nullable().optional(), childhoodEndYear: z.number().int().min(1900).max(2200).nullable().optional(), aiEnabled: z.boolean().default(true), publicCoverTitle: nullableString(160), publicStoryLayout: z.enum(["editorial", "gallery", "minimal"]).default("editorial"), publicCoverAssetId: z.string().regex(/^[-a-zA-Z0-9]+$/).max(128).nullable().optional() }),
  tags: z.array(tagSchema).max(64).default([]), events: z.array(eventSchema).min(1).max(MAX_ARCHIVE_EVENTS), reflections: z.array(z.object({ phaseKey: z.string().trim().min(1).max(32), recap: z.string().max(3000), reflection: z.string().max(3000), model: z.string().trim().max(80) })).max(32).default([]), revisions: z.array(z.object({ eventArchiveId: z.string().regex(/^event-\d+$/), version: z.number().int().min(1).max(10_000), changeType: z.enum(["create", "update", "restore"]), snapshot: z.record(z.string(), z.unknown()) })).max(5_000).default([]),
});
const assetSchema = z.object({ id: z.string().regex(/^[-a-zA-Z0-9]+$/).max(128), kind: z.enum(["image", "live_motion", "voice", "cover"]), fileName: z.string().trim().min(1).max(180), mimeType: z.string().trim().min(1).max(80), byteLength: z.number().int().min(1).max(16 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/) });
export const fullArchiveRestoreInput = z.object({ data: restoreDataSchema, assets: z.array(assetSchema).max(120) });
export type FullArchiveRestoreInput = z.infer<typeof fullArchiveRestoreInput>;

export function buildFullArchiveRestoreAttachmentRows(input: FullArchiveRestoreInput) {
  const manifest = new Map(input.assets.map((asset) => [asset.id, asset]));
  const rows: Array<{ assetId: string; kind: "image" | "live_motion" | "voice" | "cover"; eventArchiveId: string | null; fileName: string; mimeType: string; byteLength: number; sha256: string; caption: string | null; sortOrder: number | null; durationMs: number | null; transcript: string | null; language: string | null; transcriptionModel: string | null }> = [];
  for (const event of input.data.events) {
    for (const media of event.media) {
      const asset = manifest.get(media.assetId);
      if (!asset || asset.kind !== media.mediaKind || asset.fileName !== media.fileName || asset.mimeType !== media.mimeType) throw new Error("封存附件與事件描述不一致。 ");
      rows.push({ assetId: asset.id, kind: asset.kind, eventArchiveId: event.archiveId, fileName: asset.fileName, mimeType: asset.mimeType, byteLength: asset.byteLength, sha256: asset.sha256, caption: media.caption, sortOrder: media.sortOrder, durationMs: null, transcript: null, language: null, transcriptionModel: null });
    }
    for (const voice of event.voiceNotes) {
      const asset = manifest.get(voice.assetId);
      if (!asset || asset.kind !== "voice" || asset.fileName !== voice.fileName || asset.mimeType !== voice.mimeType) throw new Error("封存語音附件與事件描述不一致。 ");
      rows.push({ assetId: asset.id, kind: "voice", eventArchiveId: event.archiveId, fileName: asset.fileName, mimeType: asset.mimeType, byteLength: asset.byteLength, sha256: asset.sha256, caption: null, sortOrder: null, durationMs: voice.durationMs ?? null, transcript: voice.transcript, language: voice.language, transcriptionModel: voice.transcriptionModel });
    }
  }
  const coverId = input.data.diary.publicCoverAssetId;
  if (coverId) {
    const asset = manifest.get(coverId);
    if (!asset || asset.kind !== "cover") throw new Error("封存封面附件描述不一致。 ");
    rows.push({ assetId: asset.id, kind: "cover", eventArchiveId: null, fileName: asset.fileName, mimeType: asset.mimeType, byteLength: asset.byteLength, sha256: asset.sha256, caption: null, sortOrder: null, durationMs: null, transcript: null, language: null, transcriptionModel: null });
  }
  if (rows.length !== manifest.size || new Set(rows.map((row) => row.assetId)).size !== rows.length) throw new Error("封存含有未指派或重複的附件。 ");
  return rows;
}

async function getPendingSession(db: DbClient, userId: number, restoreId: string) {
  const [session] = await db.select().from(growthArchiveRestoreSessions).where(and(eq(growthArchiveRestoreSessions.id, restoreId), eq(growthArchiveRestoreSessions.userId, userId))).limit(1);
  if (!session || session.status !== "pending" || session.expiresAt < Date.now()) throw new Error("還原工作階段已失效，請重新選擇封存檔。 ");
  return session;
}

export async function prepareFullArchiveRestore(db: DbClient, diary: GrowthDiary, userId: number, raw: FullArchiveRestoreInput) {
  const input = fullArchiveRestoreInput.parse(raw);
  const attachments = buildFullArchiveRestoreAttachmentRows(input);
  const id = crypto.randomUUID();
  await db.insert(growthArchiveRestoreSessions).values({ id, diaryId: diary.id, userId, payload: JSON.stringify(input.data), expiresAt: Date.now() + RESTORE_TTL_MS });
  if (attachments.length) await db.insert(growthArchiveRestoreAssets).values(attachments.map((asset) => ({ restoreId: id, ...asset })));
  return { restoreId: id, eventCount: input.data.events.length, assetCount: attachments.length, expiresAt: Date.now() + RESTORE_TTL_MS };
}

export async function stageFullArchiveRestoreAsset(db: DbClient, userId: number, input: { restoreId: string; assetId: string; base64: string }) {
  const session = await getPendingSession(db, userId, input.restoreId);
  const [asset] = await db.select().from(growthArchiveRestoreAssets).where(and(eq(growthArchiveRestoreAssets.restoreId, session.id), eq(growthArchiveRestoreAssets.assetId, input.assetId))).limit(1);
  if (!asset) throw new Error("找不到待還原附件。 ");
  if (asset.storageKey || asset.url) return { assetId: asset.assetId, alreadyStaged: true };
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.byteLength || bytes.byteLength > 16 * 1024 * 1024 || bytes.byteLength !== asset.byteLength || createHash("sha256").update(bytes).digest("hex") !== asset.sha256) throw new Error("還原附件完整性驗證失敗；目前日記沒有變更。 ");
  const stored = await storagePut(`growth-diary/${userId}/restore/${session.id}/${safeMediaName(asset.fileName)}`, bytes, asset.mimeType ?? "application/octet-stream");
  await db.update(growthArchiveRestoreAssets).set({ storageKey: stored.key, url: stored.url }).where(eq(growthArchiveRestoreAssets.id, asset.id));
  return { assetId: asset.assetId, alreadyStaged: false };
}

export async function cancelFullArchiveRestore(db: DbClient, userId: number, restoreId: string) {
  const session = await getPendingSession(db, userId, restoreId);
  await db.update(growthArchiveRestoreSessions).set({ status: "cancelled" }).where(eq(growthArchiveRestoreSessions.id, session.id));
  return { cancelled: true };
}

export async function commitFullArchiveRestore(db: DbClient, diary: GrowthDiary, userId: number, restoreId: string) {
  const session = await getPendingSession(db, userId, restoreId);
  if (session.diaryId !== diary.id) throw new Error("還原工作階段不屬於這本日記。 ");
  const data = restoreDataSchema.parse(JSON.parse(session.payload));
  const assets = await db.select().from(growthArchiveRestoreAssets).where(eq(growthArchiveRestoreAssets.restoreId, session.id));
  if (assets.some((asset) => !asset.storageKey || !asset.url)) throw new Error("附件尚未全部備妥，不能取代目前日記。 ");
  const assetById = new Map(assets.map((asset) => [asset.assetId, asset]));
  await db.transaction(async (tx) => {
    const currentEvents = await tx.select({ id: growthEvents.id }).from(growthEvents).where(eq(growthEvents.diaryId, diary.id));
    const currentIds = currentEvents.map((event) => event.id);
    if (currentIds.length) {
      await tx.delete(growthEventRevisions).where(inArray(growthEventRevisions.eventId, currentIds));
      await tx.delete(growthEventMedia).where(inArray(growthEventMedia.eventId, currentIds));
      await tx.delete(growthEventVoiceNotes).where(inArray(growthEventVoiceNotes.eventId, currentIds));
      await tx.delete(growthEventTags).where(inArray(growthEventTags.eventId, currentIds));
      await tx.delete(growthEvents).where(inArray(growthEvents.id, currentIds));
    }
    await tx.delete(growthPhaseReflections).where(eq(growthPhaseReflections.diaryId, diary.id));
    await tx.delete(growthTags).where(eq(growthTags.userId, userId));
    const knownTags = new Map<string, { color: string; kind: "general" | "skill" }>();
    for (const tag of data.tags) knownTags.set(`${tag.kind}:${tag.name}`, { color: tag.color, kind: tag.kind });
    for (const event of data.events) {
      event.tags.forEach((tag) => knownTags.set(`general:${tag.name}`, { color: tag.color, kind: "general" }));
      event.skills.forEach((tag) => knownTags.set(`skill:${tag.name}`, { color: tag.color, kind: "skill" }));
    }
    if (knownTags.size) await tx.insert(growthTags).values(Array.from(knownTags.entries()).map(([key, tag]) => ({ userId, name: key.slice(key.indexOf(":") + 1), color: tag.color, kind: tag.kind })));
    const restoredTags = await tx.select().from(growthTags).where(eq(growthTags.userId, userId));
    const tagIds = new Map(restoredTags.map((tag) => [`${tag.kind}:${tag.name}`, tag.id]));
    const eventIds = new Map<string, number>();
    for (let position = 0; position < data.events.length; position += 1) {
      const event = data.events[position]!;
      await tx.insert(growthEvents).values({ diaryId: diary.id, occurredAt: event.occurredAt, datePrecision: event.datePrecision, eventType: event.eventType, title: event.title, body: event.body, ageLabel: event.ageLabel, place: event.place, color: event.color, track: event.track, milestoneType: event.milestoneType, milestoneWeight: event.milestoneWeight, comparisonGroup: event.comparisonGroup, unlocksAt: event.unlocksAt ?? null, phaseKeywords: JSON.stringify(event.phaseKeywords), mapLatitudeE6: event.mapLatitudeE6 ?? null, mapLongitudeE6: event.mapLongitudeE6 ?? null, locationPrivacy: event.locationPrivacy, soundtrackTitle: event.soundtrackTitle, soundtrackUrl: event.soundtrackUrl, shareScope: "private", isPublic: false, timelinePosition: position });
      const [created] = await tx.select().from(growthEvents).where(eq(growthEvents.diaryId, diary.id)).orderBy(desc(growthEvents.id)).limit(1);
      if (!created) throw new Error("無法寫入還原事件。 ");
      eventIds.set(event.archiveId, created.id);
      const linkedTags = [...event.tags.map((tag: { name: string }) => tagIds.get(`general:${tag.name}`)), ...event.skills.map((tag: { name: string }) => tagIds.get(`skill:${tag.name}`))].filter((id): id is number => Boolean(id));
      if (linkedTags.length) await tx.insert(growthEventTags).values(linkedTags.map((tagId) => ({ eventId: created.id, tagId })));
      for (const media of event.media) {
        const asset = assetById.get(media.assetId);
        if (!asset?.storageKey || !asset.url) throw new Error("還原附件暫存遺失。 ");
        await tx.insert(growthEventMedia).values({ eventId: created.id, storageKey: asset.storageKey, url: asset.url, fileName: asset.fileName, mimeType: asset.mimeType ?? "application/octet-stream", mediaKind: media.mediaKind, caption: media.caption, sortOrder: media.sortOrder });
      }
      for (const voice of event.voiceNotes) {
        const asset = assetById.get(voice.assetId);
        if (!asset?.storageKey || !asset.url) throw new Error("還原語音暫存遺失。 ");
        await tx.insert(growthEventVoiceNotes).values({ eventId: created.id, storageKey: asset.storageKey, url: asset.url, fileName: asset.fileName, mimeType: asset.mimeType ?? "application/octet-stream", durationMs: voice.durationMs ?? null, transcript: voice.transcript, language: voice.language, transcriptionModel: voice.transcriptionModel, consentedAt: new Date() });
      }
    }
    for (const revision of data.revisions) {
      const eventId = eventIds.get(revision.eventArchiveId);
      if (eventId) await tx.insert(growthEventRevisions).values({ eventId, version: revision.version, changeType: revision.changeType, snapshot: JSON.stringify(revision.snapshot) });
    }
    if (data.reflections.length) await tx.insert(growthPhaseReflections).values(data.reflections.map((reflection) => ({ diaryId: diary.id, phaseKey: reflection.phaseKey, recap: reflection.recap, reflection: reflection.reflection, model: reflection.model })));
    const cover = data.diary.publicCoverAssetId ? assetById.get(data.diary.publicCoverAssetId) : null;
    await tx.update(growthDiaries).set({ title: data.diary.title, subtitle: data.diary.subtitle, birthYear: data.diary.birthYear ?? null, educationStartYear: data.diary.educationStartYear ?? null, educationEndYear: data.diary.educationEndYear ?? null, careerStartYear: data.diary.careerStartYear ?? null, careerEndYear: data.diary.careerEndYear ?? null, childhoodStartYear: data.diary.childhoodStartYear ?? null, childhoodEndYear: data.diary.childhoodEndYear ?? null, aiEnabled: data.diary.aiEnabled, shareMode: "private", shareSlug: null, shareTokenHash: null, sharePasswordHash: null, shareExpiresAt: null, publicCoverStorageKey: cover?.storageKey ?? null, publicCoverUrl: cover?.url ?? null, publicCoverTitle: data.diary.publicCoverTitle, publicStoryLayout: data.diary.publicStoryLayout, shareAccessCount: 0, lastSharedAt: null }).where(eq(growthDiaries.id, diary.id));
    await tx.delete(growthShareAccessLogs).where(eq(growthShareAccessLogs.diaryId, diary.id));
    await tx.update(growthArchiveRestoreSessions).set({ status: "committed" }).where(eq(growthArchiveRestoreSessions.id, session.id));
  });
  return { restoredEventCount: data.events.length, restoredAssetCount: assets.length };
}
