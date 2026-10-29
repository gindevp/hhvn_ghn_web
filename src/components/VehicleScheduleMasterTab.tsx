import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { useStore } from "@/lib/store";
import { isApiEnabled } from "@/lib/api/client";
import {
  createVehicleSchedule,
  deleteVehicleSchedule,
  getScheduleMode,
  listVehicleSchedules,
  updateVehicleSchedule,
  type ScheduleModeInfo,
  type ScheduleTrip,
  type ScheduleTripRequest,
} from "@/lib/api/vehicle-schedules-api";

const VN_TZ = "Asia/Ho_Chi_Minh";

function vnToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ }).format(new Date());
}

/** ISO Instant → display in Asia/Ho_Chi_Minh. */
function formatVnDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** ISO Instant → `datetime-local` value in VN wall time. */
function isoToDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** `datetime-local` (VN wall) → ISO Instant for API. */
function datetimeLocalToIso(local: string): string {
  const trimmed = local.trim();
  if (!trimmed) return "";
  // VN has no DST; treat wall time as UTC+7.
  const withOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed) ? trimmed : `${trimmed}:00+07:00`;
  const d = new Date(withOffset);
  if (Number.isNaN(d.getTime())) throw new Error("Giờ xuất phát không hợp lệ");
  return d.toISOString();
}

type FormState = {
  id?: number;
  officeId: string;
  itineraryCode: string;
  serviceDate: string;
  tripCode: string;
  vehiclePlate: string;
  driverName: string;
  routeLabel: string;
  plannedDepartAt: string;
  active: boolean;
};

function emptyForm(officeId = ""): FormState {
  const today = vnToday();
  return {
    officeId,
    itineraryCode: "",
    serviceDate: today,
    tripCode: "",
    vehiclePlate: "",
    driverName: "",
    routeLabel: "",
    plannedDepartAt: `${today}T08:00`,
    active: true,
  };
}

function modeBadgeVariant(mode: ScheduleModeInfo["mode"]): "default" | "secondary" | "outline" {
  if (mode === "INTERNAL") return "default";
  if (mode === "HYBRID") return "secondary";
  return "outline";
}

/** Master → Lịch chuyến: CRUD lịch xe nội bộ (INTERNAL / HYBRID). */
export function VehicleScheduleMasterTab() {
  const { session } = useAuth();
  const writable = canWrite(session?.role, "master");
  const offices = useStore((s) => s.offices);
  const officeOptions = useMemo(
    () =>
      [...offices]
        .filter((o) => o.id != null)
        .sort((a, b) => (a.code + (a.name ?? "")).localeCompare(b.code + (b.name ?? ""), "vi")),
    [offices],
  );

  const [mode, setMode] = useState<ScheduleModeInfo | null>(null);
  const [rows, setRows] = useState<ScheduleTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [officeFilter, setOfficeFilter] = useState<string>("ALL");
  const [from, setFrom] = useState(vnToday);
  const [to, setTo] = useState(vnToday);
  const [itineraryCode, setItineraryCode] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!isApiEnabled()) return;
    setLoading(true);
    try {
      const modeInfo = await getScheduleMode();
      setMode(modeInfo);
      if (!modeInfo.usesInternal) {
        setRows([]);
        return;
      }
      const params: { officeId?: number; from?: string; to?: string; itineraryCode?: string } = {};
      if (officeFilter !== "ALL") params.officeId = Number(officeFilter);
      if (from) params.from = from;
      if (to) params.to = to;
      if (itineraryCode.trim()) params.itineraryCode = itineraryCode.trim();
      const data = await listVehicleSchedules(params);
      setRows(data.items ?? []);
      if (data.mode) setMode(data.mode);
    } catch (e: any) {
      toast.error(e?.message || "Không tải được lịch chuyến");
    } finally {
      setLoading(false);
    }
  }, [officeFilter, from, to, itineraryCode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async () => {
    if (!form) return;
    if (!form.officeId) return toast.error("Chọn văn phòng");
    if (!form.itineraryCode.trim()) return toast.error("Nhập mã lộ trình");
    if (!form.serviceDate) return toast.error("Chọn ngày chạy");
    if (!form.plannedDepartAt) return toast.error("Chọn giờ xuất phát dự kiến");
    let plannedDepartAt: string;
    try {
      plannedDepartAt = datetimeLocalToIso(form.plannedDepartAt);
    } catch (e: any) {
      return toast.error(e?.message || "Giờ xuất phát không hợp lệ");
    }
    const body: ScheduleTripRequest = {
      officeId: Number(form.officeId),
      itineraryCode: form.itineraryCode.trim(),
      serviceDate: form.serviceDate,
      vehiclePlate: form.vehiclePlate.trim() || undefined,
      driverName: form.driverName.trim() || undefined,
      routeLabel: form.routeLabel.trim() || undefined,
      plannedDepartAt,
      active: form.active,
    };
    if (form.tripCode.trim()) body.tripCode = form.tripCode.trim();
    setSaving(true);
    try {
      if (form.id != null) await updateVehicleSchedule(form.id, body);
      else await createVehicleSchedule(body);
      toast.success(form.id != null ? "Đã cập nhật lịch chuyến" : "Đã thêm lịch chuyến");
      setForm(null);
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Không lưu được lịch chuyến");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: ScheduleTrip) => {
    if (!confirm(`Xóa lịch chuyến ${row.tripCode} (${row.serviceDate})?`)) return;
    try {
      await deleteVehicleSchedule(row.id);
      toast.success("Đã xóa lịch chuyến");
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Không xóa được lịch chuyến");
    }
  };

  if (!isApiEnabled()) {
    return <p className="text-sm text-muted-foreground">Cần kết nối máy chủ để quản lý lịch chuyến.</p>;
  }

  const crmOnly = mode != null && !mode.usesInternal;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {mode ? (
          <Badge variant={modeBadgeVariant(mode.mode)} title={`usesInternal=${mode.usesInternal}`}>
            Mode: {mode.mode}
          </Badge>
        ) : (
          <Badge variant="outline">Mode: …</Badge>
        )}
        {writable && !crmOnly && (
          <Button
            onClick={() =>
              setForm(emptyForm(officeFilter !== "ALL" ? officeFilter : officeOptions[0]?.id != null ? String(officeOptions[0].id) : ""))
            }
          >
            Thêm lịch chuyến
          </Button>
        )}
        <Select value={officeFilter} onValueChange={setOfficeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Văn phòng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả VP</SelectItem>
            {officeOptions.map((o) => (
              <SelectItem key={o.id} value={String(o.id)}>
                {o.name || o.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Từ</Label>
          <Input type="date" className="w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Đến</Label>
          <Input type="date" className="w-36" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Input
          className="w-44"
          placeholder="Mã lộ trình"
          value={itineraryCode}
          onChange={(e) => setItineraryCode(e.target.value)}
        />
        <Button type="button" variant="outline" disabled={loading} onClick={() => void reload()}>
          {loading ? "Đang tải…" : "Tải lại"}
        </Button>
      </div>

      {crmOnly ? (
        <p className="rounded-md border border-dashed bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
          Chế độ hiện tại là <strong>CRM</strong> — lịch chuyến nội bộ chưa dùng. Đặt mode{" "}
          <strong>INTERNAL</strong> hoặc <strong>HYBRID</strong> trên BE để quản lý lịch tại đây.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-4">Ngày</th>
                <th className="py-2 pr-4">Mã chuyến</th>
                <th className="py-2 pr-4">BKS</th>
                <th className="py-2 pr-4">Tài xế</th>
                <th className="py-2 pr-4">Tuyến</th>
                <th className="py-2 pr-4">Xuất phát (VN)</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    {loading ? "Đang tải…" : "Chưa có lịch chuyến"}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className={`border-b last:border-0 ${r.active === false ? "opacity-50" : ""}`}>
                    <td className="py-2 pr-4 tabular-nums">{r.serviceDate}</td>
                    <td className="py-2 pr-4 font-medium">{r.tripCode}</td>
                    <td className="py-2 pr-4">{r.vehiclePlate || "—"}</td>
                    <td className="py-2 pr-4">{r.driverName || "—"}</td>
                    <td className="py-2 pr-4">{r.routeLabel || r.itineraryCode || "—"}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatVnDateTime(r.plannedDepartAt)}</td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {r.active === false ? "Ngưng" : "Hoạt động"}
                    </td>
                    <td className="py-2 pr-4">
                      {writable && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setForm({
                                id: r.id,
                                officeId: String(r.officeId),
                                itineraryCode: r.itineraryCode ?? "",
                                serviceDate: r.serviceDate,
                                tripCode: r.tripCode ?? "",
                                vehiclePlate: r.vehiclePlate ?? "",
                                driverName: r.driverName ?? "",
                                routeLabel: r.routeLabel ?? "",
                                plannedDepartAt: isoToDatetimeLocal(r.plannedDepartAt),
                                active: r.active !== false,
                              })
                            }
                          >
                            Sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => void remove(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={form != null} onOpenChange={(v) => !v && !saving && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id != null ? "Sửa lịch chuyến" : "Thêm lịch chuyến"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Văn phòng</Label>
                <Select value={form.officeId || undefined} onValueChange={(v) => setForm({ ...form, officeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn VP" />
                  </SelectTrigger>
                  <SelectContent>
                    {officeOptions.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name || o.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Mã lộ trình</Label>
                  <Input
                    value={form.itineraryCode}
                    onChange={(e) => setForm({ ...form, itineraryCode: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngày chạy</Label>
                  <Input
                    type="date"
                    value={form.serviceDate}
                    onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mã chuyến{form.id == null ? " (tuỳ chọn)" : ""}</Label>
                <Input
                  value={form.tripCode}
                  onChange={(e) => setForm({ ...form, tripCode: e.target.value })}
                  placeholder={form.id == null ? "Để trống = BE tự sinh" : undefined}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>BKS</Label>
                  <Input
                    value={form.vehiclePlate}
                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tài xế</Label>
                  <Input
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tuyến / nhãn</Label>
                <Input
                  value={form.routeLabel}
                  onChange={(e) => setForm({ ...form, routeLabel: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Xuất phát dự kiến (giờ VN)</Label>
                <Input
                  type="datetime-local"
                  value={form.plannedDepartAt}
                  onChange={(e) => setForm({ ...form, plannedDepartAt: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Đang hoạt động
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setForm(null)}>
              Hủy
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Đang lưu…" : form?.id != null ? "Lưu" : "Thêm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
