import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { formatCost } from "@shared/labourCosts";

export default function Contractors() {
  const { data: contractors } = trpc.contractors.list.useQuery();
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contractors</h1>
        <p className="text-muted-foreground mt-2">Manage contractor assignments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contractors && contractors.length > 0 ? (
          contractors.map(contractor => (
            <Card
              key={contractor.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setLocation(`/contractors/${contractor.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{contractor.firstName} {contractor.lastName}</CardTitle>
                    <CardDescription>{contractor.email}</CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {contractor.primaryTrade && (
                  <p className="text-sm font-medium">
                    🔨 {contractor.primaryTrade}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {contractor.paymentType === "day_rate" ? "📅 Day Rate" : "💰 Price Work"}
                </p>
                {contractor.paymentType === "day_rate" && contractor.hourlyRate && (
                  <p className="text-sm text-muted-foreground">
                    {formatCost(contractor.hourlyRate)}/hr • {formatCost(contractor.hourlyRate * 8)}/day
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No contractors yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
