import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { useState, useEffect, useRef, type ReactNode } from "react";
import ghnLogo from "@/assets/logo-ghn.png";
import {
  LayoutDashboard,
  Building2,
  Users2,
  Menu,
  X,
  LogOut,
  ClipboardList,
  ShieldCheck,
  MonitorSmartphone,
  KeyRound,
  ChevronDown,
  Settings2,
  Truck,
} from "lucide-react";
import { changeActiveOffice, useAuth } from "@/lib/auth";
import { useAllowedOffices } from "@/lib/allowed-offices";
import { toast } from "sonner";
import { ROLE_LABELS, officeName } from "@/lib/mock-data";
import { canRead, useRbacVersion, type ScreenKey } from "@/lib/rbac";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useStore } from "@/lib/store";
import { hasAllOfficeScope, resolveViewOffice, VIEW_ALL_OFFICES, adminOfficeSelectOptions } from "@/lib/office-scope";
import { isNativeWebView } from "@/lib/native-shell";
import { OrderHistoryProvider } from "@/components/OrderHistoryDialog";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { getToken } from "@/lib/api/client";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  screen: ScreenKey;
  shortLabel?: string;
};
type NavGroup = { title: string; items: NavItem[] };

/** Bề rộng thanh rail khi thu gọn — vừa đủ thấy icon để hover vào. */
const SIDEBAR_RAIL_W = "w-14";
/** Trễ khi rời chuột để menu không giật khi đi chéo qua. */
const SIDEBAR_CLOSE_DELAY_MS = 140;

/** Desktop: mặc định thu gọn thành rail icon, hover thì sổ ra và đẩy nội dung như bấm nút menu. */
function useDesktopSidebarHover() {
  const [hovering, setHovering] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  useEffect(() => clearCloseTimer, []);

  const openByHover = () => {
    clearCloseTimer();
    setHovering(true);
  };
  const closeSoon = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setHovering(false), SIDEBAR_CLOSE_DELAY_MS);
  };

  return {
    expanded: hovering,
    hoverHandlers: {
      onMouseEnter: openByHover,
      onMouseLeave: closeSoon,
      onFocusCapture: openByHover,
      onBlurCapture: closeSoon,
    },
  };
}

const GROUPS: NavGroup[] = [
  {
    title: "Hoạt động",
    items: [
      { to: "/cham-xe", label: "Chấm xe đến/đi", icon: Truck, screen: "bao-gio-xe" },
      { to: "/tong-quan", label: "Tổng quan", icon: LayoutDashboard, screen: "bao-gio-xe" },
      { to: "/nhat-ky", label: "Nhật ký báo", icon: ClipboardList, screen: "bao-gio-xe" },
    ],
  },
  {
    title: "Quản trị",
    items: [
      { to: "/master", label: "Master", icon: Building2, screen: "master" },
      { to: "/tai-khoan", label: "Tài khoản", icon: Users2, screen: "tai-khoan" },
      { to: "/nhom-quyen", label: "Nhóm quyền", icon: ShieldCheck, screen: "nhom-quyen" },
      {
        to: "/phien-dang-nhap",
        label: "Phiên đăng nhập",
        icon: MonitorSmartphone,
        screen: "phien-dang-nhap",
      },
      { to: "/bao-tri", label: "Cấu hình", icon: Settings2, screen: "bao-tri" },
    ],
  },
];

function Sidebar({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  /** Desktop: đang ở dạng rail (chỉ thấy icon) */
  collapsed?: boolean;
}) {
  const { session } = useAuth();
  useRbacVersion();
  const viewOffice = useStore((s) => s.viewOffice);
  const setViewOffice = useStore((s) => s.setViewOffice);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = hasAllOfficeScope(session);

  useEffect(() => {
    if (!session) return;
    if (!admin) {
      const assigned = resolveViewOffice(session, "");
      if (assigned && viewOffice !== assigned) setViewOffice(assigned);
      return;
    }
    if (!viewOffice) setViewOffice(VIEW_ALL_OFFICES);
  }, [session, admin, viewOffice, setViewOffice]);

  return (
    <aside className="flex h-screen w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border py-4 pl-2.5 pr-3">
        <img src={ghnLogo} alt="GHN" className="h-9 w-auto max-w-[9rem] shrink-0 object-contain" />
        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <div className="truncate text-base font-semibold tracking-tight">Giao Hàng Nhanh</div>
          <div className="truncate text-[13px] opacity-70">Báo giờ xe đến/đi</div>
        </div>
      </div>

      <nav className="sidebar-nav-scroll flex-1 overflow-y-auto px-2 py-3">
        {GROUPS.map((g) => {
          const visible = g.items.filter((i) => canRead(session?.role, i.screen));
          if (!visible.length) return null;
          return (
            <div key={g.title} className="mb-4">
              <div
                className={cn(
                  "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider opacity-60",
                  collapsed && "hidden",
                )}
              >
                {g.title}
              </div>
              <ul className="space-y-0.5">
                {visible.map((i) => {
                  const active = pathname === i.to || pathname.startsWith(i.to + "/");
                  const Icon = i.icon;
                  return (
                    <li key={i.to}>
                      <Link
                        to={i.to}
                        onClick={onNavigate}
                        title={i.label}
                        className={cn(
                          "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn("truncate", collapsed && "hidden")}>{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function HeaderAccount() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const offices = useStore((s) => s.offices);
  const viewOffice = useStore((s) => s.viewOffice);
  const setViewOffice = useStore((s) => s.setViewOffice);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const admin = hasAllOfficeScope(session);
  const officeCode = resolveViewOffice(session, viewOffice);
  const allowed = useAllowedOffices((s) => s.offices);
  const activeOfficeId = useAllowedOffices((s) => s.activeId);
  const pendingOffline = useStore((s) => s.offlineQueue.length);
  const [switching, setSwitching] = useState(false);
  const canSwitchOffice = !admin && !isNativeWebView() && allowed.length > 1;
  const switchOffice = async (token: string) => {
    const id = Number(token.replace(/^id:/, ""));
    if (!Number.isFinite(id) || id === activeOfficeId) return;
    if (pendingOffline > 0) {
      toast.error(`Còn ${pendingOffline} thao tác chưa gửi lên máy chủ — chờ có mạng rồi hãy chuyển VP`);
      return;
    }
    const target = allowed.find((o) => o.id === id);
    if (!confirm(`Chuyển sang làm việc tại ${target?.name ?? "VP này"}?\nTrang sẽ tải lại, chỉ hiện đơn của VP này.`)) {
      return;
    }
    setSwitching(true);
    try {
      await changeActiveOffice(id);
    } catch (e) {
      setSwitching(false);
      toast.error(e instanceof Error && e.message ? e.message : "Không chuyển được văn phòng");
    }
  };
  const officeLabel =
    !officeCode || officeCode === VIEW_ALL_OFFICES
      ? "Toàn hệ thống"
      : offices.find((o) => o.code === officeCode)?.name || officeName(officeCode) || officeCode;
  const roleLabel = session ? ROLE_LABELS[session.role] ?? session.role : "";
  const initial = (session?.username?.trim()?.[0] || "?").toLocaleUpperCase("vi-VN");

  if (!session) return null;

  return (
    <div className="flex min-w-0 max-w-[min(72vw,32rem)] items-center gap-2.5 sm:max-w-[36rem]">
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right sm:flex-nowrap sm:gap-x-3">
        {admin ? (
          <SearchableSelect
            value={officeCode || VIEW_ALL_OFFICES}
            onValueChange={setViewOffice}
            options={adminOfficeSelectOptions(offices)}
            placeholder="Chọn văn phòng"
            searchPlaceholder="Tìm văn phòng…"
            className="h-auto min-h-0 w-auto max-w-[min(100%,14rem)] justify-end gap-1 border-0 bg-transparent px-1 py-0.5 text-[15px] font-semibold tracking-tight text-slate-900 shadow-none hover:bg-slate-50 focus-visible:ring-0 sm:max-w-[16rem] sm:text-base [&>span]:line-clamp-1 [&>span]:text-right [&>svg]:ml-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-50"
            contentClassName="w-72 min-w-[16rem]"
          />
        ) : canSwitchOffice ? (
          <SearchableSelect
            value={activeOfficeId != null ? `id:${activeOfficeId}` : ""}
            onValueChange={(v) => void switchOffice(v)}
            options={allowed.map((o) => ({ value: `id:${o.id}`, label: o.name || o.code, keywords: o.code }))}
            placeholder={officeLabel}
            searchPlaceholder="Tìm văn phòng…"
            disabled={switching}
            className="h-auto min-h-0 w-auto max-w-[min(100%,14rem)] justify-end gap-1 border-0 bg-transparent px-1 py-0.5 text-[15px] font-semibold tracking-tight text-slate-900 shadow-none hover:bg-slate-50 focus-visible:ring-0 sm:max-w-[16rem] sm:text-base [&>span]:line-clamp-1 [&>span]:text-right [&>svg]:ml-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-50"
            contentClassName="w-72 min-w-[16rem]"
          />
        ) : (
          <div
            className="truncate text-[15px] font-semibold leading-tight tracking-tight text-slate-900 sm:max-w-[16rem] sm:text-base"
            title={officeLabel}
          >
            {officeLabel}
          </div>
        )}
        <span className="hidden h-4 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 rounded-lg py-0.5 pl-1 pr-0.5 text-left outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#FF7300]/25"
              title={`${session.username} · ${roleLabel}`}
            >
              <div className="hidden min-w-0 truncate text-[13px] leading-snug text-slate-500 sm:block sm:text-sm">
                <span className="font-medium text-slate-700">{session.username}</span>
                <span className="text-slate-400"> · {roleLabel}</span>
              </div>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0E5] text-sm font-semibold text-[#FF7300] ring-1 ring-[#FF7300]/15"
                aria-hidden
              >
                {initial}
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 sm:hidden">
              <div className="truncate text-sm font-medium text-foreground">{session.username}</div>
              <div className="truncate text-xs text-muted-foreground">{roleLabel}</div>
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onSelect={() => setOpenChangePassword(true)}>
              <KeyRound className="mr-2 h-4 w-4" /> Đổi mật khẩu
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ChangePasswordDialog open={openChangePassword} onOpenChange={setOpenChangePassword} />
    </div>
  );
}

function NativeSyncing() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Đang đồng bộ đăng nhập…
    </div>
  );
}

function useNativeAuthWait() {
  const [readyToRedirect, setReadyToRedirect] = useState(!isNativeWebView());
  useEffect(() => {
    if (!isNativeWebView()) return;
    const t = window.setTimeout(() => setReadyToRedirect(true), 5000);
    return () => window.clearTimeout(t);
  }, []);
  return readyToRedirect;
}

export function AppShell({
  title,
  headerExtra,
  children,
}: {
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const { session, hydrated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { expanded: sidebarExpanded, hoverHandlers } = useDesktopSidebarHover();
  const [nativeShell, setNativeShell] = useState(false);
  const nativeAuthWaitDone = useNativeAuthWait();

  useEffect(() => {
    const w = window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } };
    const native = !!w.ReactNativeWebView;
    setNativeShell(native);
    document.documentElement.classList.toggle("xe-native-shell", native);
  }, []);

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }
  if (!session) {
    if (isNativeWebView() && (!nativeAuthWaitDone || getToken())) {
      return <NativeSyncing />;
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden bg-background",
        nativeShell ? "h-full min-h-0" : "h-screen",
      )}
    >
      {/* Desktop sidebar — mặc định thu gọn thành rail, hover sổ ra và đẩy nội dung y như bấm nút
          menu trước đây (không dùng trong WebView app). Một khối duy nhất animate width nên logo và
          nav luôn cùng nhịp, không còn panel phủ lên page. */}
      <div
        className={cn(
          "hidden shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:block",
          nativeShell && "!hidden",
          sidebarExpanded ? "w-64" : SIDEBAR_RAIL_W,
        )}
        {...hoverHandlers}
      >
        <Sidebar collapsed={!sidebarExpanded} />
      </div>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-2 rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Đóng menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-30 shrink-0 border-b border-slate-200/90 bg-card"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:grid md:h-14 md:grid-cols-[1fr_auto] md:flex-nowrap md:items-center md:gap-2 md:px-6 md:py-0">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                className="rounded-md p-2 hover:bg-muted md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900 md:text-xl">
                {title}
              </h1>
              {headerExtra && (
                <div className="ml-1 hidden min-w-0 items-center gap-2 sm:flex">{headerExtra}</div>
              )}
            </div>
            <div className="flex min-w-0 justify-end">
              <HeaderAccount />
            </div>
          </div>
        </header>
        <main
          className={cn(
            "min-w-0 flex-1 overflow-y-auto",
            nativeShell
              ? "px-3 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:px-6 md:py-6 md:pb-6"
              : "px-3 py-4 md:px-6 md:py-6",
          )}
        >
          {children}
        </main>
        {nativeShell && <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />}
      </div>
    </div>
  );
}

export function ProtectedPage({
  title,
  screen,
  headerExtra,
  children,
}: {
  title: string;
  screen: ScreenKey;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const { session, hydrated } = useAuth();
  const nativeAuthWaitDone = useNativeAuthWait();
  useRbacVersion();
  if (!hydrated) return <div className="min-h-screen bg-background" />;
  if (!session) {
    if (isNativeWebView() && (!nativeAuthWaitDone || getToken())) {
      return <NativeSyncing />;
    }
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
  if (!canRead(session.role, screen)) {
    return (
      <AppShell title={title}>
        <div className="rounded-lg border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold">Không có quyền truy cập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vai trò {ROLE_LABELS[session.role]} không thể xem màn này.
          </p>
        </div>
      </AppShell>
    );
  }
  const adminBypass = session.role === "AD";
  return (
    <MaintenanceGate channel="WEB_STAFF" bypass={adminBypass}>
      <OrderHistoryProvider>
        <AppShell title={title} headerExtra={headerExtra}>
          {children}
        </AppShell>
      </OrderHistoryProvider>
    </MaintenanceGate>
  );
}
