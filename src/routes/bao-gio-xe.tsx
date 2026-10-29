import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — redirect to dedicated chấm xe route. */
export const Route = createFileRoute("/bao-gio-xe")({
  beforeLoad: () => {
    throw redirect({ to: "/cham-xe" });
  },
});
