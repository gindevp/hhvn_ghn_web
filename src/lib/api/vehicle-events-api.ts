import { apiRequest } from "./client";

export type VehicleEventReportItem = {
  id: number;
  officeCode: string;
  officeName: string;
  eventType: "ARRIVE" | "DEPART";
  source: "TRIP" | "CRM";
  tripKey: string;
  tripCode?: string | null;
  externalTripId?: string | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  routeLabel?: string | null;
  plannedDepartAt?: string | null;
  eventAt: string;
  reportedBy?: string | null;
  reportedByName?: string | null;
  /** Lý do khi báo rời muộn so với giờ đón. */
  reason?: string | null;
  /** Giờ đón tại VP = giờ xuất bến ± phút lệch của lộ trình (bản ghi cũ = giờ xuất bến). */
  pickupAt?: string | null;
  /** Lượt báo rời có ảnh xe — tải qua getVehicleEventPhoto. */
  hasPhoto?: boolean;
};

export function getVehicleEventPhoto(eventId: number) {
  return apiRequest<{ eventId: number; photo: string; capturedAt?: string | null; capturedBy?: string | null }>(
    `/api/vehicle-events/${eventId}/photo`,
  );
}

/** from/to: YYYY-MM-DD (giờ VN). officeCode bỏ trống = toàn hệ thống. */
export function getVehicleEventReport(params: {
  from: string;
  to: string;
  officeCode?: string;
}): Promise<{ events: VehicleEventReportItem[]; itineraries?: ItineraryOption[] }> {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  if (params.officeCode) q.set("officeCode", params.officeCode);
  return apiRequest(`/api/vehicle-events/report?${q.toString()}`);
}

export type ItineraryOption = { code: string; name: string };

export type VehiclePlanTrip = {
  externalTripId: string;
  vehiclePlate?: string | null;
  driverName?: string | null;
  routeLabel?: string | null;
  departAt?: string | null;
  /** Mã lộ trình — gán lượt chạy theo bảng tài vào từng VP. */
  itineraryCode?: string | null;
};

/** Bảng tài CRM trong [from, to] (YYYY-MM-DD giờ VN). officeCode bỏ trống = mọi lộ trình. */
export function getVehiclePlan(params: {
  from: string;
  to: string;
  officeCode?: string;
}): Promise<{ trips: VehiclePlanTrip[]; warning?: string | null }> {
  const q = new URLSearchParams({ from: params.from, to: params.to });
  if (params.officeCode) q.set("officeCode", params.officeCode);
  return apiRequest(`/api/vehicle-events/plan?${q.toString()}`);
}

/** Lộ trình VP báo giờ: options = mọi lộ trình qua điểm của VP; không tích gì = hiện tất cả. */
export type OfficeVehicleItineraryConfig = {
  officeId: number;
  officeName: string;
  /** offsetMinutes: phút lệch giờ đón so với giờ xuất bến (-120 = sớm 120p, 30 = muộn 30p). */
  options: { code: string; name: string; selected: boolean; offsetMinutes?: number | null }[];
};

/** Mã VP → lộ trình VP báo giờ; VP không có trong map = chưa giới hạn (mọi lộ trình qua điểm VP). */
export function getAllOfficeVehicleItineraries() {
  return apiRequest<Record<string, string[]>>("/api/offices/vehicle-itineraries", { auth: false });
}

/** Lộ trình hợp lệ cho đơn từ VP gửi: VP gửi đã cấu hình "Lộ trình áp dụng" thì lộ trình phải nằm trong danh sách đó. */
export function itinerariesAllowedFrom<T extends { code?: string }>(
  itineraries: T[],
  fromCode: string | undefined,
  byOffice: Record<string, string[]>,
): T[] {
  const from = fromCode ? byOffice[fromCode] : undefined;
  if (!from?.length) return itineraries;
  return itineraries.filter((it) => !!it.code && from.includes(it.code));
}

export function getOfficeVehicleItineraries(officeId: number) {
  return apiRequest<OfficeVehicleItineraryConfig>(`/api/offices/${officeId}/vehicle-itineraries`);
}

export type VehicleDayItem = {
  externalTripId: string;
  vehiclePlate?: string | null;
  driverName?: string | null;
  routeLabel?: string | null;
  plannedDepartAt?: string | null;
  pickupAt?: string | null;
  arrivedAt?: string | null;
  arrivedBy?: string | null;
  departedAt?: string | null;
  departedBy?: string | null;
};

export type VehicleDayBoard = {
  officeCode: string;
  officeName: string;
  items: VehicleDayItem[];
  departPhotoRequired?: boolean;
  lateMinutes?: number;
};

export type ScheduleMode = "INTERNAL" | "CRM" | "HYBRID";

export type VehicleOpsPolicy = {
  departPhotoRequired: boolean;
  lateMinutes: number;
  scheduleMode: ScheduleMode;
  scheduleModeFromYaml: boolean;
};

/** Lộ trình VP đang chấm. officeCode trống = VP hồ sơ (app). */
export function getVehicleItineraries(officeCode?: string) {
  const q = new URLSearchParams();
  if (officeCode) q.set("officeCode", officeCode);
  const suffix = q.toString() ? `?${q}` : "";
  return apiRequest<ItineraryOption[]>(`/api/vehicle-events/itineraries${suffix}`);
}

/** Xe CRM xuất bến hôm nay của một lộ trình, kèm giờ đã báo đến/rời tại VP. */
export function getVehicleDayTrips(itineraryCode: string, officeCode?: string) {
  const q = new URLSearchParams({ itineraryCode });
  if (officeCode) q.set("officeCode", officeCode);
  return apiRequest<VehicleDayBoard>(`/api/vehicle-events/day-trips?${q}`);
}

export async function getVehiclePhotoPolicy(): Promise<VehicleOpsPolicy> {
  const dto = await apiRequest<Partial<VehicleOpsPolicy>>("/api/vehicle-events/photo-policy");
  const mode = (dto.scheduleMode ?? "INTERNAL").toUpperCase();
  return {
    departPhotoRequired: !!dto.departPhotoRequired,
    lateMinutes: typeof dto.lateMinutes === "number" && dto.lateMinutes > 0 ? dto.lateMinutes : 5,
    scheduleMode: mode === "CRM" || mode === "HYBRID" || mode === "INTERNAL" ? mode : "INTERNAL",
    scheduleModeFromYaml: dto.scheduleModeFromYaml !== false,
  };
}

/** @deprecated dùng saveVehicleOpsPolicy */
export function saveVehiclePhotoPolicy(departPhotoRequired: boolean) {
  return saveVehicleOpsPolicy({ departPhotoRequired, lateMinutes: 5, scheduleMode: "INTERNAL" });
}

export async function saveVehicleOpsPolicy(body: {
  departPhotoRequired: boolean;
  lateMinutes: number;
  scheduleMode: ScheduleMode;
}): Promise<VehicleOpsPolicy> {
  const dto = await apiRequest<Partial<VehicleOpsPolicy>>("/api/vehicle-events/photo-policy", {
    method: "PUT",
    body,
  });
  const mode = (dto.scheduleMode ?? body.scheduleMode).toUpperCase();
  return {
    departPhotoRequired: !!dto.departPhotoRequired,
    lateMinutes: typeof dto.lateMinutes === "number" && dto.lateMinutes > 0 ? dto.lateMinutes : body.lateMinutes,
    scheduleMode: mode === "CRM" || mode === "HYBRID" || mode === "INTERNAL" ? mode : body.scheduleMode,
    scheduleModeFromYaml: dto.scheduleModeFromYaml === true,
  };
}

/** Báo lại cùng chuyến thì máy chủ trả giờ đã ghi. Ảnh (data URL) tùy chọn khi DEPART. */
export function reportVehicleEvent(body: {
  eventType: "ARRIVE" | "DEPART";
  externalTripId: string;
  vehiclePlate?: string | null;
  driverName?: string | null;
  routeLabel?: string | null;
  plannedDepartAt?: string | null;
  itineraryCode?: string;
  reason?: string;
  officeCode?: string;
  /** data URL / base64 — optional DEPART photo */
  photo?: string;
  /** true khi báo từ mobile/webapp để BE áp dụng photo policy */
  fromApp?: boolean;
}) {
  const q = new URLSearchParams();
  if (body.officeCode) q.set("officeCode", body.officeCode);
  const suffix = q.toString() ? `?${q}` : "";
  const { officeCode: _office, photo, fromApp, ...payload } = body;
  return apiRequest<{ reportedAt?: string | null; reportedBy?: string | null }>(`/api/vehicle-events${suffix}`, {
    method: "POST",
    body: {
      ...payload,
      source: "CRM",
      ...(photo ? { photo } : {}),
      ...(fromApp ? { fromApp: true } : {}),
    },
    ...(photo ? { timeoutMs: 30_000 } : {}),
  });
}

export function saveOfficeVehicleItineraries(
  officeId: number,
  itineraryCodes: string[],
  offsets: { code: string; offsetMinutes: number }[] = [],
) {
  return apiRequest<OfficeVehicleItineraryConfig>(`/api/offices/${officeId}/vehicle-itineraries`, {
    method: "PUT",
    body: { itineraryCodes, offsets },
  });
}
