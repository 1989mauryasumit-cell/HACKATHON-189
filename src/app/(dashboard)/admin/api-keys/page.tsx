import * as React from "react";
import { AdminGuard } from "@/components/admin-guard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <AdminGuard>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Developer Keys & APIs</h1>
        <p className="text-muted-foreground">Generate scoped tokens and read documents for third-party police software integrations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview & Controls</CardTitle>
          <CardDescription>Visual summary of the Developer Keys & APIs interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64 rounded-lg border border-dashed flex flex-col items-center justify-center bg-muted/10">
            <p className="text-sm text-muted-foreground">Detailed UI widgets will be implemented here in later phases.</p>
          </div>
        </CardContent>
      </Card>
      </div>
    </AdminGuard>
  );
}

