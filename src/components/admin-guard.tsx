"use client";

import * as React from "react";
import { getClientSession, logAuditEvent } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const session = getClientSession();
    const isAdmin = session?.role === "admin";
    
    if (session && !isAdmin) {
      // Log permission denial event to database
      logAuditEvent("permission_denied", "route_access", session.id, {
        role: session.role,
        requested_path: window.location.pathname
      }, session.id);
    }
    
    setIsAuthorized(isAdmin);
  }, []);

  if (isAuthorized === null) {
    return null; // Loading state handled by layout
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 min-h-[60vh]">
        <Card className="max-w-md border-destructive/30 bg-destructive/5 text-center">
          <CardHeader className="flex flex-col items-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-2">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl text-destructive font-bold">Access Denied</CardTitle>
            <CardDescription className="text-destructive/80 font-mono text-xs mt-1">
              ALERT: UNAUTHORIZED ACCESS ATTEMPT DETECTED
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You do not have the required administrative permissions to access this control panel.
            </p>
            <div className="p-3 bg-card border rounded text-[11px] font-mono text-left text-muted-foreground">
              - Security Audit Code: ERR_403_FORBIDDEN<br />
              - Action: Access block triggered<br />
              - Logging: Attempt recorded immutably
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
