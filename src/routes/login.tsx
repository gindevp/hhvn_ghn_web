import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isNativeWebView } from "@/lib/native-shell";
import { getToken } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ghnLogo from "@/assets/logo-ghn.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — Giao Hàng Nhanh" },
      {
        name: "description",
        content: "Đăng nhập hệ thống báo giờ xe đến/đi — Giao Hàng Nhanh (GHN).",
      },
    ],
  }),
  component: LoginPage,
});

function homeForRole(role: string): string {
  if (role === "AD") return "/tong-quan";
  return "/cham-xe";
}

function LoginPage() {
  const { session, hydrated, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giveUpNative, setGiveUpNative] = useState(false);

  useEffect(() => {
    if (!isNativeWebView()) return;
    const t = window.setTimeout(() => setGiveUpNative(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session) {
      navigate({ to: homeForRole(session.role), replace: true });
    }
  }, [hydrated, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu. (E-AUTH-001)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 200));
      const r = await login(username, password);
      if (!r.ok) {
        setError(`${r.error} (E-AUTH-001)`);
      } else {
        toast.success("Đăng nhập thành công");
        navigate({ to: homeForRole(r.role) });
      }
    } finally {
      setLoading(false);
    }
  };

  if (isNativeWebView() && (session || getToken()) && !error && !giveUpNative) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Đang vào hệ thống…
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(1200px 600px at -10% -20%, rgba(255,115,0,0.35), transparent 60%), radial-gradient(900px 500px at 110% 110%, rgba(0,126,212,0.35), transparent 55%)",
          }}
        />
        <header className="relative z-10 flex items-center gap-3 px-10 pt-10">
          <img src={ghnLogo} alt="Giao Hàng Nhanh" className="h-10 w-auto max-w-[11rem] object-contain" />
        </header>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-10">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">Giao Hàng Nhanh</h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">
            Hệ thống báo giờ xe đến/đi tại văn phòng — chấm xe, tổng quan và nhật ký báo theo thời gian thực.
          </p>
        </div>

        <footer className="relative z-10 px-10 pb-8 text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} Giao Hàng Nhanh — Báo giờ xe
        </footer>
      </aside>

      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={ghnLogo} alt="Giao Hàng Nhanh" className="h-10 w-auto max-w-[10rem] object-contain" />
            <div>
              <div className="text-base font-semibold">Giao Hàng Nhanh</div>
              <div className="text-xs text-muted-foreground">Báo giờ xe đến/đi</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Đăng nhập</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tài khoản nội bộ báo giờ xe</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u">Tài khoản / Email</Label>
              <Input
                id="u"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vd: dieu.hanh"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="p"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Ẩn" : "Hiện"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đăng nhập
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
