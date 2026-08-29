import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionTimeoutWatcher } from "@/components/session-timeout-watcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kraken CNA — Criminal Network Analysis System",
  description: "AI-Powered Criminal Network Analysis System for Law Enforcement Agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme="dark" storageKey="cna-ui-theme">
          <SessionTimeoutWatcher />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
