import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut, Briefcase, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function ContractorDashboard() {
  const [, setLocation] = useLocation();
  
  const { data: contractor, isLoading } = trpc.contractorAuth.me.useQuery();
  
  const logoutMutation = trpc.contractorAuth.logout.useMutation({
    onSuccess: () => {
      toast.success("Logged out successfully");
      setLocation("/contractor-login");
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !contractor) {
      setLocation("/contractor-login");
    }
  }, [contractor, isLoading, setLocation]);

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
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-gray-400 text-sm mt-1">No active assignments</p>
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
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No assignments yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Your assigned jobs will appear here
              </p>
            </div>
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
