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
  const { data: phaseCosts, isLoading: loadingCosts } = trpc.jobs.getPhaseCosts.useQuery({ jobId });

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

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

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
            {job.postCode && (
              <div>
                <span className="text-sm text-muted-foreground">Postcode</span>
                <p className="font-medium">{job.postCode}</p>
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
            <CardTitle>Total Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Labour Cost:</span>
              <span className="font-medium text-green-600">
                {formatCurrency(job.totalLabourCost || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Material Cost:</span>
              <span className="font-medium text-blue-600">
                {formatCurrency(job.totalMaterialCost || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-lg">
                {formatCurrency((job.totalLabourCost || 0) + (job.totalMaterialCost || 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Cost Breakdown</CardTitle>
          <CardDescription>
            Labour and material costs per phase for milestone payment tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCosts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : phaseCosts && phaseCosts.length > 0 ? (
            <div className="space-y-4">
              {phaseCosts.map((phase, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-lg mb-3">{phase.phaseName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Labour Cost</span>
                      <p className="text-lg font-medium text-green-600">
                        {formatCurrency(phase.labourCost)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Material Cost</span>
                      <p className="text-lg font-medium text-blue-600">
                        {formatCurrency(phase.materialCost)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Total Phase Cost</span>
                      <p className="text-lg font-bold">
                        {formatCurrency(phase.totalCost)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Summary */}
              <div className="border-t-2 pt-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Total Labour</span>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(phaseCosts.reduce((sum, p) => sum + p.labourCost, 0))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Total Material</span>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(phaseCosts.reduce((sum, p) => sum + p.materialCost, 0))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
                    <p className="text-xl font-bold">
                      {formatCurrency(phaseCosts.reduce((sum, p) => sum + p.totalCost, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No phase cost data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
