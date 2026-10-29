import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { canRead } from "@/lib/rbac";
import { MOBILE_BOTTOM_TABS } from "@/lib/mobile-tasks";

export function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { session } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = MOBILE_BOTTOM_TABS.filter((tab) => {
    if (tab.action === "menu") return true;
    if (tab.screen) return canRead(session?.role, tab.screen);
    return true;
  });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Điều hướng mobile"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.to != null &&
            (pathname === tab.to || (tab.to !== "/" && pathname.startsWith(tab.to + "/")));
          const className = cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          );

          if (tab.action === "menu") {
            return (
              <li key={tab.id} className="flex flex-1">
                <button type="button" onClick={onOpenMenu} className={className}>
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={tab.id} className="flex flex-1">
              <Link to={tab.to as "/"} className={className}>
                <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
