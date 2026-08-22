import { describe, expect, it } from "vitest";
import { diffFamilyAudience, effectiveFamilyAudienceMemberIds, familyAudienceRosterSignature } from "./familyAudiencePreview";

const members = [{ id: 11 }, { id: 12 }, { id: 13 }];

describe("family audience preview", () => {
  it("shows the effective additions and removals without retaining inactive member IDs", () => {
    const diff = diffFamilyAudience(
      { mode: "selected_members", memberIds: [11, 12, 99] },
      { mode: "selected_members", memberIds: [12, 13, 99] },
      members,
    );
    expect(diff).toMatchObject({ currentMemberIds: [11, 12], proposedMemberIds: [12, 13], addedMemberIds: [13], removedMemberIds: [11], policyChanged: false, hasChange: true });
    expect(effectiveFamilyAudienceMemberIds({ mode: "selected_members", memberIds: [99] }, members)).toEqual([]);
  });

  it("requires a preview for policy changes even when the currently effective audience is unchanged", () => {
    const diff = diffFamilyAudience(
      { mode: "all_accepted", memberIds: [] },
      { mode: "selected_members", memberIds: [11, 12, 13] },
      members,
    );
    expect(diff).toMatchObject({ addedMemberIds: [], removedMemberIds: [], policyChanged: true, hasChange: true });
  });

  it("makes a stable roster signature so a refreshed family member query can invalidate a local preview", () => {
    expect(familyAudienceRosterSignature([{ id: 13 }, { id: 11 }, { id: 13 }])).toBe("11,13");
    expect(familyAudienceRosterSignature(members)).toBe("11,12,13");
  });
});
