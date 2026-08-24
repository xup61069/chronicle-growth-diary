import type { Express } from "express";
import { getDb } from "../db";
import { getOnThisDayIcsByToken } from "../db/onThisDayFeed";

export function registerOnThisDayFeedRoute(app: Express) {
  app.get("/api/feeds/on-this-day/:token.ics", async (request, response) => {
    const token = request.params.token;
    if (!token || token.length < 16 || token.length > 128)
      return response.sendStatus(401);
    const db = await getDb();
    if (!db) return response.sendStatus(503);
    const feed = await getOnThisDayIcsByToken(db, token);
    if (!feed) return response.sendStatus(401);
    response.setHeader("Cache-Control", "no-store");
    response.type("text/calendar; charset=utf-8").status(200).send(feed);
  });
}
