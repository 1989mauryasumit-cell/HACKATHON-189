import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding Guided Tour</h1>
        <p className="text-muted-foreground">Interactive walkthrough of Kraken's features for new investigators.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview & Controls</CardTitle>
          <CardDescription>Visual summary of the Onboarding Guided Tour interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64 rounded-lg border border-dashed flex flex-col items-center justify-center bg-muted/10">
            <p className="text-sm text-muted-foreground">Detailed UI widgets will be implemented here in later phases.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
