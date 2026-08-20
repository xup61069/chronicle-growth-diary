export type FamilyDiaryAccessRole = "owner" | "editor" | "commenter";

export function canEditFamilyDiary(role: FamilyDiaryAccessRole) {
  return role === "owner" || role === "editor";
}

export function canManageFamilyDiarySettings(role: FamilyDiaryAccessRole) {
  return role === "owner";
}

export function canManageAnnualReview(role: FamilyDiaryAccessRole) {
  return role === "owner";
}

export function describeFamilyAuditAction(action: string) {
  switch (action) {
    case "invite_created": return "建立邀請";
    case "invite_accepted": return "接受邀請";
    case "member_role_updated": return "調整成員角色";
    case "member_removed": return "移除成員";
    case "comment_created": return "發表註解";
    default: return "更新協作紀錄";
  }
}
