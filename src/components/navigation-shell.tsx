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
  Loader2
} from "lucide-react";
import { getClientSession, setClientSession, logAuditEvent, Role } from "@/lib/auth";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  supervisorOnly?: boolean;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Cases Diary", href: "/cases", icon: Briefcase },
  { name: "Data Ingestion", href: "/ingestion", icon: Upload },
  { name: "Network Graph", href: "/graph", icon: Network },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Review Queue", href: "/review-queue", icon: GitPullRequest },
  { name: "Timeline", href: "/timeline", icon: Clock },
  { name: "Map", href: "/map", icon: MapPin },
  { name: "Watchlists", href: "/watchlists", icon: Eye },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const secondaryNavigation: NavItem[] = [
  { name: "Legal & Ethics", href: "/legal", icon: Shield },
  { name: "Help & Glossary", href: "/help", icon: HelpCircle },
];

const adminNavigation: NavItem[] = [
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Audit Log", href: "/admin/audit-log", icon: History },
  { name: "API Keys", href: "/admin/api-keys", icon: Key },
];

export function NavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<{
    name: string;
    role: Role;
    badgeId: string;
  } | null>(null);

  // Command Palette states
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);
  const [paletteQuery, setPaletteQuery] = React.useState("");
  const [allEntities, setAllEntities] = React.useState<any[]>([]);

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

  // Auto-sync database from server if empty/stale in browser localStorage
  React.useEffect(() => {
    const autoSyncDatabase = async () => {
      try {
        const raw = localStorage.getItem("kraken_mock_db");
        if (raw === null) {
          console.log("Auto-synchronizing mock database from server...");
          const res = await fetch("/api/demo/load");
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("kraken_mock_db", JSON.stringify(data));
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Auto-sync failed:", err);
      }
    };
    autoSyncDatabase();
  }, []);

  // Load all entities for search typeahead in palette
  React.useEffect(() => {
    const fetchEntitiesForPalette = async () => {
      try {
        const ents = await DatabaseClient.getEntities();
        setAllEntities(ents);
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

  // Auto-expand admin sub-menu if currently on an admin page
  React.useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setIsAdminOpen(true);
    }
  }, [pathname]);

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

  const getBreadcrumb = () => {
    if (pathname === "/") return ["Home", "Dashboard"];
    const parts = pathname.split("/").filter(Boolean);
    return ["Home", ...parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace("-", " "))];
  };

  // Match items in command palette
  const filteredPaletteItems = React.useMemo(() => {
    const cleanQuery = paletteQuery.toLowerCase().trim();
    if (!cleanQuery) return [];

    const matches: any[] = [];
    
    // 1. Navigation items matches
    const pages = [
      { name: "Go to Dashboard", href: "/" },
      { name: "Go to Ingestion Wizard", href: "/ingestion" },
      { name: "Go to Network Graph Canvas", href: "/graph" },
      { name: "Go to Alerts Queue", href: "/alerts" },
      { name: "Go to Review Queue", href: "/review" },
      { name: "Go to Watchlists Monitor", href: "/watchlists" },
      { name: "Go to Cases List", href: "/cases" },
      { name: "Go to Timeline Logs", href: "/timeline" },
      { name: "Go to Map Grid", href: "/map" }
    ];

    pages.forEach(p => {
      if (p.name.toLowerCase().includes(cleanQuery)) {
        matches.push({ type: 'page', label: p.name, href: p.href });
      }
    });

    // 2. Suspect entities matches
    allEntities.forEach(e => {
      if (e.canonical_name.toLowerCase().includes(cleanQuery)) {
        matches.push({ type: 'suspect', label: `Profile: ${e.canonical_name}`, href: `/entity/${e.id}`, risk: e.risk_score });
      }
    });

    return matches.slice(0, 8);
  }, [paletteQuery, allEntities]);

  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Authorizing credential audit...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground max-w-full overflow-x-hidden">
      {/* SYNTHETIC DATA BANNER */}
      <div className="bg-amber-600 text-white py-1 px-4 text-center text-xs font-bold uppercase tracking-wider select-none shrink-0 flex items-center justify-center gap-2">
        <span>⚠ DEMONSTRATION SYSTEM — SYNTHETIC DATA ONLY</span>
      </div>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b px-4 md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6 text-blue-500 animate-pulse" />
            <span className="font-bold tracking-tight">KRAKEN NETWORK</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="rounded p-1 text-muted-foreground hover:bg-muted focus:outline-none"
          >
            {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Sidebar Navigation */}
        <aside
          className={cn(
            "w-64 border-r bg-card flex-col py-4 shrink-0 transition-transform duration-200 ease-in-out md:flex",
            isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex bg-card" : "hidden"
          )}
        >
          {/* Logo */}
          <div className="px-6 pb-4 mb-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-6 w-6 text-blue-500" />
              <span className="font-bold tracking-tight text-lg">KRAKEN C.N.A.</span>
            </div>
            {isMobileOpen && (
              <button onClick={() => setIsMobileOpen(false)} className="md:hidden">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* User profile brief */}
          <div className="px-6 py-3 mb-4 bg-muted/40 mx-4 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                SK
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate leading-none">{userProfile.name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 font-mono px-1 rounded uppercase tracking-wider">
                    {userProfile.role}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {userProfile.badgeId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1 px-4 overflow-y-auto scrollbar-thin">
            {/* Dynamic Role-Based Sidebar Navigation Filtering */}
            {navigation.filter(item => {
              if (userProfile.role === 'viewer') {
                return !['/ingestion', '/reports', '/review-queue'].includes(item.href);
              }
              if (userProfile.role === 'investigator') {
                return !['/reports'].includes(item.href);
              }
              return true;
            }).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}

            {/* Admin collapsible section */}
            {userProfile.role === "admin" && (
              <div>
                <button
                  onClick={() => setIsAdminOpen(!isAdminOpen)}
                  className={cn(
                    "w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <UserCheck className="mr-3 h-4 w-4 shrink-0" />
                    <span>Admin Panel</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isAdminOpen ? "rotate-180" : ""
                    )}
                  />
                </button>
                {isAdminOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l space-y-1">
                    {adminNavigation.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "group flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                            isActive
                              ? "bg-muted text-foreground font-semibold"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <item.icon className="mr-2 h-3.5 w-3.5 shrink-0" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 mt-4 border-t">
              {secondaryNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer controls inside sidebar */}
          <div className="px-4 pt-4 mt-auto border-t space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-red-500 hover:bg-red-500/15"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top Header */}
          <header className="h-16 border-b px-6 flex items-center justify-between shrink-0 bg-card">
            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              {getBreadcrumb().map((crumb, idx) => (
                <React.Fragment key={crumb}>
                  {idx > 0 && <span>/</span>}
                  <span className={cn(idx === getBreadcrumb().length - 1 ? "text-foreground font-semibold" : "")}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>

             {/* Global Search Bar */}
             <div 
               className="relative w-64 md:w-96 cursor-pointer"
               onClick={() => setIsPaletteOpen(true)}
             >
               <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                 <Search className="h-4 w-4" />
               </span>
               <input
                 type="text"
                 readOnly
                 placeholder="Type Ctrl+K to search..."
                 className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background/50 text-sm cursor-pointer focus:outline-none transition-all"
               />
               <kbd className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[10px] font-mono text-muted-foreground select-none">
                 Ctrl K
               </kbd>
             </div>
           </header>
 
           {/* Children views */}
           <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
             {children}
           </div>
         </main>
       </div>

       {/* COMMAND PALETTE DIALOG OVERLAY */}
       {isPaletteOpen && (
         <div 
           className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[15vh] px-4"
           onClick={() => setIsPaletteOpen(false)}
         >
           <div 
             className="bg-card border rounded-lg max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[50vh] text-xs"
             onClick={(e) => e.stopPropagation()}
           >
             {/* Header search input */}
             <div className="p-3 border-b flex items-center gap-2">
               <Search className="h-4.5 w-4.5 text-muted-foreground" />
               <input
                 type="text"
                 autoFocus
                 placeholder="Type a page command or target suspect name..."
                 className="w-full bg-transparent focus:outline-none text-sm text-foreground placeholder:text-muted-foreground h-7"
                 value={paletteQuery}
                 onChange={(e) => setPaletteQuery(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === "Escape") {
                     setIsPaletteOpen(false);
                   }
                 }}
               />
             </div>

             {/* Results Scroll list */}
             <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-border/20 select-none scrollbar-thin max-h-[300px]">
               {paletteQuery.trim() === "" ? (
                 <div className="space-y-1.5">
                   <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 py-1">
                     Default Navigation Commands
                   </div>
                   {[
                     { name: "Go to Dashboard", href: "/" },
                     { name: "Go to Data Ingestion", href: "/ingestion" },
                     { name: "Go to Network Graph Canvas", href: "/graph" },
                     { name: "Go to Case Dossiers List", href: "/cases" },
                     { name: "Go to Watchlists Monitor", href: "/watchlists" },
                     { name: "Go to Active Alerts Queue", href: "/alerts" }
                   ].map((item, idx) => (
                     <div
                       key={idx}
                       onClick={() => {
                         router.push(item.href);
                         setIsPaletteOpen(false);
                         setPaletteQuery("");
                       }}
                       className="p-2 hover:bg-muted/15 rounded cursor-pointer font-medium flex justify-between items-center"
                     >
                       <span>{item.name}</span>
                       <span className="text-[9px] text-muted-foreground">Jump</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <>
                   {filteredPaletteItems.length === 0 ? (
                     <div className="p-4 text-center text-muted-foreground text-xs font-mono">
                       No matching commands or profiles found.
                     </div>
                   ) : (
                     filteredPaletteItems.map((item, idx) => (
                       <div
                         key={idx}
                         onClick={() => {
                           router.push(item.href);
                           setIsPaletteOpen(false);
                           setPaletteQuery("");
                         }}
                         className="p-2.5 hover:bg-primary/10 rounded cursor-pointer flex justify-between items-center transition-all"
                       >
                         <div>
                           <span className={`font-semibold ${item.type === 'page' ? 'text-foreground' : 'text-blue-400'}`}>
                             {item.label}
                           </span>
                         </div>
                         <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted">
                           {item.type} {item.risk ? `(Risk: ${item.risk})` : ""}
                         </span>
                       </div>
                     ))
                   )}
                 </>
               )}
             </div>

             {/* Footer keybind details */}
             <div className="p-2 bg-muted/20 border-t flex justify-between items-center text-[10px] text-muted-foreground select-none">
               <span>Press <kbd className="font-mono bg-muted border px-1 rounded">ESC</kbd> to exit workspace</span>
               <span>Ctrl+K to toggle anywhere</span>
             </div>
           </div>
         </div>
       )}
     </div>
  );
}
