import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function Contractors() {
  const { data: contractors } = trpc.contractors.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contractors</h1>
        <p className="text-muted-foreground mt-2">Manage contractor assignments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contractors && contractors.length > 0 ? (
          contractors.map(contractor => (
            <Card key={contractor.id}>
              <CardHeader>
                <CardTitle>{contractor.name || "Unnamed"}</CardTitle>
                <CardDescription>{contractor.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Role: {contractor.role}
                </p>
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
