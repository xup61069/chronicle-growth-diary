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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

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
    shareMode: mysqlEnum("shareMode", ["private", "public", "link"]).notNull().default("private"),
    shareSlug: varchar("shareSlug", { length: 96 }).unique(),
    shareTokenHash: varchar("shareTokenHash", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("growth_diaries_user_idx").on(table.userId)],
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
    caption: varchar("caption", { length: 240 }),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("growth_event_media_event_idx").on(table.eventId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GrowthDiary = typeof growthDiaries.$inferSelect;
export type GrowthEvent = typeof growthEvents.$inferSelect;
export type GrowthTag = typeof growthTags.$inferSelect;
export type GrowthEventMedia = typeof growthEventMedia.$inferSelect;
