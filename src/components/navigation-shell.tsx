"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Upload,
  Network,
  User,
  AlertTriangle,
  GitPullRequest,
  Clock,
  MapPin,
  Eye,
  FileText,
  BarChart3,
  Shield,
  HelpCircle,
  Sun,
  Moon,
  Search,
  ChevronDown,
  LogOut,
  Users,
  Settings,
  History,
  Key,
  Menu,
  X,
  UserCheck,
  Loader2,
  Radio,
  Sparkles,
  Command,
  ChevronRight,
  ShieldCheck,
  Flame,
  Phone,
  CreditCard,
  Car,
  Trash2
} from "lucide-react";
import { getClientSession, setClientSession, logAuditEvent, Role } from "@/lib/auth";
import { DatabaseClient } from "@/lib/supabase";
import { MockDatabase, EMPTY_DB } from "@/lib/mock-db";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
  badge?: number | string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isAdminOpen, setIsAdminOpen] = React.useState(true);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState("");
  const [userProfile, setUserProfile] = React.useState<{
    name: string;
    role: Role;
    badgeId: string;
  } | null>(null);

  // Live count states
  const [alertCount, setAlertCount] = React.useState<number>(12);
  const [reviewCount, setReviewCount] = React.useState<number>(3);

  // Command Palette states
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const [paletteQuery, setPaletteQuery] = React.useState("");
  const [allEntities, setAllEntities] = React.useState<any[]>([]);
  const [resetting, setResetting] = React.useState(false);

  const handleQuickReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "clear" })
      });
    } catch (e) {
      console.error(e);
    }
    MockDatabase.clear();
    localStorage.setItem("kraken_mock_db", JSON.stringify(EMPTY_DB));
    localStorage.removeItem("watchlists_data");
    window.location.reload();
  };

  // Live clock
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync session and handle client-side route protection
  React.useEffect(() => {
    const session = getClientSession();
    if (!session) {
      router.push("/login");
    } else {
      setUserProfile({
        name: session.full_name,
        role: session.role,
        badgeId: session.badge_id
      });
    }
  }, [router, pathname]);

  // Auto-sync initial database only once if never visited
  React.useEffect(() => {
    const autoSyncDatabase = async () => {
      try {
        const raw = localStorage.getItem("kraken_mock_db");
        if (raw === null) {
          // Initialize with static default mock data on very first fresh visit
          const res = await fetch("/api/demo/load");
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("kraken_mock_db", JSON.stringify(data.dbDump || data));
          }
        }
      } catch (err) {
        console.error("Initialization sync failed:", err);
      }
    };
    autoSyncDatabase();
  }, []);

  // Load all entities & alert counts for search typeahead in palette
  React.useEffect(() => {
    const fetchEntitiesForPalette = async () => {
      try {
        const [ents, alerts] = await Promise.all([
          DatabaseClient.getEntities(),
          DatabaseClient.getAlerts()
        ]);
        setAllEntities(ents);
        if (alerts) setAlertCount(alerts.filter(a => a.status === 'new' || a.status === 'investigating').length);
      } catch (err) {
        console.log("Failed to load palette items", err);
      }
    };
    fetchEntitiesForPalette();
  }, []);

  // Listen for Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    if (userProfile) {
      await logAuditEvent("user_logout", "profile", `usr-${userProfile.role}`, { role: userProfile.role });
    }
    setClientSession(null);
    router.push("/login");
  };

  const navGroups: NavGroup[] = [
    {
      title: "OPERATIONS",
      items: [
        { name: "Intelligence Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Cases Diary", href: "/cases", icon: Briefcase },
        { name: "Data Ingestion Cascade", href: "/ingestion", icon: Upload },
        { name: "Review Queue", href: "/review-queue", icon: GitPullRequest, badge: reviewCount > 0 ? reviewCount : undefined },
      ]
    },
    {
      title: "INTELLIGENCE & NETWORK",
      items: [
        { name: "Network Graph Canvas", href: "/graph", icon: Network },
        { name: "Anomaly Alerts", href: "/alerts", icon: AlertTriangle, badge: alertCount > 0 ? alertCount : undefined },
        { name: "CDR & Action Timeline", href: "/timeline", icon: Clock },
        { name: "Geo-Spatial Triangulation", href: "/map", icon: MapPin },
        { name: "Threat Watchlists", href: "/watchlists", icon: Eye },
      ]
    },
    {
      title: "ANALYSIS & DOSSIERS",
      items: [
        { name: "Intelligence Briefing PDF", href: "/reports", icon: FileText },
        { name: "Graph Analytics Matrix", href: "/analytics", icon: BarChart3 },
      ]
    },
    {
      title: "GOVERNANCE & ADMIN",
      items: [
        { name: "User Roster", href: "/admin/users", icon: Users, adminOnly: true },
        { name: "Audit Log Ledger", href: "/admin/audit-log", icon: History, supervisorOnly: true },
        { name: "System Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
        { name: "API Gateways", href: "/admin/api-keys", icon: Key, adminOnly: true },
        { name: "Legal & Ethics Compliance", href: "/legal", icon: Shield },
        { name: "System Glossary & Help", href: "/help", icon: HelpCircle },
      ]
    }
  ];

  // Match items in command palette
  const filteredPaletteItems = React.useMemo(() => {
    const cleanQuery = paletteQuery.toLowerCase().trim();
    if (!cleanQuery) return [];

    const matches: any[] = [];
    
    // 1. Navigation items matches
    const allNav = navGroups.flatMap(g => g.items);
    allNav.forEach(p => {
      if (p.name.toLowerCase().includes(cleanQuery)) {
        matches.push({ type: 'page', label: p.name, href: p.href, icon: p.icon });
      }
    });

    // 2. Suspect entities matches
    allEntities.forEach(e => {
      if (
        e.canonical_name.toLowerCase().includes(cleanQuery) ||
        (e.aliases && e.aliases.some((a: string) => a.toLowerCase().includes(cleanQuery)))
      ) {
        matches.push({
          type: 'entity',
          label: e.canonical_name,
          sublabel: e.entity_type.toUpperCase(),
          href: `/entity/${e.id}`,
          risk: e.risk_score,
          entityType: e.entity_type
        });
      }
    });

    return matches.slice(0, 8);
  }, [paletteQuery, allEntities]);

  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050811] text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 animate-pulse">
            <Network className="h-8 w-8 text-sky-400" />
          </div>
          <p className="text-xs font-mono text-sky-400 tracking-wider">VERIFYING AGENCY CLEARANCE...</p>
        </div>
      </div>
    );
  }

  const roleColor = userProfile.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
    : userProfile.role === 'investigator' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
    : userProfile.role === 'supervisor' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground max-w-full overflow-x-hidden">
      {/* SYNTHETIC DATA BANNER */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600 text-white py-1 px-4 text-center text-[11px] font-bold uppercase tracking-widest select-none shrink-0 flex items-center justify-center gap-2 shadow-sm">
        <Radio className="h-3 w-3 animate-pulse text-amber-200" />
        <span>DEMONSTRATION SYSTEM — SYNTHETIC DATA ENGINE (SIH-189 LEA SPECIFICATION)</span>
      </div>

      {/* TOP COMMAND HUD BAR */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 focus:outline-none md:hidden"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 group-hover:border-sky-400 transition-colors">
              <Network className="h-5 w-5 text-sky-400" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                KRAKEN <span className="text-sky-400 font-mono text-xs font-semibold px-1 py-0.2 rounded bg-sky-950/60 border border-sky-800/80">C.N.A.</span>
              </span>
            </div>
          </Link>

          {/* THREAT STATUS BADGE */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-rose-400 font-semibold">DEFCON 3</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">ELEVATED SURVEILLANCE</span>
          </div>
        </div>

        {/* HUD RIGHT CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Shortcut */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden md:inline">Global Intel Search</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
              Ctrl+K
            </kbd>
          </button>

          {/* Real-time Clock */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
            <Clock className="h-3 w-3 text-sky-400" />
            <span>{currentTime || "00:00:00 IST"}</span>
          </div>

          {/* 1-Click Reset Data Button */}
          <button
            onClick={handleQuickReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/80 hover:bg-rose-900/60 hover:border-rose-600 text-rose-300 hover:text-rose-100 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Wipe and reset all website data in 1 click"
          >
            {resetting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span className="hidden sm:inline">1-Click Reset Data</span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <div className="h-6 w-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
              {userProfile.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="font-semibold text-slate-200 text-xs leading-none">{userProfile.name}</p>
              <span className={cn("text-[9px] font-mono uppercase px-1 rounded border inline-block mt-0.5", roleColor)}>
                {userProfile.role} • {userProfile.badgeId}
              </span>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-sky-400" />}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-rose-950 hover:border-rose-800 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
            title="Terminate Clearance Session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* BODY WITH SIDEBAR & CONTENT */}
      <div className="flex flex-1">
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={cn(
            "w-64 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl flex-col py-4 shrink-0 transition-all duration-200 ease-in-out md:flex",
            isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex shadow-2xl pt-16 bg-slate-950" : "hidden"
          )}
        >
          <div className="flex-1 px-3 space-y-5 overflow-y-auto">
            {navGroups.map((group) => {
              // Filter out admin-only or supervisor-only items based on clearance
              const visibleItems = group.items.filter(item => {
                if (item.adminOnly && userProfile.role !== "admin") return false;
                if (item.supervisorOnly && userProfile.role !== "admin" && userProfile.role !== "supervisor") return false;
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1">
                  <p className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                            isActive
                              ? "bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-500/10"
                              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300")} />
                            <span>{item.name}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className={cn(
                              "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                              item.href === "/alerts"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AGENCY SYSTEM METRICS FOOTER */}
          <div className="p-3 border-t border-slate-800/80 mx-3 mt-auto">
            <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>DATABASE</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  CONNECTED
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>GRAPH ENGINE</span>
                <span className="text-sky-400 font-semibold">CYTOSCAPE v3.34</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN PAGE VIEWPORT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* GLOBAL COMMAND PALETTE MODAL */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center border-b border-slate-800 px-4 py-3 gap-2">
              <Search className="h-5 w-5 text-sky-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search suspects, phone numbers, vehicle plates, or pages..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
              />
              <button
                onClick={() => setIsPaletteOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded border border-slate-800"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredPaletteItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {paletteQuery.trim() ? "No intelligence entities or pages matching your query." : "Type a suspect name (e.g. 'Devendra', 'Arjun', 'Reacher'), phone, or command."}
                </div>
              ) : (
                filteredPaletteItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsPaletteOpen(false);
                      setPaletteQuery("");
                      router.push(item.href);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/80 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 group-hover:border-sky-500/50">
                        {item.type === 'page' ? <LayoutDashboard className="h-4 w-4" />
                          : item.entityType === 'phone' ? <Phone className="h-4 w-4 text-emerald-400" />
                          : item.entityType === 'bank_account' ? <CreditCard className="h-4 w-4 text-purple-400" />
                          : item.entityType === 'vehicle' ? <Car className="h-4 w-4 text-amber-400" />
                          : <User className="h-4 w-4 text-sky-400" />}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 truncate">
                          {item.label}
                        </p>
                        {item.sublabel && (
                          <p className="text-[10px] text-slate-500 font-mono">{item.sublabel}</p>
                        )}
                      </div>
                    </div>
                    {item.risk !== undefined && (
                      <span className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded",
                        item.risk >= 80 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : item.risk >= 50 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      )}>
                        Risk: {item.risk}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
