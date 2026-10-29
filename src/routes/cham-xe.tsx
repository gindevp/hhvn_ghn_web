import { createFileRoute } from "@tanstack/react-router";
import { ProtectedPage } from "@/components/AppShell";
import { VehicleReportPage } from "@/components/vehicle-report/VehicleReportPage";

export const Route = createFileRoute("/cham-xe")({
  head: () => ({
    meta: [
      { title: "Chấm xe đến/đi — GHN" },
      { name: "description", content: "Báo giờ xe đến và rời văn phòng." },
    ],
  }),
  component: () => (
    <ProtectedPage title="Chấm xe đến/đi" screen="bao-gio-xe">
      <VehicleReportPage view="cham" />
    </ProtectedPage>
  ),
});
