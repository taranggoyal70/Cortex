"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  BrainIcon,
  DownloadSimpleIcon,
  FilesIcon,
  GaugeIcon,
  KeyIcon,
  ListIcon,
  PlugsConnectedIcon,
  SquaresFourIcon,
  TestTubeIcon,
  XIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: GaugeIcon },
  { href: "/sources", label: "Sources", icon: FilesIcon },
  { href: "/skills", label: "Skills", icon: SquaresFourIcon },
  { href: "/review", label: "Review", icon: BrainIcon },
  { href: "/playground", label: "Playground", icon: TestTubeIcon },
  { href: "/export", label: "Export", icon: DownloadSimpleIcon },
] as const;

const settingsNav = [
  { href: "/settings/tokens", label: "API tokens", icon: KeyIcon },
  { href: "/settings/connections", label: "Connections", icon: PlugsConnectedIcon },
] as const;

function SidebarNav({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 px-3 pt-2">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
            isActive(item.href)
              ? "bg-accent/10 text-paper ring-1 ring-inset ring-accent/20"
              : "text-muted-light hover:bg-white/[0.035] hover:text-paper",
          )}
        >
          <item.icon size={17} weight={isActive(item.href) ? "fill" : "regular"} />
          {item.label}
        </Link>
      ))}

      <p className="px-2.5 pb-1 pt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        Settings
      </p>
      {settingsNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
            isActive(item.href)
              ? "bg-accent/10 text-paper ring-1 ring-inset ring-accent/20"
              : "text-muted-light hover:bg-white/[0.035] hover:text-paper",
          )}
        >
          <item.icon size={17} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function OrgSwitcher() {
  return (
    <div className="px-3 pb-3">
      <OrganizationSwitcher
        hidePersonal={false}
        afterCreateOrganizationUrl="/dashboard"
        afterSelectOrganizationUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: "w-full",
            organizationSwitcherTrigger:
              "w-full justify-between border border-line rounded-lg px-2.5 py-2",
          },
        }}
      />
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-[#090b10] px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg border border-line-strong p-2 text-muted-light transition hover:text-paper"
        >
          <ListIcon size={18} />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-[#090b10]">
            <div className="flex h-14 items-center justify-between px-4">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg border border-line-strong p-2 text-muted-light transition hover:text-paper"
              >
                <XIcon size={18} />
              </button>
            </div>
            <OrgSwitcher />
            <SidebarNav isActive={isActive} onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto flex items-center gap-2 border-t border-line px-4 py-3 text-sm text-muted-light">
              <UserButton />
              <span>Account</span>
            </div>
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[240px] flex-col border-r border-line bg-[#090b10] lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand />
        </div>
        <OrgSwitcher />
        <SidebarNav isActive={isActive} />
        <div className="mt-auto flex items-center gap-2 border-t border-line px-4 py-3 text-sm text-muted-light">
          <UserButton />
          <span>Account</span>
        </div>
      </aside>
    </>
  );
}
