import { NavigationShell } from "@/components/navigation-shell";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NavigationShell>{children}</NavigationShell>;
}
