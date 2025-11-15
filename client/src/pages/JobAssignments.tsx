import { useState } from "react";
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

  const handleCreateAssignment = () => {
    if (!selectedContractor) {
      toast.error("Please select a contractor");
      return;
    }
    if (!selectedJobId) {
      toast.error("Please select a job");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    createAssignment.mutate({
      jobId: selectedJobId,
      contractorIds: [selectedContractor],
      workLocation: postcode,
      selectedPhases: selectedPhases,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      specialInstructions,
    });
  };



  if (jobsLoading || contractorsLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-yellow">Job Assignments</h1>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-info hover:bg-info/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="text-yellow">Create New Job Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Select Contractor */}
              <div>
                <Label htmlFor="contractor" className="text-yellow">
                  Select Contractor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedContractor?.toString() || ""}
                  onValueChange={(value) => setSelectedContractor(parseInt(value))}
                >
                  <SelectTrigger className="bg-card border-input">
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors && contractors.length > 0 ? (
                      contractors.map((contractor) => (
                        <SelectItem key={contractor.id} value={contractor.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{contractor.firstName} {contractor.lastName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              contractor.type === 'contractor' 
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {contractor.type === 'contractor' ? 'Contractor' : 'Subcontractor'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-contractors" disabled>
                        No contractors available
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
                          className="w-4 h-4 rounded border-input"
                        />
                        <span className="text-sm text-foreground">{phase.phaseName}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {selectedPhases.length} of {phases.length} phases from {jobs?.find(j => j.id === selectedJobId)?.title}
                  </p>
                </div>
              )}

              {/* Start Date */}
              <div>
                <Label htmlFor="startDate" className="text-yellow">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-card border-input"
                />
              </div>

              {/* End Date */}
              <div>
                <Label htmlFor="endDate" className="text-yellow">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-card border-input"
                />
              </div>

              {/* Special Instructions */}
              <div>
                <Label htmlFor="instructions" className="text-yellow">
                  Special Instructions
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="Any special instructions for the contractor..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="bg-card border-input min-h-[120px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={createAssignment.isPending}
                  className="flex-1 bg-green hover:bg-green/90"
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
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-yellow">Active Assignments</h2>
          {assignments && assignments.length > 0 ? (
            <div className="grid gap-4">
              {assignments.map((assignment: any) => (
                <Card key={assignment.id} className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-yellow font-medium">Job</p>
                        <p className="text-foreground">Job #{assignment.jobId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-yellow font-medium">Contractor</p>
                        <p className="text-foreground">Contractor #{assignment.contractorId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-yellow font-medium">Dates</p>
                        <p className="text-foreground text-sm">
                          {new Date(assignment.startDate).toLocaleDateString()} -{" "}
                          {new Date(assignment.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {assignment.specialInstructions && (
                      <div className="mt-4">
                        <p className="text-sm text-yellow font-medium">Instructions</p>
                        <p className="text-muted-foreground text-sm">{assignment.specialInstructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
