import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function LocalAuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const onSuccess = async () => {
    setError(null);
    setPassword("");
    await utils.auth.me.invalidate();
  };

  const register = trpc.auth.localRegister.useMutation({
    onSuccess,
    onError: (reason) => setError(reason.message),
  });
  const login = trpc.auth.localLogin.useMutation({
    onSuccess,
    onError: (reason) => setError(reason.message),
  });
  const isPending = register.isPending || login.isPending;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (mode === "register") {
      register.mutate({ name, email, password });
      return;
    }
    login.mutate({ email, password });
  };

  return (
    <form onSubmit={submit} className="mt-6 w-full max-w-sm space-y-3 text-left">
      {mode === "register" ? (
        <div className="space-y-1.5">
          <Label htmlFor="local-auth-name">顯示名稱</Label>
          <Input
            id="local-auth-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="local-auth-email">Email</Label>
        <Input
          id="local-auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="local-auth-password">密碼</Label>
        <Input
          id="local-auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={12}
          required
        />
        {mode === "register" ? <p className="text-xs text-muted-foreground">至少 12 個字元；密碼只會儲存為不可逆雜湊。</p> : null}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" className="archive-signin-button w-full" disabled={isPending}>
        {isPending ? "正在驗證…" : mode === "register" ? "建立本機帳號" : "登入並開始編輯"}
      </Button>
      <button
        type="button"
        className="w-full text-center text-sm underline underline-offset-4"
        onClick={() => {
          setMode((value) => (value === "login" ? "register" : "login"));
          setError(null);
        }}
      >
        {mode === "login" ? "第一次使用？建立本機帳號" : "已有帳號？改為登入"}
      </button>
    </form>
  );
}
