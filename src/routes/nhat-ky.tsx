import { createFileRoute } from "@tanstack/react-router";
import { ProtectedPage } from "@/components/AppShell";
import { VehicleReportPage } from "@/components/vehicle-report/VehicleReportPage";

export const Route = createFileRoute("/nhat-ky")({
  head: () => ({
    meta: [
      { title: "Nhật ký báo giờ xe — GHN" },
      { name: "description", content: "Nhật ký các lần báo giờ xe đến/đi." },
    ],
  }),
  component: () => (
    <ProtectedPage title="Nhật ký báo" screen="bao-gio-xe">
      <VehicleReportPage view="nhat-ky" />
    </ProtectedPage>
  ),
});
