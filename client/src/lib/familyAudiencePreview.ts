export type FamilyAudienceMode = "all_accepted" | "selected_members";

export type FamilyAudienceMember = {
  id: number;
};

export type FamilyAudienceSelection = {
  mode: FamilyAudienceMode;
  memberIds: number[];
};

export type FamilyAudienceDiff = {
  currentMemberIds: number[];
  proposedMemberIds: number[];
  addedMemberIds: number[];
  removedMemberIds: number[];
  policyChanged: boolean;
  hasChange: boolean;
  rosterSignature: string;
  proposedFingerprint: string;
};

function uniqueSorted(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isSafeInteger(value) && value > 0))).sort((left, right) => left - right);
}

export function familyAudienceRosterSignature(members: FamilyAudienceMember[]) {
  return uniqueSorted(members.map((member) => member.id)).join(",");
}

export function effectiveFamilyAudienceMemberIds(selection: FamilyAudienceSelection, members: FamilyAudienceMember[]) {
  const memberIds = uniqueSorted(members.map((member) => member.id));
  if (selection.mode === "all_accepted") return memberIds;
  const accepted = new Set(memberIds);
  return uniqueSorted(selection.memberIds).filter((memberId) => accepted.has(memberId));
}

export function familyAudienceFingerprint(selection: FamilyAudienceSelection) {
  return `${selection.mode}:${uniqueSorted(selection.memberIds).join(",")}`;
}

export function diffFamilyAudience(current: FamilyAudienceSelection, proposed: FamilyAudienceSelection, members: FamilyAudienceMember[]): FamilyAudienceDiff {
  const currentMemberIds = effectiveFamilyAudienceMemberIds(current, members);
  const proposedMemberIds = effectiveFamilyAudienceMemberIds(proposed, members);
  const currentIds = new Set(currentMemberIds);
  const proposedIds = new Set(proposedMemberIds);
  const addedMemberIds = proposedMemberIds.filter((memberId) => !currentIds.has(memberId));
  const removedMemberIds = currentMemberIds.filter((memberId) => !proposedIds.has(memberId));
  const policyChanged = current.mode !== proposed.mode;
  return {
    currentMemberIds,
    proposedMemberIds,
    addedMemberIds,
    removedMemberIds,
    policyChanged,
    hasChange: policyChanged || addedMemberIds.length > 0 || removedMemberIds.length > 0,
    rosterSignature: familyAudienceRosterSignature(members),
    proposedFingerprint: familyAudienceFingerprint(proposed),
  };
}
