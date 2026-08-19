import { eq } from "drizzle-orm";
import { InsertUser, User, users } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("資料庫暫時無法連線，請稍後再試。");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createLocalUser(input: {
  openId: string;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const db = await requireDb();
  await db.insert(users).values({
    openId: input.openId,
    email: input.email,
    name: input.name,
    loginMethod: "local",
    passwordHash: input.passwordHash,
    emailVerified: false,
  });
  const user = await getUserByOpenId(input.openId);
  if (!user) throw new Error("無法建立本機帳號。");
  return user;
}

/** Removes the account and all diary metadata through the schema's cascading foreign keys.
 * Uploaded media keys are deliberately left unreferenced, following the storage provider lifecycle contract. */
export async function deleteAccount(userId: number) {
  const db = await requireDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing[0]) throw new Error("找不到要刪除的帳號。");
  await db.delete(users).where(eq(users.id, userId));
  return { deleted: true } as const;
}
