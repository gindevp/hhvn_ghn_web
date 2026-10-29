import type { LucideIcon } from "lucide-react";
import { ClipboardList, LayoutDashboard, Menu, Truck } from "lucide-react";
import type { ScreenKey } from "@/lib/rbac";

export type MobileTaskCard = {
  id: string;
  label: string;
  to: string;
  screen: ScreenKey;
  icon: LucideIcon;
};

/** Task cards — GHN báo giờ xe */
export const MOBILE_TASK_CARDS: MobileTaskCard[] = [
  {
    id: "cham-xe",
    label: "Chấm xe",
    to: "/cham-xe",
    screen: "bao-gio-xe",
    icon: Truck,
  },
  {
    id: "tong-quan",
    label: "Tổng quan",
    to: "/tong-quan",
    screen: "bao-gio-xe",
    icon: LayoutDashboard,
  },
  {
    id: "nhat-ky",
    label: "Nhật ký",
    to: "/nhat-ky",
    screen: "bao-gio-xe",
    icon: ClipboardList,
  },
];

export type MobileBottomTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  screen?: ScreenKey;
  action?: "menu";
};

export const MOBILE_BOTTOM_TABS: MobileBottomTab[] = [
  { id: "cham-xe", label: "Chấm xe", icon: Truck, to: "/cham-xe", screen: "bao-gio-xe" },
  { id: "tong-quan", label: "Tổng quan", icon: LayoutDashboard, to: "/tong-quan", screen: "bao-gio-xe" },
  { id: "nhat-ky", label: "Nhật ký", icon: ClipboardList, to: "/nhat-ky", screen: "bao-gio-xe" },
  { id: "menu", label: "Menu", icon: Menu, action: "menu" },
];

/** Align with Tailwind `md` used by AppShell sidebar (`hidden md:block`). */
export const MOBILE_MAX_WIDTH_PX = 767;

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches;
}
