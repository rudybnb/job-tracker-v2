import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";

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
                <p className="text-sm text-muted-foreground">
                  Type: {contractor.type}
                </p>
                {contractor.dailyRate && (
                  <p className="text-sm text-muted-foreground">
                    Daily Rate: £{(contractor.dailyRate / 100).toFixed(2)}
                  </p>
                )}
                {contractor.primaryTrade && (
                  <p className="text-sm text-muted-foreground">
                    Trade: {contractor.primaryTrade}
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
