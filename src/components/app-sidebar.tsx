"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  Image,
  Languages,
  Wand2,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/dashboard", label: "Scripts", icon: FileText },
  { href: "/dashboard/thumbnails", label: "Thumbnails", icon: Image },
  { href: "/translate", label: "Translate", icon: Languages },
  { href: "/generate", label: "Generate", icon: Wand2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="group/sidebar flex h-full w-[60px] flex-col border-r border-border bg-sidebar transition-all duration-300 hover:w-[200px]">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-3 overflow-hidden border-b border-border px-4">
        <Languages className="size-6 shrink-0 text-sidebar-primary" />
        <span className="truncate text-sm font-semibold text-sidebar-foreground opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
          ScriptFlow
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-hidden px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
                    {item.label}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="group-hover/sidebar:hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {profile.role === "owner" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/admin"
                className={cn(
                  "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Shield className="size-4 shrink-0" />
                <span className="truncate opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
                  Admin
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="group-hover/sidebar:hidden">
              Admin
            </TooltipContent>
          </Tooltip>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="border-t border-border px-2 py-3">
        <div className="flex items-center gap-3 overflow-hidden px-3 pb-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
            {(profile.display_name ?? profile.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {profile.display_name ?? profile.email}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">
              {profile.role}
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="truncate opacity-0 transition-opacity duration-300 group-hover/sidebar:opacity-100">
                Log out
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="group-hover/sidebar:hidden">
            Log out
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
