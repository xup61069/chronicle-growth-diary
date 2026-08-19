import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, LockKeyhole } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function FamilyInviteContent() {
  const [location, navigate] = useLocation();
  const token = new URLSearchParams(location.split("?")[1] ?? "").get("token") ?? "";
  const acceptMutation = trpc.diary.acceptFamilyInvite.useMutation({
    onSuccess: (result) => {
      toast.success("已加入這本私人家庭成長史。");
      navigate(`/editor?diary=${result.diaryId}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return <main className="family-invite-page"><p className="editor-kicker"><span /> FAMILY ARCHIVE / INVITATION</p><h1>接受家庭共寫邀請</h1><p>這個邀請只會把你加入指定的私人日記。你的帳號 email 必須與邀請指定的收件地址一致，且連結只能使用一次。</p>{token ? <button type="button" onClick={() => acceptMutation.mutate({ token })} disabled={acceptMutation.isPending}>{acceptMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 接受邀請並進入日記</button> : <div className="family-invite-invalid"><LockKeyhole size={18} /><p>邀請連結格式無效或缺少一次性代碼。</p></div>}</main>;
}

export default function FamilyInvite() {
  return <DashboardLayout><FamilyInviteContent /></DashboardLayout>;
}
