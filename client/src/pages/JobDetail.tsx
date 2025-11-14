import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface JobDetailProps {
  jobId: number;
}

export default function JobDetail({ jobId }: JobDetailProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: job, isLoading } = trpc.jobs.getById.useQuery({ id: jobId });
  const { data: phases } = trpc.phases.listByJob.useQuery({ jobId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Job not found</p>
        <Button className="mt-4" onClick={() => setLocation("/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/jobs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{job.title}</h1>
          <p className="text-muted-foreground mt-1">{job.address}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p className="font-medium capitalize">{job.status.replace("_", " ")}</p>
            </div>
            {job.projectType && (
              <div>
                <span className="text-sm text-muted-foreground">Project Type</span>
                <p className="font-medium">{job.projectType}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">Created</span>
              <p className="font-medium">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Build Phases</CardTitle>
            <CardDescription>{phases?.length || 0} phases</CardDescription>
          </CardHeader>
          <CardContent>
            {phases && phases.length > 0 ? (
              <div className="space-y-3">
                {phases.map(phase => (
                  <div key={phase.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{phase.phaseName}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          phase.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : phase.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {phase.status.replace("_", " ")}
                      </span>
                    </div>
                    {phase.tasks && (
                      <p className="text-sm text-muted-foreground mt-2">{phase.tasks}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No phases yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
