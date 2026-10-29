import { apiRequest, isApiEnabled } from "@/lib/api/client";

export type ScheduleMode = "INTERNAL" | "CRM" | "HYBRID";

export type ScheduleModeInfo = {
  mode: ScheduleMode;
  usesInternal: boolean;
  usesCrm: boolean;
};

export type ScheduleTrip = {
  id: number;
  officeId: number;
  officeCode?: string | null;
  officeName?: string | null;
  itineraryCode: string;
  serviceDate: string;
  tripCode: string;
  vehiclePlate?: string | null;
  driverName?: string | null;
  routeLabel?: string | null;
  plannedDepartAt: string;
  active: boolean;
};

export type ScheduleTripRequest = {
  officeId: number;
  itineraryCode: string;
  serviceDate: string;
  tripCode?: string;
  vehiclePlate?: string;
  driverName?: string;
  routeLabel?: string;
  plannedDepartAt: string;
  active?: boolean;
};

export async function getScheduleMode(): Promise<ScheduleModeInfo> {
  if (!isApiEnabled()) {
    return { mode: "INTERNAL", usesInternal: true, usesCrm: false };
  }
  return apiRequest<ScheduleModeInfo>("/api/vehicle-schedules/mode");
}

export async function listVehicleSchedules(params?: {
  officeId?: number;
  from?: string;
  to?: string;
  itineraryCode?: string;
}): Promise<{ items: ScheduleTrip[]; mode: ScheduleModeInfo }> {
  if (!isApiEnabled()) {
    return { items: [], mode: { mode: "INTERNAL", usesInternal: true, usesCrm: false } };
  }
  const q = new URLSearchParams();
  if (params?.officeId != null) q.set("officeId", String(params.officeId));
  if (params?.from) q.set("from", params.from);
  if (params?.to) q.set("to", params.to);
  if (params?.itineraryCode) q.set("itineraryCode", params.itineraryCode);
  const suffix = q.toString() ? `?${q}` : "";
  return apiRequest(`/api/vehicle-schedules${suffix}`);
}

export async function createVehicleSchedule(body: ScheduleTripRequest): Promise<ScheduleTrip> {
  return apiRequest("/api/vehicle-schedules", { method: "POST", body });
}

export async function updateVehicleSchedule(id: number, body: ScheduleTripRequest): Promise<ScheduleTrip> {
  return apiRequest(`/api/vehicle-schedules/${id}`, { method: "PUT", body });
}

export async function deleteVehicleSchedule(id: number): Promise<void> {
  await apiRequest(`/api/vehicle-schedules/${id}`, { method: "DELETE" });
}
