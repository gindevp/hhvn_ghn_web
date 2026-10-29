import type { LucideIcon } from "lucide-react";
import { ClipboardList, LayoutDashboard, Truck } from "lucide-react";
import type { ScreenKey } from "@/lib/rbac";

export type ActivityNavItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  screen: ScreenKey;
};

/** Lối tắt top bar — báo giờ xe */
export const ACTIVITY_TOP_NAV: ActivityNavItem[] = [
  {
    to: "/cham-xe",
    label: "Chấm xe đến/đi",
    shortLabel: "Chấm xe",
    icon: Truck,
    screen: "bao-gio-xe",
  },
  {
    to: "/tong-quan",
    label: "Tổng quan",
    shortLabel: "Tổng quan",
    icon: LayoutDashboard,
    screen: "bao-gio-xe",
  },
  {
    to: "/nhat-ky",
    label: "Nhật ký báo",
    shortLabel: "Nhật ký",
    icon: ClipboardList,
    screen: "bao-gio-xe",
  },
];
