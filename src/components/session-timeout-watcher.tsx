"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const WARNING_TIMEOUT = 25 * 60 * 1000; // 25 minutes
const LOGOUT_TIMEOUT = 30 * 60 * 1000;  // 30 minutes

export function SessionTimeoutWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(300); // 5 minutes count down

  const lastActivityRef = React.useRef<number>(Date.now());
  const warningTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetTimers = React.useCallback(() => {
    // If we're on login, don't run timeout logic
    if (pathname === "/login") {
      setShowWarning(false);
      return;
    }

    lastActivityRef.current = Date.now();
    setShowWarning(false);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    // Warning timer set for 25 minutes
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeLeft(300); // 5 minutes (300 seconds) left
      
      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    }, WARNING_TIMEOUT);

    // Logout timer set for 30 minutes
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, LOGOUT_TIMEOUT);

  }, [pathname]);

  const handleLogout = React.useCallback(() => {
    setShowWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    // Add logout message to session storage to show audit notice
    sessionStorage.setItem("session_timeout_logout", "true");
    router.push("/login");
  }, [router]);

  // Track actions to reset timer
  React.useEffect(() => {
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const handleActivity = () => {
      // Reset only if we're not currently showing the warning modal
      if (!showWarning) {
        resetTimers();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    resetTimers();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [resetTimers, showWarning]);

  // Format time remaining for warning
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg animate-in fade-in-50 zoom-in-95">
        <h3 className="text-lg font-bold text-foreground">Session Timeout Warning</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You have been inactive for 25 minutes. For security and audit compliance, you will be automatically logged out in:
        </p>
        <div className="my-6 text-center text-3xl font-mono font-bold tracking-wider text-destructive">
          {formatTime(timeLeft)}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={handleLogout}>
            Logout Now
          </Button>
          <Button variant="default" onClick={resetTimers}>
            Keep Working
          </Button>
        </div>
      </div>
    </div>
  );
}
