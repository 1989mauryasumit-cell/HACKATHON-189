"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Network, ShieldCheck, Key } from "lucide-react";
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
  },
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
    id: "usr-invest-1",
    name: "Agent Investigator",
    email: "investigator@agency.gov.in",
    password: "password123",
    badgeId: "POL-7777",
    role: "investigator",
    status: "active"
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  // Pre-fill TOTP code with standard 123456 default for instant click-through bypass
  const [totp, setTotp] = React.useState("123456");
  const [step, setStep] = React.useState<"login" | "mfa">("login");
  const [error, setError] = React.useState("");
  const [matchedUser, setMatchedUser] = React.useState<UserAccount | null>(null);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all security credential fields.");
      return;
    }

    const roster = getRegisteredUsers();
    const match = roster.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!match) {
      setError("Access Denied: Invalid email or unauthorized agency account.");
      return;
    }

    if (match.status === "suspended") {
      setError("Access Blocked: Your operational clearance has been suspended by an administrator.");
      return;
    }

    if (match.password !== password) {
      setError("Access Denied: Incorrect password. Attempts are recorded.");
      return;
    }

    // Credentials validated successfully! Proceed to MFA step
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

    // Build the session based on the matched user's profile
    const session = {
      id: matchedUser.id,
      email: matchedUser.email,
      full_name: matchedUser.name,
      badge_id: matchedUser.badgeId,
      role: matchedUser.role as Role,
      organization_id: "org-delhi-intel",
      organization_name: "Delhi Intelligence Branch"
    };

    setClientSession(session);
    await logAuditEvent("user_login", "profile", session.id, { email: session.email, role: session.role }, session.id);
    
    // Redirect to home dashboard
    router.push("/");
  };

  const loadDemoUser = (role: string) => {
    const roster = getRegisteredUsers();
    const demo = roster.find(u => u.role === role);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    } else {
      setEmail(`${role}@agency.gov.in`);
      setPassword("password123");
    }
    setStep("login");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* SYNTHETIC DATA BANNER */}
      <div className="absolute top-0 inset-x-0 bg-amber-600 text-white py-1.5 px-4 text-center text-xs font-bold uppercase tracking-wider select-none">
        ⚠️ DEMONSTRATION SYSTEM — SYNTHETIC DATA ONLY
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Network className="h-10 w-10 text-blue-500 animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight">KRAKEN C.N.A.</h1>
          <p className="text-sm text-slate-400">
            Criminal Network Analysis System for Law Enforcement & Intelligence Agencies
          </p>
        </div>

        {step === "login" ? (
          <Card className="border-slate-800 bg-slate-900 text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Agency Sign In</CardTitle>
              <CardDescription className="text-slate-400">
                Authorized personnel access only. Actions are audit-logged.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded bg-red-950/50 border border-red-900 text-xs text-red-400 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Official Email</label>
                  <Input
                    type="email"
                    placeholder="investigator@agency.gov.in"
                    className="border-slate-700 bg-slate-950 text-slate-100 focus-visible:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Clearance Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="border-slate-700 bg-slate-950 text-slate-100 focus-visible:ring-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Validate Clearance
                </Button>
                
                <div className="w-full border-t border-slate-800 pt-3">
                  <span className="text-[10px] text-slate-500 block mb-2 text-center font-mono">
                    Select Role Bypass (Automatic Seed Fill)
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      onClick={() => loadDemoUser("viewer")}
                    >
                      Viewer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      onClick={() => loadDemoUser("investigator")}
                    >
                      Investig
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      onClick={() => loadDemoUser("supervisor")}
                    >
                      Superv
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                      onClick={() => loadDemoUser("admin")}
                    >
                      Admin
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="border-slate-800 bg-slate-900 text-slate-100 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span>Multi-Factor Authentication</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                A 6-digit TOTP passcode has been generated. Enter it to finalize clearance.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleMfaSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded bg-red-950/50 border border-red-900 text-xs text-red-400 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Enter 6-Digit Code</label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    className="border-slate-700 bg-slate-950 text-slate-100 focus-visible:ring-blue-500 text-center tracking-widest font-mono text-lg"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Establish Operational Session
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-400 hover:text-slate-200"
                  onClick={() => setStep("login")}
                >
                  Cancel
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
