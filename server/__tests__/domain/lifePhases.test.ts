import { describe, expect, it } from "vitest";
import { deriveLifePhases, getInvalidLifePhaseBoundary, inferLifePhaseKey } from "../../lifePhases";

describe("personal growth life phases", () => {
  const anchors = { birthYear: 1990, educationStartYear: 1996, careerStartYear: 2012 };

  it("classifies events using configured year anchors", () => {
    expect(inferLifePhaseKey({ occurredAt: new Date(1994, 4, 1).getTime(), eventType: "memory" }, anchors)).toBe("childhood");
    expect(inferLifePhaseKey({ occurredAt: new Date(2004, 4, 1).getTime(), eventType: "learning" }, anchors)).toBe("education");
    expect(inferLifePhaseKey({ occurredAt: new Date(2020, 4, 1).getTime(), eventType: "achievement" }, anchors)).toBe("career");
  });

  it("prefers a written age label when it is available", () => {
    expect(inferLifePhaseKey({ occurredAt: new Date(2020, 0, 1).getTime(), eventType: "achievement", ageLabel: "8 歲" }, anchors)).toBe("education");
  });

  it("uses manually adjusted phase boundaries when no age is written", () => {
    const manualAnchors = { ...anchors, childhoodEndYear: 2001, educationEndYear: 2010 };
    expect(inferLifePhaseKey({ occurredAt: new Date(2001, 11, 1).getTime(), eventType: "memory" }, manualAnchors)).toBe("childhood");
    expect(inferLifePhaseKey({ occurredAt: new Date(2006, 0, 1).getTime(), eventType: "memory" }, manualAnchors)).toBe("education");
  });

  it("creates only the phases that contain remembered events", () => {
    const phases = deriveLifePhases([
      { occurredAt: new Date(1994, 0, 1).getTime(), eventType: "memory" as const },
      { occurredAt: new Date(2018, 0, 1).getTime(), eventType: "achievement" as const },
    ], anchors);
    expect(phases.map((phase) => phase.key)).toEqual(["childhood", "career"]);
  });

  it("rejects a manually adjusted phase whose end year precedes its start year", () => {
    expect(getInvalidLifePhaseBoundary({ educationStartYear: 2008, educationEndYear: 2007 })?.key).toBe("education");
    expect(getInvalidLifePhaseBoundary({ educationStartYear: 2008, educationEndYear: 2010 })).toBeUndefined();
  });
});
