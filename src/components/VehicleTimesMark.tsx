import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StageTabButton, StageTabRow } from "@/components/StageTabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getVehicleDayTrips,
  getVehicleItineraries,
  reportVehicleEvent,
  type ItineraryOption,
  type VehicleDayItem,
} from "@/lib/api/vehicle-events-api";
import { useStore } from "@/lib/store";
import { assignedOfficeCode, hasAllOfficeScope, resolveViewOffice } from "@/lib/office-scope";
import { isMobileViewport } from "@/lib/mobile-tasks";
import { isNativeWebView } from "@/lib/native-shell";

const ITINERARY_KEY = "vehicleTimes.itinerary";
const DEFAULT_LATE_MINUTES = 5;
const DWELL_REASONS = [
  "Không rõ nguyên nhân",
  "Tắc đường",
  "Xe tuyến về muộn",
  "Đợi khách",
  "Chờ phát sinh khách",
  "Tránh công an",
  "Bị công an bắt",
  "Lái xe thu tiền",
  "Lái xe ăn trưa",
  "VPHH bốc hàng",
] as const;

function pickupOf(it: VehicleDayItem) {
  return it.pickupAt || it.plannedDepartAt || null;
}

function lateMinutesOf(pickupAt?: string | null, nowMs = Date.now()): number | null {
  if (!pickupAt) return null;
  const t = Date.parse(pickupAt);
  return Number.isNaN(t) ? null : Math.trunc((nowMs - t) / 60000);
}

function hhmm(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function plateKey(s?: string | null) {
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không đọc được ảnh"));
    reader.readAsDataURL(file);
  });
}

type Confirm = { item: VehicleDayItem; type: "ARRIVE" | "DEPART" };

/** Chấm xe đến/rời; DEPART có thể đính kèm ảnh (tuỳ chọn). */
export function VehicleTimesMark({ readOnly = false }: { readOnly?: boolean }) {
  const session = useStore((s) => s.session);
  const viewOffice = useStore((s) => s.viewOffice);
  const wide = hasAllOfficeScope(session);
  const officeCode = wide ? assignedOfficeCode(resolveViewOffice(session, viewOffice)) : "";
  const waitingForOffice = wide && !officeCode;
  const [itineraries, setItineraries] = useState<ItineraryOption[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [itinerary, setItinerary] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VehicleDayItem[]>([]);
  const [officeName, setOfficeName] = useState("");
  const [lateMinutes, setLateMinutes] = useState(DEFAULT_LATE_MINUTES);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [mobileUi, setMobileUi] = useState(() => isMobileViewport() || isNativeWebView());
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  /** Cập nhật để tính muộn khi chấm rời (lý do lưu trú). */
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const sync = () => setMobileUi(isMobileViewport() || isNativeWebView());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    setItinerary("");
    setItems([]);
    setOfficeName("");
    if (waitingForOffice) {
      setItineraries([]);
      setRoutesLoading(false);
      return;
    }
    let alive = true;
    setRoutesLoading(true);
    void (async () => {
      try {
        const rows = await getVehicleItineraries(officeCode);
        if (!alive) return;
        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, "vi"));
        setItineraries(sorted);
        const saved = localStorage.getItem(`${ITINERARY_KEY}.${officeCode}`);
        const pick = sorted.find((it) => it.code === saved) ?? sorted[0];
        setItinerary(pick?.code ?? "");
      } catch (e) {
        if (alive) {
          setItineraries([]);
          setItinerary("");
          toast.error(e instanceof Error ? e.message : "Không tải được lộ trình");
        }
      } finally {
        if (alive) setRoutesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [officeCode, waitingForOffice]);

  const load = useCallback(async () => {
    if (!itinerary) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const board = await getVehicleDayTrips(itinerary, officeCode);
      setItems(board.items);
      setOfficeName(board.officeName || board.officeCode || "");
      setLateMinutes(
        typeof board.lateMinutes === "number" && board.lateMinutes > 0
          ? board.lateMinutes
          : DEFAULT_LATE_MINUTES,
      );
    } catch (e) {
      setItems([]);
      toast.error(e instanceof Error ? e.message : "Không tải được danh sách xe");
    } finally {
      setLoading(false);
    }
  }, [itinerary, officeCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = plateKey(query);
    if (!q) return items;
    return items.filter((it) => plateKey(it.vehiclePlate).includes(q));
  }, [items, query]);

  const late = confirm?.type === "DEPART" ? lateMinutesOf(pickupOf(confirm.item), nowMs) : null;
  const needReason = late != null && late >= lateMinutes;
  const canSubmit = !needReason || !!reason.trim();
  const fromApp = mobileUi;

  const openConfirm = (item: VehicleDayItem, type: Confirm["type"]) => {
    setReason("");
    setPhoto(null);
    setConfirm({ item, type });
  };

  const pickItinerary = (code: string) => {
    setItinerary(code);
    localStorage.setItem(`${ITINERARY_KEY}.${officeCode}`, code);
  };

  const onPickFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chọn file ảnh");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPhoto(dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không đọc được ảnh");
    }
  };

  const submit = async () => {
    if (!confirm || busy || !canSubmit) return;
    const { item, type } = confirm;
    setBusy(true);
    try {
      const saved = await reportVehicleEvent({
        eventType: type,
        externalTripId: item.externalTripId,
        vehiclePlate: item.vehiclePlate,
        driverName: item.driverName,
        routeLabel: item.routeLabel,
        plannedDepartAt: item.plannedDepartAt,
        itineraryCode: itinerary,
        officeCode,
        ...(needReason ? { reason: reason.trim() } : {}),
        ...(type === "DEPART" && photo ? { photo } : {}),
        ...(fromApp ? { fromApp: true } : {}),
      });
      setItems((prev) =>
        prev.map((it) =>
          it.externalTripId !== item.externalTripId
            ? it
            : type === "ARRIVE"
              ? { ...it, arrivedAt: saved.reportedAt, arrivedBy: saved.reportedBy }
              : { ...it, departedAt: saved.reportedAt, departedBy: saved.reportedBy },
        ),
      );
      toast.success(
        `${item.vehiclePlate || "Xe"} ${type === "ARRIVE" ? "đã đến" : "đã rời"} văn phòng lúc ${hhmm(saved.reportedAt)}`,
      );
      setConfirm(null);
      setPhoto(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không ghi nhận được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {itineraries.length > 0 ? (
        <StageTabRow>
          {itineraries.map((it) => (
            <StageTabButton key={it.code} active={it.code === itinerary} onClick={() => pickItinerary(it.code)}>
              {it.name}
            </StageTabButton>
          ))}
        </StageTabRow>
      ) : routesLoading || waitingForOffice ? null : (
        <p className="text-sm text-muted-foreground">Không có lộ trình nào đi hoặc đến văn phòng của bạn.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm biển số"
            className="pl-8 uppercase"
          />
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading || !itinerary}>
          Tải lại
        </Button>
      </div>
      <p className="text-sm font-medium">
        Danh sách xe hôm nay{officeName ? ` — ${officeName}` : ""}
        {shown.length ? ` (${shown.length})` : ""}
      </p>
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
      ) : waitingForOffice ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chọn một văn phòng ở góc trên để chấm xe của VP đó.</p>
      ) : !itinerary ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chọn lộ trình để xem danh sách xe.</p>
      ) : shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {query ? "Không có xe khớp biển số." : "Không có xe nào hôm nay."}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((it) => {
            const meta = [it.driverName, pickupOf(it) ? `Xuất bến ${hhmm(pickupOf(it))}` : ""].filter(Boolean).join("  •  ");
            return (
              <div key={it.externalTripId} className="space-y-2 rounded-lg border bg-card p-4 shadow-sm">
                <div className="text-base font-bold">{it.vehiclePlate || "Chưa có biển số"}</div>
                {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
                {it.arrivedAt ? (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Đã đến lúc {hhmm(it.arrivedAt)}
                  </div>
                ) : null}
                {it.departedAt ? (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Đã rời lúc {hhmm(it.departedAt)}
                  </div>
                ) : null}
                {readOnly ? null : !it.arrivedAt ? (
                  <Button className="w-full" onClick={() => openConfirm(it, "ARRIVE")}>
                    Xe đến VP
                  </Button>
                ) : !it.departedAt ? (
                  <Button className="w-full" onClick={() => openConfirm(it, "DEPART")}>
                    Xe rời VP
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setConfirm(null);
            setPhoto(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm?.type === "ARRIVE" ? "Xác nhận xe đã đến văn phòng?" : "Xác nhận xe đã rời văn phòng?"}
            </DialogTitle>
          </DialogHeader>
          {confirm?.item.vehiclePlate ? <p className="text-center text-base font-bold text-primary">{confirm.item.vehiclePlate}</p> : null}
          {needReason ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-700">
                Xe rời muộn {late ?? 0} phút so với giờ đón {hhmm(pickupOf(confirm!.item))} — nhập lý do *
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DWELL_REASONS.map((r) => {
                  const on = reason.trim() === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      className={`rounded-full border px-2.5 py-1 text-sm ${on ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border"}`}
                      onClick={() => setReason(r)}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Chọn nhanh ở trên hoặc tự nhập"
                maxLength={500}
                className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ) : null}
          {confirm?.type === "DEPART" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Ảnh xe rời (tuỳ chọn)</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="mr-1.5 h-4 w-4" />
                  Chọn ảnh
                </Button>
                {mobileUi ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()}>
                    <Camera className="mr-1.5 h-4 w-4" />
                    Chụp ảnh
                  </Button>
                ) : null}
                {photo ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                    <X className="mr-1.5 h-4 w-4" />
                    Bỏ ảnh
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void onPickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void onPickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {photo ? (
                <img src={photo} alt="Ảnh xe rời" className="max-h-40 w-full rounded-md border object-contain" />
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              Quay lại
            </Button>
            <Button onClick={() => void submit()} disabled={busy || !canSubmit}>
              {busy ? "Đang ghi…" : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
