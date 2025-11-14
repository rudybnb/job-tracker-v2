import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BudgetTracking() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Tracking</h1>
        <p className="text-muted-foreground mt-2">Track job budgets and expenses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>Financial tracking for all jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Budget tracking interface coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
