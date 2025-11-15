import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ContractorTasks() {
  const [, setLocation] = useLocation();
  const [contractor, setContractor] = useState<any>(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("contractor_token");
    const contractorData = localStorage.getItem("contractor_data");
    
    if (!token || !contractorData) {
      setLocation("/contractor-login");
      return;
    }
    
    setContractor(JSON.parse(contractorData));
  }, [setLocation]);

  // Fetch contractor's assignments
  const { data: assignments, isLoading: loadingAssignments } = trpc.mobileApi.getMyAssignments.useQuery();
  
  // Fetch task completions
  const { data: completions, refetch: refetchCompletions } = trpc.mobileApi.getTaskCompletions.useQuery();

  const markTaskComplete = trpc.mobileApi.markTaskComplete.useMutation({
    onSuccess: () => {
      toast.success("Task marked as complete!");
      refetchCompletions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark task complete");
    },
  });

  if (!contractor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (loadingAssignments) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
        <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  const handleTaskToggle = (assignmentId: number, phaseName: string, taskName: string, isCompleted: boolean) => {
    if (isCompleted) {
      toast.info("Task already completed");
      return;
    }

    markTaskComplete.mutate({
      assignmentId,
      phaseName,
      taskName,
      notes: "",
    });
  };

  const isTaskCompleted = (assignmentId: number, phaseName: string, taskName: string) => {
    if (!completions) return false;
    return completions.some(
      (c: any) => 
        c.assignmentId === assignmentId && 
        c.phaseName === phaseName && 
        c.taskName === taskName
    );
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <div className="bg-[#1a2332] border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/contractor-dashboard")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">My Tasks</h1>
              <p className="text-sm text-gray-400">Track and complete your assigned tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!assignments || assignments.length === 0 ? (
          <Card className="bg-[#1a2332] border-gray-700">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">No active assignments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {assignments.map((assignment: any) => (
              <Card key={assignment.id} className="bg-[#1a2332] border-gray-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white">{assignment.jobName}</CardTitle>
                      <CardDescription className="text-gray-400">
                        {assignment.jobAddress}
                      </CardDescription>
                    </div>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                      {assignment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {assignment.selectedPhases && assignment.selectedPhases.length > 0 ? (
                      assignment.selectedPhases.map((phaseName: string) => (
                        <PhaseTaskList
                          key={phaseName}
                          assignmentId={assignment.id}
                          jobId={assignment.jobId}
                          phaseName={phaseName}
                          onTaskToggle={handleTaskToggle}
                          isTaskCompleted={isTaskCompleted}
                        />
                      ))
                    ) : (
                      <p className="text-gray-400 text-sm">No phases assigned</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PhaseTaskListProps {
  assignmentId: number;
  jobId: number;
  phaseName: string;
  onTaskToggle: (assignmentId: number, phaseName: string, taskName: string, isCompleted: boolean) => void;
  isTaskCompleted: (assignmentId: number, phaseName: string, taskName: string) => boolean;
}

function PhaseTaskList({ assignmentId, jobId, phaseName, onTaskToggle, isTaskCompleted }: PhaseTaskListProps) {
  const { data: phase, isLoading } = trpc.mobileApi.getPhaseWithTasks.useQuery({
    jobId,
    phaseName,
  });

  if (isLoading) {
    return (
      <div className="py-4">
        <h3 className="font-semibold text-lg mb-2 text-[#F59E0B]">{phaseName}</h3>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (!phase || !phase.tasks || phase.tasks.length === 0) {
    return (
      <div className="py-4">
        <h3 className="font-semibold text-lg mb-2 text-[#F59E0B]">{phaseName}</h3>
        <p className="text-sm text-gray-400">No tasks defined for this phase</p>
      </div>
    );
  }

  const completedCount = phase.tasks.filter((task: string) => 
    isTaskCompleted(assignmentId, phaseName, task)
  ).length;

  return (
    <div className="py-4 border-t border-gray-700 first:border-t-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-[#F59E0B]">{phaseName}</h3>
        <Badge variant="outline" className="text-gray-300">
          {completedCount}/{phase.tasks.length} complete
        </Badge>
      </div>
      
      <div className="space-y-3">
        {phase.tasks.map((task: string, index: number) => {
          const completed = isTaskCompleted(assignmentId, phaseName, task);
          
          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                completed
                  ? "bg-green-500/5 border-green-500/30"
                  : "bg-gray-800/30 border-gray-700 hover:border-[#F59E0B]/50"
              }`}
            >
              <Checkbox
                checked={completed}
                onCheckedChange={() => onTaskToggle(assignmentId, phaseName, task, completed)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className={`text-sm ${completed ? "line-through text-gray-500" : "text-gray-200"}`}>
                  {task}
                </p>
              </div>
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-600 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
