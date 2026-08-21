import {
  bigint,
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  emailVerified: boolean("emailVerified").notNull().default(false),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => [uniqueIndex("users_email_unique_idx").on(table.email)]);

/** One private, long-lived story canvas for each person. */
export const growthDiaries = mysqlTable(
  "growth_diaries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull().default("我的成長史"),
    subtitle: varchar("subtitle", { length: 240 }),
    birthYear: int("birthYear"),
    educationStartYear: int("educationStartYear"),
    careerStartYear: int("careerStartYear"),
    childhoodStartYear: int("childhoodStartYear"),
    childhoodEndYear: int("childhoodEndYear"),
    educationEndYear: int("educationEndYear"),
    careerEndYear: int("careerEndYear"),
    aiEnabled: boolean("aiEnabled").notNull().default(true),
    shareMode: mysqlEnum("shareMode", ["private", "public", "link"]).notNull().default("private"),
    shareSlug: varchar("shareSlug", { length: 96 }).unique(),
    shareTokenHash: varchar("shareTokenHash", { length: 128 }),
    sharePasswordHash: varchar("sharePasswordHash", { length: 256 }),
    shareExpiresAt: bigint("shareExpiresAt", { mode: "number" }),
    publicCoverStorageKey: varchar("publicCoverStorageKey", { length: 512 }),
    publicCoverUrl: varchar("publicCoverUrl", { length: 1024 }),
    publicCoverTitle: varchar("publicCoverTitle", { length: 160 }),
    publicStoryLayout: mysqlEnum("publicStoryLayout", ["editorial", "gallery", "minimal"]).notNull().default("editorial"),
    shareAccessCount: int("shareAccessCount").notNull().default(0),
    lastSharedAt: timestamp("lastSharedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("growth_diaries_user_idx").on(table.userId)],
);

/** Owner-only controls and minimal execution state for private recall checks. */
export const growthDiaryRecallPreferences = mysqlTable(
  "growth_diary_recall_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    timezoneOffsetMinutes: int("timezoneOffsetMinutes").notNull().default(0),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    lastCheckedAt: bigint("lastCheckedAt", { mode: "number" }),
    lastOnThisDayCount: int("lastOnThisDayCount").notNull().default(0),
    lastFutureLetterCount: int("lastFutureLetterCount").notNull().default(0),
    lastCheckStatus: varchar("lastCheckStatus", { length: 32 }).notNull().default("never"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("growth_diary_recall_preferences_diary_unique_idx").on(table.diaryId),
    index("growth_diary_recall_preferences_task_uid_idx").on(table.scheduleCronTaskUid),
  ],
);

/** A dated personal memory, learning moment, achievement, or chapter. */
export const growthEvents = mysqlTable(
  "growth_events",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    occurredAt: bigint("occurredAt", { mode: "number" }).notNull(),
    datePrecision: mysqlEnum("datePrecision", ["day", "month", "year"]).notNull().default("day"),
    eventType: mysqlEnum("eventType", ["memory", "learning", "achievement", "chapter"]).notNull().default("memory"),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    ageLabel: varchar("ageLabel", { length: 80 }),
    place: varchar("place", { length: 180 }),
    color: varchar("color", { length: 16 }).notNull().default("#EE623B"),
    track: mysqlEnum("track", ["career", "skills", "life", "hardware"]).notNull().default("life"),
    milestoneType: mysqlEnum("milestoneType", ["standard", "highlight", "turning_point", "gear_workflow", "reflection"]).notNull().default("standard"),
    milestoneWeight: int("milestoneWeight").notNull().default(1),
    comparisonGroup: varchar("comparisonGroup", { length: 96 }),
    unlocksAt: bigint("unlocksAt", { mode: "number" }),
    phaseKeywords: text("phaseKeywords"),
    mapLatitudeE6: int("mapLatitudeE6"),
    mapLongitudeE6: int("mapLongitudeE6"),
    locationPrivacy: mysqlEnum("locationPrivacy", ["none", "city", "precise"]).notNull().default("none"),
    soundtrackTitle: varchar("soundtrackTitle", { length: 120 }),
    soundtrackUrl: varchar("soundtrackUrl", { length: 1024 }),
    shareScope: mysqlEnum("shareScope", ["private", "public", "link"]).notNull().default("private"),
    isPublic: boolean("isPublic").notNull().default(false),
    timelinePosition: int("timelinePosition").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("growth_events_diary_date_idx").on(table.diaryId, table.occurredAt),
  ],
);

/** Reusable personal labels such as family, school, travel, or music. */
export const growthTags = mysqlTable(
  "growth_tags",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 24 }).notNull(),
    color: varchar("color", { length: 16 }).notNull().default("#587A8B"),
    kind: mysqlEnum("kind", ["general", "skill"]).notNull().default("general"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("growth_tags_user_name_idx").on(table.userId, table.name)],
);

/** A many-to-many link that lets one memory hold multiple personal labels. */
export const growthEventTags = mysqlTable(
  "growth_event_tags",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
    tagId: int("tagId").notNull().references(() => growthTags.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("growth_event_tags_pair_idx").on(table.eventId, table.tagId)],
);

/** Metadata only; the original media bytes reside in private project storage. */
export const growthEventMedia = mysqlTable(
  "growth_event_media",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    fileName: varchar("fileName", { length: 180 }).notNull(),
    mimeType: varchar("mimeType", { length: 80 }).notNull(),
    mediaKind: mysqlEnum("mediaKind", ["image", "live_motion"]).notNull().default("image"),
    caption: varchar("caption", { length: 240 }),
    shareSafeStorageKey: varchar("shareSafeStorageKey", { length: 512 }),
    shareSafeUrl: varchar("shareSafeUrl", { length: 1024 }),
    shareSafeFileName: varchar("shareSafeFileName", { length: 180 }),
    shareSafeMimeType: varchar("shareSafeMimeType", { length: 80 }),
    shareSafeEnabled: boolean("shareSafeEnabled").notNull().default(false),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("growth_event_media_event_idx").on(table.eventId)],
);

/** Private voice recordings and Whisper transcripts attached to a single event. */
export const growthEventVoiceNotes = mysqlTable(
  "growth_event_voice_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    fileName: varchar("fileName", { length: 180 }).notNull(),
    mimeType: varchar("mimeType", { length: 80 }).notNull(),
    durationMs: int("durationMs"),
    transcript: text("transcript").notNull(),
    language: varchar("language", { length: 16 }),
    transcriptionModel: varchar("transcriptionModel", { length: 80 }).notNull().default("whisper-1"),
    consentedAt: timestamp("consentedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("growth_event_voice_notes_event_idx").on(table.eventId, table.createdAt)],
);

/** Immutable snapshots of a personal event after a meaningful content change. */
export const growthEventRevisions = mysqlTable(
  "growth_event_revisions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
    version: int("version").notNull(),
    changeType: mysqlEnum("changeType", ["create", "update", "restore"]).notNull(),
    snapshot: text("snapshot").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("growth_event_revisions_event_version_idx").on(table.eventId, table.version),
    index("growth_event_revisions_event_created_idx").on(table.eventId, table.createdAt),
  ],
);

/** A user-approved AI recap attached to a single stage of the personal story. */
export const growthPhaseReflections = mysqlTable(
  "growth_phase_reflections",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    phaseKey: varchar("phaseKey", { length: 32 }).notNull(),
    recap: text("recap").notNull(),
    reflection: text("reflection").notNull(),
    model: varchar("model", { length: 80 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("growth_phase_reflection_unique").on(table.diaryId, table.phaseKey)],
);

/** Minimal, privacy-respecting access log for the owner’s share analytics. */
export const growthShareAccessLogs = mysqlTable(
  "growth_share_access_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    channel: mysqlEnum("channel", ["public", "link"]).notNull(),
    accessedAt: timestamp("accessedAt").defaultNow().notNull(),
  },
  (table) => [index("growth_share_access_diary_idx").on(table.diaryId, table.accessedAt)],
);

/** Accepted collaborators scoped to one private diary. */
export const growthDiaryMembers = mysqlTable(
  "growth_diary_members",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["editor", "commenter"]).notNull().default("commenter"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("growth_diary_members_diary_user_idx").on(table.diaryId, table.userId)],
);

/** Hashed, expiring invitations; the plaintext token is never persisted. */
export const growthDiaryInvites = mysqlTable(
  "growth_diary_invites",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    invitedByUserId: int("invitedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["editor", "commenter"]).notNull().default("commenter"),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
    expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("growth_diary_invites_diary_idx").on(table.diaryId)],
);

/** Private collaborator discussion attached to a single timeline event. */
export const growthEventComments = mysqlTable(
  "growth_event_comments",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
    authorUserId: int("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("growth_event_comments_event_idx").on(table.eventId, table.createdAt)],
);

/** Private, member-created reactions attached to a single timeline event. */
export const growthEventReactions = mysqlTable(
  "growth_event_reactions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("eventId").notNull().references(() => growthEvents.id, { onDelete: "cascade" }),
    authorUserId: int("authorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    reaction: mysqlEnum("reaction", ["heart", "spark", "celebrate", "support"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("growth_event_reactions_event_idx").on(table.eventId, table.createdAt),
    uniqueIndex("growth_event_reactions_unique_idx").on(table.eventId, table.authorUserId, table.reaction),
  ],
);

/** Append-only accountability record for family collaboration actions. */
export const growthDiaryAuditLogs = mysqlTable(
  "growth_diary_audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    diaryId: int("diaryId").notNull().references(() => growthDiaries.id, { onDelete: "cascade" }),
    actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    action: mysqlEnum("action", ["invite_created", "invite_accepted", "member_role_updated", "member_removed", "comment_created", "reaction_added", "reaction_removed"]).notNull(),
    targetType: varchar("targetType", { length: 32 }).notNull(),
    targetId: int("targetId"),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("growth_diary_audit_diary_idx").on(table.diaryId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GrowthDiary = typeof growthDiaries.$inferSelect;
export type GrowthEvent = typeof growthEvents.$inferSelect;
export type GrowthTag = typeof growthTags.$inferSelect;
export type GrowthEventMedia = typeof growthEventMedia.$inferSelect;
export type GrowthEventVoiceNote = typeof growthEventVoiceNotes.$inferSelect;
export type GrowthEventRevision = typeof growthEventRevisions.$inferSelect;
export type GrowthPhaseReflection = typeof growthPhaseReflections.$inferSelect;
export type GrowthDiaryMember = typeof growthDiaryMembers.$inferSelect;
export type GrowthDiaryInvite = typeof growthDiaryInvites.$inferSelect;
export type GrowthEventComment = typeof growthEventComments.$inferSelect;
export type GrowthEventReaction = typeof growthEventReactions.$inferSelect;
export type GrowthDiaryAuditLog = typeof growthDiaryAuditLogs.$inferSelect;
