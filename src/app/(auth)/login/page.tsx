"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert,
  Network,
  ShieldCheck,
  Key,
  Lock,
  Mail,
  Fingerprint,
  Radio,
  Sparkles,
  UserCheck,
  Shield,
  Eye,
  CheckCircle2,
  ChevronRight,
  Terminal,
  Activity
} from "lucide-react";
import { setClientSession, logAuditEvent, Role } from "@/lib/auth";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  badgeId: string;
  role: string;
  status: "active" | "suspended";
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "usr-admin-1",
    name: "Agent Administrator",
    email: "admin@agency.gov.in",
    password: "password123",
    badgeId: "POL-9999",
    role: "admin",
    status: "active"
  },
  {
    id: "usr-reach-1",
    name: "Jack Reacher",
    email: "jack.reacher@agency.gov.in",
    password: "password123",
    badgeId: "POL-0084",
    role: "investigator",
    status: "active"
  },
  {
    id: "usr-reach-2",
    name: "Oscar Finlay",
    email: "oscar.finlay@agency.gov.in",
    password: "password123",
    badgeId: "POL-0120",
    role: "supervisor",
    status: "active"
  },
  {
    id: "usr-reach-3",
    name: "Roscoe Conklin",
    email: "roscoe.conklin@agency.gov.in",
    password: "password123",
    badgeId: "POL-0245",
    role: "viewer",
    status: "active"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@agency.gov.in");
  const [password, setPassword] = React.useState("password123");
  const [totp, setTotp] = React.useState("123456");
  const [step, setStep] = React.useState<"login" | "mfa">("login");
  const [error, setError] = React.useState("");
  const [matchedUser, setMatchedUser] = React.useState<UserAccount | null>(null);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);

  // Load the current registered user accounts list
  const getRegisteredUsers = (): UserAccount[] => {
    if (typeof window === "undefined") return DEFAULT_USERS;
    const saved = localStorage.getItem("kraken_users");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_USERS;
      }
    }
    return DEFAULT_USERS;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in official credentials.");
      return;
    }

    setIsAuthenticating(true);
    await new Promise(r => setTimeout(r, 400));

    const roster = getRegisteredUsers();
    const match = roster.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!match) {
      setIsAuthenticating(false);
      setError("Access Denied: Invalid email or unauthorized agency account.");
      return;
    }

    if (match.status === "suspended") {
      setIsAuthenticating(false);
      setError("Access Blocked: Your operational clearance has been suspended by an administrator.");
      return;
    }

    if (match.password !== password) {
      setIsAuthenticating(false);
      setError("Access Denied: Incorrect password. Unauthorized attempts are logged.");
      return;
    }

    setIsAuthenticating(false);
    setMatchedUser(match);
    setStep("mfa");
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!totp.trim() || totp.trim().length !== 6) {
      setError("Invalid 6-digit MFA passcode format.");
      return;
    }

    if (!matchedUser) {
      setError("Session handshake corrupted. Please sign in again.");
      setStep("login");
      return;
    }

    setIsAuthenticating(true);
    await new Promise(r => setTimeout(r, 500));

    // Build the session based on the matched user's profile
    const session = {
      id: matchedUser.id,
      email: matchedUser.email,
      full_name: matchedUser.name,
      badge_id: matchedUser.badgeId,
      role: matchedUser.role as Role,
      organization_id: "org-delhi-intel",
      organization_name: "Central Intelligence & Crime Directorate"
    };

    setClientSession(session);
    await logAuditEvent("user_login", "profile", session.id, { email: session.email, role: session.role }, session.id);
    
    // Redirect to home dashboard
    router.push("/");
  };

  const quickSelectRole = (roleKey: string) => {
    const roster = getRegisteredUsers();
    const demo = roster.find(u => u.role === roleKey) || DEFAULT_USERS.find(u => u.role === roleKey);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    } else {
      setEmail(`${roleKey}@agency.gov.in`);
      setPassword("password123");
    }
    setStep("login");
    setError("");
  };

  const handleQuickInstantLogin = async (roleKey: string) => {
    const roster = getRegisteredUsers();
    const demo = roster.find(u => u.role === roleKey) || DEFAULT_USERS.find(u => u.role === roleKey) || DEFAULT_USERS[0];
    
    const session = {
      id: demo.id,
      email: demo.email,
      full_name: demo.name,
      badge_id: demo.badgeId,
      role: demo.role as Role,
      organization_id: "org-delhi-intel",
      organization_name: "Central Intelligence & Crime Directorate"
    };

    setClientSession(session);
    await logAuditEvent("user_login", "profile", session.id, { email: session.email, role: session.role, bypass: true }, session.id);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between relative overflow-hidden cyber-grid">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP TELEMETRY RIBBON */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-emerald-400 font-semibold tracking-wider">SYSTEM SECURE & ONLINE</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline font-mono">NODE: DL-CENTRAL-01</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span className="text-sky-400 flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            AES-256-GCM
          </span>
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 uppercase font-bold text-[10px]">
            DEMO ENVIRONMENT
          </span>
        </div>
      </header>

      {/* MAIN AUTHENTICATION CONTAINER */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-md space-y-5">
          
          {/* LOGO & TITLE */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 border border-sky-500/30 shadow-lg shadow-sky-500/10">
              <Network className="h-10 w-10 text-sky-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-sky-500"></span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                KRAKEN <span className="text-sky-400 font-mono">C.N.A.</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Advanced AI Criminal Network Analysis & Intelligence Decision Support System
              </p>
            </div>
          </div>

          {step === "login" ? (
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-sky-400" />
                    Agency Security Clearance
                  </span>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded">
                    STEP 1/2
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Enter authorized officer credentials or select a one-click demo role.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-3.5 pt-0">
                  {error && (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-sky-400" />
                      Official Agency Email
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="investigator@agency.gov.in"
                      className="border-slate-700/80 bg-slate-950/80 text-slate-100 placeholder:text-slate-600 focus-visible:border-sky-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-sky-400" />
                      Clearance Password
                    </label>
                    <Input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="border-slate-700/80 bg-slate-950/80 text-slate-100 placeholder:text-slate-600 focus-visible:border-sky-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {/* QUICK DEMO ROLE BUTTONS */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Fingerprint className="h-3.5 w-3.5 text-sky-400" />
                        Quick Demo Profiles
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">1-Click Auto-Fill</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => quickSelectRole("admin")}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-sky-500/50 transition-all text-left flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="h-6 w-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold shrink-0">
                          ADM
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-200 group-hover:text-sky-300 leading-tight">Admin</p>
                          <p className="text-[10px] text-slate-500">POL-9999</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => quickSelectRole("investigator")}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-sky-500/50 transition-all text-left flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="h-6 w-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold shrink-0">
                          INV
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-200 group-hover:text-sky-300 leading-tight">Investigator</p>
                          <p className="text-[10px] text-slate-500">POL-0084</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => quickSelectRole("supervisor")}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-sky-500/50 transition-all text-left flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                          SUP
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-200 group-hover:text-sky-300 leading-tight">Supervisor</p>
                          <p className="text-[10px] text-slate-500">POL-0120</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => quickSelectRole("viewer")}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-sky-500/50 transition-all text-left flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="h-6 w-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                          VIW
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-medium text-slate-200 group-hover:text-sky-300 leading-tight">Viewer</p>
                          <p className="text-[10px] text-slate-500">POL-0245</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="cyber"
                    className="w-full text-sm font-semibold"
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? "Authenticating Clearance..." : "Proceed to 2FA Verification"}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-sky-400 hover:text-sky-300"
                    onClick={() => handleQuickInstantLogin("admin")}
                  >
                    ⚡ Instant Judge Bypass (Enter as Admin)
                  </Button>
                </CardFooter>
              </form>
            </Card>
          ) : (
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                    Multi-Factor Authentication
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                    STEP 2/2
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Officer: <strong className="text-slate-200">{matchedUser?.name}</strong> ({matchedUser?.badgeId})
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleMfaSubmit}>
                <CardContent className="space-y-4 pt-0">
                  {error && (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2.5">
                    <Radio className="h-4 w-4 shrink-0 animate-pulse text-emerald-400" />
                    <span>Demo TOTP simulated: code <strong className="font-mono text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">123456</strong> is pre-filled.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-emerald-400" />
                      Enter 6-Digit TOTP Passcode
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      className="border-emerald-500/40 bg-slate-950/80 text-slate-100 text-center tracking-[0.3em] font-mono text-xl focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
                      value={totp}
                      onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="success"
                    className="w-full text-sm font-semibold"
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? "Establishing Secure Session..." : "Establish Operational Clearance"}
                    <CheckCircle2 className="ml-1.5 h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-slate-400 hover:text-slate-200"
                    onClick={() => setStep("login")}
                  >
                    ← Back to Credentials
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* SECURITY ADVISORY FOOTER */}
          <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3 text-slate-600" />
            <span>Official Law Enforcement Platform • Unauthorized access strictly prohibited</span>
          </div>
        </div>
      </main>

      {/* BOTTOM FOOTER */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-950/60 px-4 py-2 text-center text-xs text-slate-500">
        Kraken CNA System v2.4 • Smart India Hackathon Problem #189 • Ministry of Home Affairs / LEA Division
      </footer>
    </div>
  );
}
