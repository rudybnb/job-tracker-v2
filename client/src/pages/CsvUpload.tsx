import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DetectedJob {
  name: string;
  address: string;
  postCode: string;
  projectType: string;
  phases: string[];
  totalLabourCost: number;
  totalMaterialCost: number;
  resourceCount: number;
}

export default function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedJobs, setDetectedJobs] = useState<DetectedJob[] | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [filename, setFilename] = useState<string>('');

  const utils = trpc.useUtils();
  
  const detectMutation = trpc.csv.detectJobs.useMutation({
    onSuccess: (data) => {
      setDetectedJobs(data.jobs);
      setDetecting(false);
      toast.success(`Detected ${data.totalJobs} job(s) from CSV`);
    },
    onError: (error) => {
      setDetecting(false);
      toast.error(`Detection failed: ${error.message}`);
    },
  });

  const uploadMutation = trpc.csv.upload.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully created ${data.jobsCreated} jobs!`);
      setFile(null);
      utils.jobs.list.invalidate();
      utils.csv.recentUploads.invalidate();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const { data: recentUploads } = trpc.csv.recentUploads.useQuery();

  const deleteMutation = trpc.csv.deleteUpload.useMutation({
    onSuccess: () => {
      toast.success("Upload deleted successfully");
      utils.csv.recentUploads.invalidate();
      utils.jobs.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleDelete = async (uploadId: number) => {
    if (confirm("Are you sure? This will remove the upload record.")) {
      await deleteMutation.mutateAsync({ uploadId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file extension instead of MIME type (more reliable across browsers)
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        // Reset states when new file is selected
        setDetectedJobs(null);
        setCsvContent('');
        setFilename('');
        setFile(selectedFile);
        console.log('File selected:', selectedFile.name);
      } else {
        toast.error("Please select a valid CSV file");
      }
    }
  };

  const handleDetect = async () => {
    if (!file) return;

    setDetecting(true);
    try {
      const content = await file.text();
      setCsvContent(content);
      setFilename(file.name);
      await detectMutation.mutateAsync({ content });
    } catch (error) {
      // Error handled by mutation
      setDetecting(false);
    }
  };

  const handleApprove = async () => {
    if (!csvContent || !filename) return;

    setUploading(true);
    try {
      await uploadMutation.mutateAsync({
        filename,
        content: csvContent,
      });
      // Reset state
      setDetectedJobs(null);
      setCsvContent('');
      setFilename('');
      setFile(null);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setDetectedJobs(null);
    setCsvContent('');
    setFilename('');
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload CSV</h1>
        <p className="text-muted-foreground mt-2">
          Import jobs from CSV files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              CSV format: Name, Address, Project Type, Phase columns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {file ? (
                <div className="space-y-4">
                  <FileText className="h-12 w-12 mx-auto text-blue-500" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-700 font-medium">
                        Click to upload
                      </span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">CSV files only</p>
                </div>
              )}
            </div>

            {file && !detectedJobs && (
              <Button
                className="w-full bg-yellow"
                onClick={handleDetect}
                disabled={detecting}
              >
                {detecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting Jobs...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload and Process
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        {detectedJobs && detectedJobs.length > 0 && (
          <Card className="border-2 border-yellow">
            <CardHeader className="bg-yellow/10">
              <CardTitle className="text-yellow">Upload & Detect Job Info</CardTitle>
              <CardDescription>Review detected jobs before creating them</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-4">Detected Job Information ({detectedJobs.length} {detectedJobs.length === 1 ? 'job' : 'jobs'})</h3>
                  
                  <div className="space-y-4">
                    {detectedJobs.map((job, index) => (
                      <div key={index} className="p-4 bg-background border rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-sm text-muted-foreground">📋 Name:</span>
                            <p className="font-medium">{job.name}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">📍 Postcode:</span>
                            <p className="font-medium">{job.postCode || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">🏗️ Project Type:</span>
                            <p className="font-medium">{job.projectType || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">📍 Address:</span>
                            <p className="font-medium">{job.address || 'N/A'}</p>
                          </div>
                        </div>

                        {job.phases.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Extracted HBXL Work Phases ({job.phases.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {job.phases.map((phase, phaseIndex) => (
                                <span key={phaseIndex} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                  {phase}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                          <div>
                            <span className="text-sm text-muted-foreground">💼 Labour Cost:</span>
                            <p className="font-medium text-green-500">£{(job.totalLabourCost / 100).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">🔧 Material Cost:</span>
                            <p className="font-medium text-blue-500">£{(job.totalMaterialCost / 100).toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">💰 Total Cost:</span>
                            <p className="font-bold">£{((job.totalLabourCost + job.totalMaterialCost) / 100).toFixed(2)}</p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">{job.resourceCount} resource line(s)</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleApprove}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Jobs...
                      </>
                    ) : (
                      <>
                        ✓ Approve & Create Jobs
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  These real work phases will be available for time tracking once the job is approved and goes live.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
            <CardDescription>Your upload history</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUploads && recentUploads.length > 0 ? (
              <div className="space-y-3">
                {recentUploads.map(upload => (
                  <div key={upload.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{upload.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {upload.jobsCreated} jobs created
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            upload.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : upload.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {upload.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                          onClick={() => handleDelete(upload.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete upload"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(upload.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No uploads yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
