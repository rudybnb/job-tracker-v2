import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const utils = trpc.useUtils();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    } else {
      toast.error("Please select a valid CSV file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const content = await file.text();
      await uploadMutation.mutateAsync({
        filename: file.name,
        content,
      });
    } catch (error) {
      // Error handled by mutation
    } finally {
      setUploading(false);
    }
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

            {file && (
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
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
                      <span
                        className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                          upload.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : upload.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {upload.status}
                      </span>
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
