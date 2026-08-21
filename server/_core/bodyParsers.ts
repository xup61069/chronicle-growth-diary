import express, { type ErrorRequestHandler, type Express } from "express";

export const GENERAL_BODY_LIMIT = "2mb";
export const TRPC_BODY_LIMIT = "25mb";

/**
 * Limits ordinary JSON/form endpoints while retaining enough room for the
 * bounded base64 image and voice payloads accepted by the authenticated tRPC
 * router. Upload bytes are persisted through the storage provider afterwards.
 */
export function registerRequestBodyParsers(app: Express) {
  app.use("/api/trpc", express.json({ limit: TRPC_BODY_LIMIT }));
  app.use(express.json({ limit: GENERAL_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: GENERAL_BODY_LIMIT, extended: true }));
}

/** Converts parser-specific payload errors into a stable public API response. */
export const handleRequestBodyParserError: ErrorRequestHandler = (error, _req, res, next) => {
  if (typeof error === "object" && error !== null && (error as { type?: unknown }).type === "entity.too.large") {
    res.status(413).json({ error: "request-body-too-large" });
    return;
  }
  next(error);
};
