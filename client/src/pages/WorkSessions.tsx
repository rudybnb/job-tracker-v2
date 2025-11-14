import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function WorkSessions() {
  const { data: sessions } = trpc.workSessions.myHistory.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Work Sessions</h1>
        <p className="text-muted-foreground mt-2">Track your work time</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>Your recent work sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} className="p-3 border rounded-lg">
                  <p className="font-medium">Job ID: {session.jobId}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.startTime).toLocaleString()}
                    {session.endTime && ` - ${new Date(session.endTime).toLocaleString()}`}
                  </p>
                  {session.notes && (
                    <p className="text-sm mt-2">{session.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No work sessions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
