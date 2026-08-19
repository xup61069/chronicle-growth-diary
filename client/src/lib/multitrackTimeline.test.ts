import { buildTrackRows, filterEventsBySkill, getTimelineInsights, getTimelineSkills, isTimeCapsuleLocked } from "./multitrackTimeline";
import { describe, expect, it } from "vitest";

const events = [
  { id: 1, occurredAt: 100, title: "完成作品", color: "#EE623B", track: "career" as const, milestoneType: "highlight" as const, milestoneWeight: 5, skills: [{ id: 1, name: "Ableton Live" }], phaseKeywords: ["專業化"] },
  { id: 2, occurredAt: 200, title: "學習工作流", color: "#587A8B", track: "skills" as const, milestoneType: "gear_workflow" as const, milestoneWeight: 3, skills: [{ id: 2, name: "Ableton Live" }, { id: 3, name: "色彩校準" }], phaseKeywords: ["專業化", "探索"] },
  { id: 3, occurredAt: 300, title: "寫給未來", color: "#78976D", track: "life" as const, milestoneType: "reflection" as const, milestoneWeight: 2, skills: [], phaseKeywords: ["反思"], unlocksAt: 500 },
];

describe("multitrack timeline helpers", () => {
  it("collects unique skills and filters all tracks by a selected skill", () => {
    expect(getTimelineSkills(events)).toEqual(expect.arrayContaining(["Ableton Live", "色彩校準"]));
    expect(filterEventsBySkill(events, "ableton live").map((event) => event.id)).toEqual([1, 2]);
    expect(buildTrackRows(events, "Ableton Live", 400).map((row) => row.events.length)).toEqual([1, 1, 0, 0]);
  });

  it("keeps future capsules locked and reports meaningful milestone insight counts", () => {
    expect(isTimeCapsuleLocked(events[2], 400)).toBe(true);
    expect(isTimeCapsuleLocked(events[2], 500)).toBe(false);
    expect(getTimelineInsights(events)).toMatchObject({ eventCount: 3, projectCount: 1, highlightCount: 1, turningPointCount: 0, totalWeight: 10, leadingSkill: "Ableton Live", leadingPhaseKeyword: "專業化" });
  });
});
