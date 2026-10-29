import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ProtectedPage } from "@/components/AppShell";
import { Section } from "@/components/PageBits";
import { PodPhotoInput } from "@/components/PodPhotoInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isApiEnabled } from "@/lib/api/client";
import {
  emptyMaintenancePolicy,
  fetchMaintenancePolicy,
  fetchMobileAppVersion,
  fetchSessionPolicy,
  putMaintenancePolicy,
  putMobileAppVersion,
  putSessionPolicy,
  type MaintenancePolicy,
  type MobileAppVersionPolicy,
  type SessionPolicy,
} from "@/lib/api/finance-config-api";
import {
  getVehiclePhotoPolicy,
  saveVehicleOpsPolicy,
  type VehicleOpsPolicy,
  type ScheduleMode,
} from "@/lib/api/vehicle-events-api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { toast } from "sonner";

export const Route = createFileRoute("/bao-tri")({
  head: () => ({ meta: [{ title: "Cấu hình — GHN" }] }),
  component: () => (
    <ProtectedPage title="Cấu hình" screen="bao-tri">
      <Page />
    </ProtectedPage>
  ),
});

function Page() {
  return (
    <Tabs defaultValue="phien">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="phien">Phiên đăng nhập</TabsTrigger>
        <TabsTrigger value="bao-gio-xe">Báo giờ xe</TabsTrigger>
        <TabsTrigger value="bao-tri">Bảo trì</TabsTrigger>
        <TabsTrigger value="update">Phiên bản app</TabsTrigger>
      </TabsList>
      <TabsContent value="phien" className="mt-4">
        <SessionTab />
      </TabsContent>
      <TabsContent value="bao-gio-xe" className="mt-4">
        <VehicleOpsTab />
      </TabsContent>
      <TabsContent value="bao-tri" className="mt-4">
        <MaintenanceTab />
      </TabsContent>
      <TabsContent value="update" className="mt-4">
        <MobileAppVersionTab />
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ChannelRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function SessionTab() {
  const { session } = useAuth();
  const writable = canWrite(session?.role, "bao-tri");
  const [f, setF] = useState<SessionPolicy>({ enabled: true, logoutTime: "21:00" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled()) {
        setLoading(false);
        return;
      }
      try {
        const p = await fetchSessionPolicy();
        if (!cancelled) setF(p);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ?? "Không tải được giờ đăng xuất");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!writable) return toast.error("Tài khoản không có quyền ghi màn này");
    if (!/^\d{2}:\d{2}$/.test(f.logoutTime.trim())) {
      return toast.error("Giờ đăng xuất phải dạng HH:mm, ví dụ 21:00");
    }
    setSaving(true);
    try {
      if (!isApiEnabled()) throw new Error("API chưa cấu hình — không lưu được lên máy chủ");
      const saved = await putSessionPolicy({ ...f, logoutTime: f.logoutTime.trim() });
      setF(saved);
      toast.success("Đã lưu giờ tự đăng xuất");
    } catch (e: any) {
      toast.error(e?.message ?? "Lưu giờ tự đăng xuất thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Tự đăng xuất theo giờ">
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
            <Label className="text-sm">Bật tự đăng xuất</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Giờ đăng xuất (giờ Việt Nam)</Label>
            <Input
              type="time"
              className="max-w-[10rem]"
              value={f.logoutTime}
              onChange={(e) => setF({ ...f, logoutTime: e.target.value })}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Đến giờ này mọi tài khoản đang đăng nhập sẽ bị đăng xuất. Đăng nhập sau giờ đó vẫn được; phiên mới
            kéo đến cùng giờ ngày hôm sau. Quản lý thiết bị/phiên đang mở: menu{" "}
            <span className="font-medium">Phiên đăng nhập &amp; thiết bị</span>.
          </p>
          <Button onClick={() => void save()} disabled={saving || !writable || loading}>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        </div>
      )}
    </Section>
  );
}

const SCHEDULE_OPTIONS: { value: ScheduleMode; label: string; hint: string }[] = [
  {
    value: "INTERNAL",
    label: "Nội bộ (master Lịch chuyến)",
    hint: "Chấm xe theo lịch tạo trong Master → Lịch chuyến.",
  },
  {
    value: "CRM",
    label: "CRM / Limousine",
    hint: "Lấy chuyến từ CRM (VTHK) như hệ thống cũ.",
  },
  {
    value: "HYBRID",
    label: "Kết hợp (nội bộ + CRM)",
    hint: "Gộp cả lịch nội bộ và chuyến CRM trên cùng lộ trình.",
  },
];

function VehicleOpsTab() {
  const { session } = useAuth();
  const writable = canWrite(session?.role, "bao-tri");
  const [f, setF] = useState<VehicleOpsPolicy>({
    departPhotoRequired: false,
    lateMinutes: 5,
    scheduleMode: "INTERNAL",
    scheduleModeFromYaml: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled()) {
        setLoading(false);
        return;
      }
      try {
        const p = await getVehiclePhotoPolicy();
        if (!cancelled) setF(p);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ?? "Không tải được cấu hình báo giờ xe");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!writable) return toast.error("Tài khoản không có quyền ghi màn này");
    const late = Number(f.lateMinutes);
    if (!Number.isFinite(late) || late < 1 || late > 180) {
      return toast.error("Phút muộn phải từ 1 đến 180");
    }
    setSaving(true);
    try {
      if (!isApiEnabled()) throw new Error("API chưa cấu hình — không lưu được lên máy chủ");
      const saved = await saveVehicleOpsPolicy({
        departPhotoRequired: f.departPhotoRequired,
        lateMinutes: Math.trunc(late),
        scheduleMode: f.scheduleMode,
      });
      setF(saved);
      toast.success("Đã lưu cấu hình báo giờ xe");
    } catch (e: any) {
      toast.error(e?.message ?? "Lưu cấu hình báo giờ xe thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Nghiệp vụ báo giờ xe đến/đi">
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Ảnh khi báo xe rời VP</p>
            <div className="flex items-center gap-2">
              <Switch
                checked={f.departPhotoRequired}
                onCheckedChange={(v) => setF({ ...f, departPhotoRequired: v })}
              />
              <Label className="text-sm">Bắt buộc ảnh khi báo rời (webapp / app)</Label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tắt = ảnh tùy chọn (vẫn upload/chụp được). Bật = chấm rời trên webapp/app phải có ảnh.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Phút muộn so với giờ đón (bắt buộc nhập lý do khi rời)</Label>
            <Input
              type="number"
              min={1}
              max={180}
              className="max-w-[8rem]"
              value={f.lateMinutes}
              onChange={(e) => setF({ ...f, lateMinutes: Number(e.target.value) })}
            />
            <p className="text-[11px] text-muted-foreground">
              Mặc định 5 phút. Ví dụ 5 = rời trễ ≥ 5 phút so với giờ đón thì phải chọn/nhập lý do.
            </p>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Nguồn lịch chuyến</p>
            {f.scheduleModeFromYaml ? (
              <p className="text-[11px] text-amber-700">
                Đang theo YAML máy chủ — lưu bên dưới sẽ ghi đè thành cấu hình vận hành.
              </p>
            ) : null}
            <div className="space-y-2">
              {SCHEDULE_OPTIONS.map((opt) => {
                const on = f.scheduleMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      on ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border"
                    }`}
                    onClick={() => setF({ ...f, scheduleMode: opt.value, scheduleModeFromYaml: false })}
                  >
                    <div>{opt.label}</div>
                    <div className="mt-0.5 text-[11px] font-normal text-muted-foreground">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={() => void save()} disabled={saving || !writable || loading}>
            {saving ? "Đang lưu…" : "Lưu cấu hình báo giờ xe"}
          </Button>
        </div>
      )}
    </Section>
  );
}

function MaintenanceTab() {
  const { session } = useAuth();
  const writable = canWrite(session?.role, "bao-tri");
  const [f, setF] = useState<MaintenancePolicy>(emptyMaintenancePolicy());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled()) {
        setLoading(false);
        return;
      }
      try {
        const p = await fetchMaintenancePolicy();
        if (!cancelled) setF(p);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ?? "Không tải được cấu hình bảo trì");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setChannel = (key: keyof MaintenancePolicy, v: boolean) => {
    setF((prev) => {
      const next = { ...prev, [key]: v };
      if (key !== "blockAll" && key !== "enabled") {
        next.blockAll = false;
      }
      if (key === "blockAll" && v) {
        next.blockAppStaff = true;
        next.blockAppCustomer = true;
        next.blockWebStaff = true;
        next.blockWebCustomer = true;
      }
      return next;
    });
  };

  const save = async () => {
    if (!writable) return toast.error("Tài khoản không có quyền ghi màn này");
    setSaving(true);
    try {
      if (!isApiEnabled()) throw new Error("API chưa cấu hình — không lưu được lên máy chủ");
      const saved = await putMaintenancePolicy({
        ...f,
        title: f.title.trim() || "Hệ thống đang bảo trì",
        message: f.message.trim() || "Vui lòng quay lại sau. Xin cảm ơn.",
      });
      setF(saved);
      toast.success("Đã lưu cấu hình bảo trì");
    } catch (e: any) {
      toast.error(e?.message ?? "Lưu cấu hình bảo trì thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Cấu hình bảo trì">
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
            <Label className="text-sm">Bật bảo trì</Label>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Phạm vi kênh</p>
            <ChannelRow
              label="Tất cả (app + web)"
              checked={f.blockAll}
              onChange={(v) => setChannel("blockAll", v)}
            />
            <ChannelRow
              label="App / webapp nhân viên"
              checked={f.blockAll || f.blockAppStaff}
              disabled={f.blockAll}
              onChange={(v) => setChannel("blockAppStaff", v)}
            />
            <ChannelRow
              label="Web nhân viên"
              checked={f.blockAll || f.blockWebStaff}
              disabled={f.blockAll}
              onChange={(v) => setChannel("blockWebStaff", v)}
            />
            <p className="text-[11px] text-muted-foreground">
              Admin vẫn vào được web khi bảo trì để tắt cấu hình.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tiêu đề</Label>
              <Input
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                maxLength={200}
                placeholder="Hệ thống đang bảo trì"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nội dung</Label>
              <Textarea
                value={f.message}
                onChange={(e) => setF({ ...f, message: e.target.value })}
                maxLength={2000}
                rows={4}
                placeholder="Vui lòng quay lại sau…"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Ảnh bảo trì (tuỳ chọn)</Label>
            <PodPhotoInput
              photos={f.imageUrl ? [f.imageUrl] : []}
              onChange={(next) => setF({ ...f, imageUrl: next[0] ?? null })}
              max={1}
              allowGallery
              label="Chọn ảnh"
            />
          </div>

          <Button onClick={() => void save()} disabled={saving || !writable || loading}>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        </div>
      )}
    </Section>
  );
}

function MobileAppVersionTab() {
  const { session } = useAuth();
  const writable = canWrite(session?.role, "bao-tri");
  const [f, setF] = useState<MobileAppVersionPolicy>({
    minimumVersion: "1.0.0",
    minimumAndroidVersionCode: null,
    mandatoryUpdateEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isApiEnabled()) {
        setLoading(false);
        return;
      }
      try {
        const p = await fetchMobileAppVersion();
        if (!cancelled) setF(p);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message ?? "Không tải được chính sách phiên bản app");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!writable) return toast.error("Tài khoản không có quyền ghi màn này");
    if (!/^\d+(\.\d+){0,3}$/.test(f.minimumVersion.trim())) {
      return toast.error("Phiên bản tối thiểu phải dạng số chấm số, ví dụ 1.0.0");
    }
    setSaving(true);
    try {
      if (!isApiEnabled()) throw new Error("API chưa cấu hình — không lưu được lên máy chủ");
      const saved = await putMobileAppVersion({ ...f, minimumVersion: f.minimumVersion.trim() });
      setF({
        minimumVersion: saved.minimumVersion,
        minimumAndroidVersionCode: saved.minimumAndroidVersionCode ?? null,
        mandatoryUpdateEnabled: saved.mandatoryUpdateEnabled !== false,
      });
      toast.success("Đã lưu chính sách phiên bản app");
    } catch (e: any) {
      toast.error(e?.message ?? "Lưu chính sách phiên bản app thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Bắt buộc cập nhật app / webapp">
      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phiên bản tối thiểu (vd 1.0.0)">
              <Input
                value={f.minimumVersion}
                onChange={(e) => setF({ ...f, minimumVersion: e.target.value })}
                placeholder="1.0.0"
              />
            </Field>
            <Field label="Android versionCode tối thiểu (bỏ trống = không xét)">
              <Input
                inputMode="numeric"
                value={f.minimumAndroidVersionCode ?? ""}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setF({ ...f, minimumAndroidVersionCode: raw === "" ? null : Number(raw) });
                }}
                placeholder="1"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={f.mandatoryUpdateEnabled}
              onCheckedChange={(v) => setF({ ...f, mandatoryUpdateEnabled: v })}
            />
            <Label className="text-xs">Bật chặn bản cũ</Label>
          </div>
          <Button onClick={() => void save()} disabled={saving || !writable}>
            {saving ? "Đang lưu…" : "Lưu chính sách app"}
          </Button>
        </div>
      )}
    </Section>
  );
}
