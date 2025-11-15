import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

export default function JobAssignments() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<number | null>(null);
  const [postcode, setPostcode] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery();
  const { data: contractors, isLoading: contractorsLoading } = trpc.contractors.list.useQuery();
  const { data: assignments, isLoading: assignmentsLoading } = trpc.jobAssignments.list.useQuery();
  
  // Load phases when job is selected
  const { data: phases, isLoading: phasesLoading } = trpc.phases.listByJob.useQuery(
    { jobId: selectedJobId! },
    { enabled: !!selectedJobId }
  );

  const createAssignment = trpc.jobAssignments.create.useMutation({
    onSuccess: () => {
      toast.success("Assignment created successfully");
      setShowCreateForm(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  const resetForm = () => {
    setSelectedContractor(null);
    setPostcode("");
    setSelectedJobId(null);
    setSelectedPhases([]);
    setStartDate("");
    setEndDate("");
    setSpecialInstructions("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContractor || !selectedJobId || !postcode || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    createAssignment.mutate({
      jobId: selectedJobId,
      contractorIds: [selectedContractor],
      workLocation: postcode,
      selectedPhases: selectedPhases.length > 0 ? selectedPhases : undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      specialInstructions: specialInstructions || undefined,
    });
  };

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Fetch labour days for selected phases to suggest dates
  const { data: suggestedDates, refetch: refetchSuggestedDates } = trpc.jobAssignments.getTimeValidation.useQuery(
    {
      jobId: selectedJobId!,
      selectedPhases: selectedPhases,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date()
    },
    { enabled: false } // Don't auto-fetch, only fetch when button is clicked
  );

  const handleSuggestDates = async () => {
    if (!selectedJobId || selectedPhases.length === 0) {
      toast.error("Please select a job and at least one phase first");
      return;
    }

    if (!startDate) {
      toast.error("Please select a start date first");
      return;
    }

    // Fetch the labour days required
    const result = await refetchSuggestedDates();
    
    if (result.data) {
      const requiredDays = result.data.requiredDays;
      
      if (requiredDays === 0) {
        toast.info("No labour time data available for selected phases");
        return;
      }

      // Calculate suggested end date
      const start = new Date(startDate);
      const suggestedEnd = new Date(start);
      suggestedEnd.setDate(suggestedEnd.getDate() + requiredDays - 1); // -1 because start date counts as day 1

      // Format date for input (YYYY-MM-DD)
      const formattedEndDate = suggestedEnd.toISOString().split('T')[0];
      setEndDate(formattedEndDate);

      toast.success(`Suggested end date set to ${suggestedEnd.toLocaleDateString()} (${requiredDays} days required)`);
    }
  };

  // Filter contractors to show only approved ones
  const approvedContractors = contractors?.filter(c => c.status === 'approved') || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow">Job Assignments</h1>
            <p className="text-muted-foreground mt-1">Assign contractors to jobs and phases</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-yellow text-black hover:bg-yellow/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-yellow">New Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Contractor Selection */}
                <div>
                  <Label htmlFor="contractor" className="text-yellow">
                    Select contractor <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedContractor?.toString() || ""}
                    onValueChange={(value) => setSelectedContractor(parseInt(value))}
                  >
                    <SelectTrigger className="bg-card border-input">
                      <SelectValue placeholder="Select contractor">
                        {selectedContractor && approvedContractors.length > 0 ? (
                          (() => {
                            const contractor = approvedContractors.find(c => c.id === selectedContractor);
                            return contractor ? `${contractor.firstName} ${contractor.lastName} - ${contractor.type}` : "Select contractor";
                          })()
                        ) : (
                          "Select contractor"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {approvedContractors.length > 0 ? (
                        approvedContractors.map((contractor) => (
                          <SelectItem key={contractor.id} value={contractor.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>{contractor.firstName} {contractor.lastName}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                {contractor.type}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-contractors" disabled>
                          No approved contractors available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Work Location */}
                <div>
                  <Label htmlFor="postcode" className="text-yellow">
                    Work Location (Postcode) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="postcode"
                    placeholder="Enter postcode"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="bg-card border-input"
                  />
                </div>

                {/* HBXL Job */}
                <div>
                  <Label htmlFor="job" className="text-yellow">
                    HBXL Job <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedJobId?.toString() || ""}
                    onValueChange={(value) => {
                      const jobId = parseInt(value);
                      setSelectedJobId(jobId);
                      // Auto-fill postcode from selected job
                      const selectedJob = jobs?.find(j => j.id === jobId);
                      if (selectedJob?.postCode) {
                        setPostcode(selectedJob.postCode);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-card border-input">
                      <SelectValue placeholder="Select HBXL job">
                        {selectedJobId && jobs && phases ? (
                          `${jobs.find(j => j.id === selectedJobId)?.title} (${phases.length} phases)`
                        ) : selectedJobId && jobs ? (
                          jobs.find(j => j.id === selectedJobId)?.title
                        ) : (
                          "Select HBXL job"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {jobs && jobs.length > 0 ? (
                        jobs.map((job) => {
                          // We'll show phase count in the dropdown once phases are loaded
                          return (
                            <SelectItem key={job.id} value={job.id.toString()}>
                              {job.title}
                            </SelectItem>
                          );
                        })
                      ) : (
                        <SelectItem value="no-jobs" disabled>
                          No jobs available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {jobs && jobs.length > 0 && (
                    <p className="text-sm text-green-500 mt-1">
                      ✓ {jobs.length} job(s) loaded from CSV uploads
                    </p>
                  )}
                </div>

                {/* Build Phases */}
                {selectedJobId && phases && phases.length > 0 && (
                  <div>
                    <Label className="text-yellow mb-2 block">Build Phases</Label>
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPhases(phases.map((p) => p.phaseName))}
                        className="text-yellow border-yellow hover:bg-yellow/10"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPhases([])}
                        className="text-yellow border-yellow hover:bg-yellow/10"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {phases.map((phase) => (
                        <label
                          key={phase.id}
                          className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-card/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPhases.includes(phase.phaseName)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPhases([...selectedPhases, phase.phaseName]);
                              } else {
                                setSelectedPhases(selectedPhases.filter((p) => p !== phase.phaseName));
                              }
                            }}
                            className="rounded border-yellow text-yellow focus:ring-yellow"
                          />
                          <span className="text-sm text-foreground">{phase.phaseName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate" className="text-yellow">
                        Start Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-card border-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-yellow">
                        End Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-card border-input"
                      />
                    </div>
                  </div>
                  {/* Suggest Dates Button */}
                  {selectedJobId && selectedPhases.length > 0 && startDate && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSuggestDates}
                        className="text-green-600 border-green-600 hover:bg-green-600/10"
                      >
                        ✨ Suggest End Date
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically calculate minimum end date based on labour requirements
                      </p>
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                <div>
                  <Label htmlFor="instructions" className="text-yellow">
                    Special Instructions
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="Enter any special instructions..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="bg-card border-input min-h-[100px]"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createAssignment.isPending}
                    className="flex-1 bg-yellow text-black hover:bg-yellow/90"
                  >
                    {createAssignment.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Assignment"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-yellow">Active Assignments</h2>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : assignments && assignments.length > 0 ? (
            <div className="grid gap-4">
              {assignments.map((assignment: any) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  jobs={jobs}
                  contractors={contractors}
                  assignments={assignments}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No assignments created yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface AssignmentCardProps {
  assignment: any;
  jobs: any[] | undefined;
  contractors: any[] | undefined;
  assignments: any[] | undefined;
  formatCurrency: (pence: number) => string;
}

function AssignmentCard({ assignment, jobs, contractors, assignments, formatCurrency }: AssignmentCardProps) {
  const job = jobs?.find(j => j.id === assignment.jobId);
  const contractor = contractors?.find(c => c.id === assignment.contractorId);
  
  // Parse selected phases
  const selectedPhases = assignment.selectedPhases 
    ? JSON.parse(assignment.selectedPhases) 
    : [];

  // Fetch costs for this assignment's phases
  const { data: costs, isLoading: costsLoading } = trpc.jobAssignments.getAssignmentCosts.useQuery(
    { 
      jobId: assignment.jobId, 
      selectedPhases: selectedPhases 
    },
    { enabled: selectedPhases.length > 0 }
  );

  // Calculate contractor count for this job/phase combination
  // Count how many contractors are assigned to overlapping phases
  const contractorCount = useMemo(() => {
    if (!assignments || selectedPhases.length === 0) return 1;
    
    // Find all assignments for the same job with overlapping phases
    const overlappingAssignments = (assignments as any[]).filter(a => {
      if (a.jobId !== assignment.jobId) return false;
      const otherPhases = a.selectedPhases ? JSON.parse(a.selectedPhases) : [];
      return selectedPhases.some((p: string) => otherPhases.includes(p));
    });
    
    return overlappingAssignments.length || 1;
  }, [assignments, assignment.jobId, selectedPhases]);

  // Fetch time validation for this assignment
  const { data: timeValidation, isLoading: timeValidationLoading } = trpc.jobAssignments.getTimeValidation.useQuery(
    {
      jobId: assignment.jobId,
      selectedPhases: selectedPhases,
      startDate: new Date(assignment.startDate),
      endDate: new Date(assignment.endDate),
      contractorCount: contractorCount
    },
    { enabled: selectedPhases.length > 0 }
  );

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-yellow font-medium">Job</p>
            <p className="text-foreground">
              {job ? `${job.title} (#${assignment.jobId})` : `Job #${assignment.jobId}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-yellow font-medium">Contractor</p>
            <p className="text-foreground">
              {contractor 
                ? `${contractor.firstName} ${contractor.lastName}` 
                : `Contractor #${assignment.contractorId}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-yellow font-medium">Dates</p>
            <p className="text-foreground text-sm">
              {new Date(assignment.startDate).toLocaleDateString()} -{" "}
              {new Date(assignment.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-yellow font-medium">Phases</p>
            <p className="text-foreground text-sm">
              {selectedPhases.length > 0 
                ? `${selectedPhases.length} phase(s)` 
                : "All phases"}
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        {selectedPhases.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            {costsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading costs...
              </div>
            ) : costs ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Labour Cost</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(costs.labourCost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Material Cost</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(costs.materialCost)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(costs.totalCost)}
                  </p>
                </div>
              </div>
            ) : null}
            
            {/* Time Validation */}
            {timeValidation && (
              <div className="mt-3">
                <div className={
                  `p-3 rounded-lg ${
                    timeValidation.status === 'ok' 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : timeValidation.status === 'warning'
                      ? 'bg-yellow-500/10 border border-yellow-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`
                }>
                  <p className={
                    `text-sm font-medium ${
                      timeValidation.status === 'ok' 
                        ? 'text-green-600' 
                        : timeValidation.status === 'warning'
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`
                  }>
                    {timeValidation.message}
                  </p>
                </div>
              </div>
            )}

            {/* Show phase names */}
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Assigned Phases:</p>
              <div className="flex flex-wrap gap-2">
                {selectedPhases.map((phase: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded bg-yellow/20 text-yellow"
                  >
                    {phase}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {assignment.specialInstructions && (
          <div className="mt-4">
            <p className="text-sm text-yellow font-medium">Instructions</p>
            <p className="text-muted-foreground text-sm">{assignment.specialInstructions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
