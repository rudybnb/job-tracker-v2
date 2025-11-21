import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface JobDetailProps {
  jobId: number;
}

export default function JobDetail({ jobId }: JobDetailProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const { data: job, isLoading } = trpc.jobs.getById.useQuery({ id: jobId });
  const { data: phaseCosts, isLoading: loadingCosts } = trpc.jobs.getPhaseCosts.useQuery({ jobId });

  const togglePhase = (phaseName: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseName)) {
        newSet.delete(phaseName);
      } else {
        newSet.add(phaseName);
      }
      return newSet;
    });
  };

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
            Labour and material costs per phase for milestone payment tracking. Click on Material Cost to see detailed materials list.
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
                <PhaseCard
                  key={index}
                  phase={phase}
                  jobId={jobId}
                  isExpanded={expandedPhases.has(phase.phaseName)}
                  onToggle={() => togglePhase(phase.phaseName)}
                  formatCurrency={formatCurrency}
                />
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

interface PhaseCardProps {
  phase: {
    phaseName: string;
    labourCost: number;
    materialCost: number;
    totalCost: number;
  };
  jobId: number;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (pence: number) => string;
}

function PhaseCard({ phase, jobId, isExpanded, onToggle, formatCurrency }: PhaseCardProps) {
  const { data: materials, isLoading: loadingMaterials } = trpc.jobs.getPhaseMaterials.useQuery(
    { jobId, phaseName: phase.phaseName },
    { enabled: isExpanded }
  );

  return (
    <div className="border rounded-lg hover:shadow-md transition-shadow">
      <div className="p-4">
        <h4 className="font-semibold text-lg mb-3">{phase.phaseName}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Labour Cost</span>
            <p className="text-lg font-medium text-green-600">
              {formatCurrency(phase.labourCost)}
            </p>
          </div>
          <Collapsible open={isExpanded} onOpenChange={onToggle}>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Material Cost</span>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  {formatCurrency(phase.materialCost)}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
          </Collapsible>
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Total Phase Cost</span>
            <p className="text-lg font-bold">
              {formatCurrency(phase.totalCost)}
            </p>
          </div>
        </div>

        {/* Expandable Materials List */}
        <Collapsible open={isExpanded}>
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t">
              <h5 className="font-medium text-sm text-muted-foreground mb-3">Materials Breakdown:</h5>
              {loadingMaterials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : materials && materials.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-2">Supplier</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Cost</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  {materials.map((material, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 text-sm py-2 hover:bg-muted/50 rounded px-2">
                      <div className="col-span-4 truncate" title={material.resourceDescription || material.resourceType || "N/A"}>
                        {material.resourceDescription || material.resourceType || "N/A"}
                      </div>
                      <div className="col-span-2 truncate text-blue-400" title={material.supplier || "N/A"}>
                        {material.supplier || "N/A"}
                      </div>
                      <div className="col-span-2 text-center">
                        {material.orderQuantity || 0}
                      </div>
                      <div className="col-span-2 text-right">
                        {material.orderQuantity && material.orderQuantity > 0 && material.cost
                          ? formatCurrency(Math.floor(material.cost / material.orderQuantity))
                          : "-"}
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        {formatCurrency(material.cost || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No materials found for this phase</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
