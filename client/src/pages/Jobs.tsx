import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Jobs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: jobs, isLoading } = trpc.jobs.list.useQuery();
  const utils = trpc.useUtils();

  const deleteJob = trpc.jobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted successfully");
      utils.jobs.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete job: ${error.message}`);
    },
  });

  const handleDelete = async (e: React.MouseEvent, jobId: number, jobTitle: string) => {
    e.stopPropagation(); // Prevent card click
    if (confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) {
      await deleteJob.mutateAsync({ jobId });
    }
  };

  const isAdmin = user?.role === "admin";

  const filteredJobs = jobs?.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.projectType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground mt-2">
            {isAdmin ? "Manage all construction jobs" : "Your assigned jobs"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setLocation("/upload")}>
            <Plus className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs by title, address, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs && filteredJobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map(job => (
            <Card
              key={job.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation(`/jobs/${job.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="truncate flex-1">{job.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : job.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : job.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        onClick={(e) => handleDelete(e, job.id, job.title)}
                        disabled={deleteJob.isPending}
                        title="Delete job"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription className="truncate">{job.address || "No address"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {job.projectType && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium">{job.projectType}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No jobs match your search" : "No jobs yet"}
            </p>
            {isAdmin && !searchQuery && (
              <Button className="mt-4" onClick={() => setLocation("/upload")}>
                Upload CSV to create jobs
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
