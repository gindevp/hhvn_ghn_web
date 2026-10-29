import { createFileRoute } from "@tanstack/react-router";
import { ProtectedPage } from "@/components/AppShell";
import { VehicleReportPage } from "@/components/vehicle-report/VehicleReportPage";

export const Route = createFileRoute("/tong-quan")({
  head: () => ({
    meta: [
      { title: "Tổng quan giờ xe — GHN" },
      { name: "description", content: "Tổng quan và theo xe tại văn phòng." },
    ],
  }),
  component: () => (
    <ProtectedPage title="Tổng quan giờ xe" screen="bao-gio-xe">
      <VehicleReportPage view="tong-quan" />
    </ProtectedPage>
  ),
});
