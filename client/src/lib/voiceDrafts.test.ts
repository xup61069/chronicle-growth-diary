import { describe, expect, it } from "vitest";
import { formatVoiceDuration, makeVoiceDraftFileName } from "./voiceDrafts";

describe("voice draft helpers", () => {
  it("uses a timestamped safe filename that matches the recorded MIME type", () => {
    expect(makeVoiceDraftFileName("audio/webm", Date.UTC(2026, 0, 2, 3, 4, 5))).toBe("voice-note-2026-01-02T03-04-05-000Z.webm");
    expect(makeVoiceDraftFileName("audio/mpeg", 0)).toMatch(/\.mp3$/);
  });

  it("formats local recording duration for compact status copy", () => {
    expect(formatVoiceDuration(0)).toBe("0:00");
    expect(formatVoiceDuration(61_200)).toBe("1:01");
  });
});
