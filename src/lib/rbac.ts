import { useSyncExternalStore } from "react";
import type { Role } from "./mock-data";

export type ScreenKey =
  | "dashboard"
  | "van-don"
  | "cho-ban-giao"
  | "nhap-kho-luan-chuyen"
  | "giao-thanh-cong"
  | "cho-giao-lai"
  | "don-hoan"
  | "don-huy"
  | "ngoai-le"
  | "phieu-thu"
  | "danh-sach-phieu-thu"
  | "quan-ly-don-cod"
  | "quan-ly-hoa-don"
  | "crm-sdt"
  | "bao-cao-doanh-thu"

  | "hang-cho-len-xe"
  | "duyet-huy"
  | "hang-sap-ve"
  | "dieu-chinh"
  | "hoan-hang"
  | "chuyen"
  | "quet-xuat"
  | "quet-nhap"
  | "doi-soat"
  | "pod-quay"
  | "giao-tan-nha"
  | "day-ship"
  | "bao-cao-thu"
  | "bang-gia"
  | "master"
  | "tai-khoan"
  | "tich-hop"
  | "bao-tri"
  | "cham-cong"
  | "bao-gio-xe"
  | "phu-phi"
  | "kiem-ke"
  | "bao-cao-gio"
  | "ton-kho"
  | "nhom-quyen"
  | "phien-dang-nhap"
  | "tac-vu";

// Y = read+write, R = read-only, N = no access
type Perm = "Y" | "R" | "N";

const MATRIX: Record<ScreenKey, Partial<Record<Role, Perm>>> = {
  dashboard: { AD: "Y", DH: "Y" },
  "van-don": { AD: "Y", DH: "N" },
  /** Mobile task home — unused in GHN strip; keep key for type safety */
  "tac-vu": { AD: "Y", DH: "N" },

  "nhap-kho-luan-chuyen": { AD: "Y", DH: "N" },
  "giao-thanh-cong": { AD: "Y", DH: "N" },
  "cho-giao-lai": { AD: "Y", DH: "N" },
  "cho-ban-giao": { AD: "Y", DH: "N" },
  "don-huy": { AD: "Y", DH: "N" },
  "ngoai-le": { AD: "Y", DH: "N" },
  "phieu-thu": { AD: "Y", DH: "N" },
  "danh-sach-phieu-thu": { AD: "Y", DH: "N" },
  "quan-ly-don-cod": { AD: "Y", DH: "N" },
  "quan-ly-hoa-don": { AD: "Y", DH: "N" },
  "crm-sdt": { AD: "Y", DH: "N" },
  "bao-cao-doanh-thu": { AD: "Y", DH: "N" },
  "don-hoan": { AD: "Y", DH: "N" },
  "hang-cho-len-xe": { AD: "Y", DH: "N" },
  "duyet-huy": { AD: "Y", DH: "N" },
  "hang-sap-ve": { AD: "Y", DH: "N" },
  "dieu-chinh": { AD: "Y", DH: "N" },
  "hoan-hang": { AD: "Y", DH: "N" },
  chuyen: { AD: "Y", DH: "N" },
  "quet-xuat": { AD: "Y", DH: "N" },
  "quet-nhap": { AD: "Y", DH: "N" },
  "doi-soat": { AD: "Y", DH: "N" },
  "pod-quay": { AD: "Y", DH: "N" },
  "giao-tan-nha": { AD: "Y", DH: "N" },
  "day-ship": { AD: "Y", DH: "N" },
  "bao-cao-thu": { AD: "Y", DH: "N" },
  "bang-gia": { AD: "Y", DH: "N" },
  master: { AD: "Y", DH: "Y" },
  "tai-khoan": { AD: "Y" },
  "nhom-quyen": { AD: "Y" },
  "phien-dang-nhap": { AD: "Y" },
  "tich-hop": { AD: "Y", DH: "N" },
  "bao-tri": { AD: "Y" },
  "cham-cong": { AD: "Y", DH: "N" },
  "bao-gio-xe": { AD: "Y", DH: "Y" },
  "phu-phi": { AD: "Y", DH: "N" },
  "ton-kho": { AD: "Y", DH: "N" },
  "kiem-ke": { AD: "Y", DH: "N" },
  "bao-cao-gio": { AD: "Y", DH: "N" },
};

/**
 * Effective permissions of the signed-in staff, served by `GET /api/account`.
 * Null = API off (mock/dev) or not loaded yet → fall back to MATRIX.
 */
let runtimePerms: Partial<Record<ScreenKey, Perm>> | null = null;
let runtimeSystemAdmin = false;
let runtimeVersion = 0;
const runtimeListeners = new Set<() => void>();

function notifyRuntime() {
  runtimeVersion += 1;
  for (const fn of runtimeListeners) fn();
}

function subscribeRuntimePermissions(fn: () => void): () => void {
  runtimeListeners.add(fn);
  return () => {
    runtimeListeners.delete(fn);
  };
}

/** Re-render screens/nav when permissions arrive from the API after mount. */
export function useRbacVersion() {
  return useSyncExternalStore(
    subscribeRuntimePermissions,
    () => runtimeVersion,
    () => runtimeVersion,
  );
}

export function setRuntimePermissions(
  perms: Record<string, string> | undefined | null,
  systemAdmin = false,
) {
  runtimeSystemAdmin = systemAdmin;
  if (!perms || !Object.keys(perms).length) {
    runtimePerms = null;
    notifyRuntime();
    return;
  }
  const next: Partial<Record<ScreenKey, Perm>> = {};
  for (const [key, value] of Object.entries(perms)) {
    if (key in MATRIX) next[key as ScreenKey] = value === "Y" || value === "R" ? value : "N";
  }
  runtimePerms = next;
  notifyRuntime();
}

export function clearRuntimePermissions() {
  runtimePerms = null;
  runtimeSystemAdmin = false;
  notifyRuntime();
}

export function hasRuntimePermissions() {
  return runtimePerms != null;
}

export function can(role: Role | undefined, screen: ScreenKey): Perm {
  if (!role) return "N";
  if (runtimeSystemAdmin) return "Y";
  if (runtimePerms) return runtimePerms[screen] ?? "N";
  return MATRIX[screen]?.[role] ?? "N";
}

export function canRead(role: Role | undefined, screen: ScreenKey) {
  const p = can(role, screen);
  return p === "Y" || p === "R";
}

export function canWrite(role: Role | undefined, screen: ScreenKey) {
  return can(role, screen) === "Y";
}

// Read-only account: no write grant anywhere (BL by default, or a group with no Y).
export function isReadOnlyRole(role: Role | undefined) {
  if (runtimeSystemAdmin) return false;
  if (runtimePerms) return !Object.values(runtimePerms).some((p) => p === "Y");
  return role === "BL";
}
