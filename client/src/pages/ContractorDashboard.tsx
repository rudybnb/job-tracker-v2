import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, Briefcase, Clock, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ContractorDashboard() {
  const [, setLocation] = useLocation();
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Check localStorage for authentication
  useEffect(() => {
    const token = localStorage.getItem('contractor_token');
    const id = localStorage.getItem('contractor_id');
    
    if (token && id) {
      setContractorId(id);
      setAuthChecked(true);
    } else {
      setAuthChecked(true);
      setLocation("/contractor-login");
    }
  }, [setLocation]);
  
  const { data: contractor, isLoading } = trpc.mobileApi.me.useQuery(
    undefined,
    {
      enabled: authChecked && !!contractorId,
    }
  );
  const { data: assignments, isLoading: assignmentsLoading } = trpc.mobileApi.getMyAssignments.useQuery(
    undefined,
    {
      enabled: !!contractor, // Only fetch if contractor is logged in
    }
  );
  
  const logoutMutation = trpc.mobileApi.logout.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      setLocation("/contractor-login");
    },
  });

  // Authentication is now handled by localStorage check in the first useEffect

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  if (!contractor) {
    return null;
  }

  const activeAssignmentsCount = assignments?.length || 0;

  return (
    <div className="min-h-screen bg-[#1a2332]">
      {/* Header */}
      <div className="bg-[#2a3847] border-b border-gray-700">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, {contractor.firstName}!
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {contractor.type === "contractor" ? "Contractor" : "Subcontractor"} • {contractor.primaryTrade}
            </p>
          </div>
          <Button
            onClick={() => logoutMutation.mutate()}
            variant="outline"
            className="bg-transparent border-gray-600 text-white hover:bg-[#1a2332]"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Quick stats */}
          <Card className="bg-[#2a3847] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#F59E0B]" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{activeAssignmentsCount}</p>
              <p className="text-gray-400 text-sm mt-1">
                {activeAssignmentsCount === 0 ? "No active assignments" : `${activeAssignmentsCount} assignment${activeAssignmentsCount > 1 ? "s" : ""}`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#2a3847] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#F59E0B]" />
                Hours This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-gray-400 text-sm mt-1">No time logged yet</p>
            </CardContent>
          </Card>

          <Card className="bg-[#2a3847] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#F59E0B]" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-white">Not on site</p>
              <p className="text-gray-400 text-sm mt-1">Clock in to track location</p>
            </CardContent>
          </Card>
        </div>

        {/* My Assignments */}
        <Card className="bg-[#2a3847] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">My Assignments</CardTitle>
            <CardDescription className="text-gray-400">
              View your assigned jobs and phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
              </div>
            ) : assignments && assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="bg-[#1a2332] border border-gray-700 rounded-lg p-4 hover:border-[#F59E0B] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {assignment.jobTitle}
                        </h3>
                        <p className="text-gray-400 text-sm">{assignment.jobAddress}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{assignment.jobPostcode}</span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-400 mb-2">Assigned Phases:</p>
                      <div className="flex flex-wrap gap-2">
                        {assignment.phases.map((phase: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-blue-500/10 text-blue-400 border-blue-500/30"
                          >
                            {phase}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {assignment.specialInstructions && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-sm text-gray-400 mb-1">Special Instructions:</p>
                        <p className="text-sm text-gray-300">{assignment.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No assignments yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Your assigned jobs will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clock In/Out Section - Coming Soon */}
        <Card className="bg-[#2a3847] border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Time Tracking</CardTitle>
            <CardDescription className="text-gray-400">
              Clock in/out feature coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Clock in/out functionality will be available soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
