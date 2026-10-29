import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isNativeWebView } from "@/lib/native-shell";
import { getToken } from "@/lib/api/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Giao Hàng Nhanh — Báo giờ xe" },
      {
        name: "description",
        content: "GHN — báo giờ xe đến/đi tại văn phòng.",
      },
    ],
  }),
  component: IndexPage,
});

function homeForRole(role: string): string {
  if (role === "AD") return "/tong-quan";
  return "/cham-xe";
}

function IndexPage() {
  const { session, hydrated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hydrated) return;
    if (session) {
      navigate({ to: homeForRole(session.role), replace: true });
      return;
    }
    navigate({ to: "/login", replace: true });
  }, [hydrated, session, navigate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Đang tải…
      </div>
    );
  }

  if (!session && isNativeWebView() && !getToken()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Đang kết nối ứng dụng…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Đang chuyển hướng…
    </div>
  );
}
