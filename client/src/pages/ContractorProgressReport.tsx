import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, X, Loader2, Camera, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ContractorProgressReport() {
  const [, setLocation] = useLocation();
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string; uploaded?: boolean; url?: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check authentication
  useEffect(() => {
    const contractorId = localStorage.getItem("contractor_id");
    if (!contractorId) {
      setLocation("/contractor-login-simple.html");
    }
  }, [setLocation]);

  // Fetch contractor assignments
  const { data: assignments, isLoading: loadingAssignments } = trpc.mobileApi.getMyAssignments.useQuery();

  // Fetch tasks for selected phase
  const { data: phaseData } = trpc.mobileApi.getPhaseWithTasks.useQuery(
    {
      jobId: assignments?.find(a => a.id === selectedAssignment)?.jobId || 0,
      phaseName: selectedPhase,
    },
    {
      enabled: !!selectedAssignment && !!selectedPhase,
    }
  );

  const uploadPhotoMutation = trpc.mobileApi.uploadProgressPhoto.useMutation();
  const submitReportMutation = trpc.mobileApi.submitProgressReport.useMutation();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploaded: false,
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const uploadPhotos = async () => {
    setUploading(true);
    try {
      const uploadPromises = photos
        .filter(p => !p.uploaded)
        .map(async (photo, index) => {
          const reader = new FileReader();
          return new Promise<string>((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64Data = (reader.result as string).split(',')[1];
                const result = await uploadPhotoMutation.mutateAsync({
                  fileName: photo.file.name,
                  fileData: base64Data,
                  mimeType: photo.file.type,
                });
                resolve(result.url);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(photo.file);
          });
        });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Update photos with uploaded URLs
      const updatedPhotos = photos.map((photo, index) => {
        if (!photo.uploaded) {
          const urlIndex = photos.slice(0, index).filter(p => !p.uploaded).length;
          return {
            ...photo,
            uploaded: true,
            url: uploadedUrls[urlIndex],
          };
        }
        return photo;
      });
      
      setPhotos(updatedPhotos);
      toast.success("Photos uploaded successfully!");
      return uploadedUrls;
    } catch (error) {
      console.error("Photo upload error:", error);
      toast.error("Failed to upload photos");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) {
      toast.error("Please select an assignment");
      return;
    }

    if (!notes.trim()) {
      toast.error("Please add some notes");
      return;
    }

    setSubmitting(true);
    try {
      // Upload photos first if any
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        const unuploadedPhotos = photos.filter(p => !p.uploaded);
        if (unuploadedPhotos.length > 0) {
          await uploadPhotos();
        }
        photoUrls = photos.filter(p => p.url).map(p => p.url!);
      }

      const assignment = assignments?.find(a => a.id === selectedAssignment);
      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Submit report
      await submitReportMutation.mutateAsync({
        assignmentId: selectedAssignment,
        jobId: assignment.jobId,
        phaseName: selectedPhase || undefined,
        taskName: selectedTask || undefined,
        notes: notes.trim(),
        photoUrls,
        reportDate: new Date().toISOString(),
      });

      toast.success("Progress report submitted successfully!");
      
      // Reset form
      setSelectedPhase("");
      setSelectedTask("");
      setNotes("");
      setPhotos([]);
      
      // Navigate back to dashboard
      setTimeout(() => {
        setLocation("/contractor-dashboard");
      }, 1500);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit progress report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAssignments) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
        <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  const selectedAssignmentData = assignments?.find(a => a.id === selectedAssignment);
  const availablePhases = selectedAssignmentData?.selectedPhases || [];
  const availableTasks = phaseData?.tasks || [];

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
              <h1 className="text-2xl font-bold">Progress Report</h1>
              <p className="text-sm text-gray-400">Submit daily updates with photos and notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="bg-[#1a2332] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create Progress Report</CardTitle>
            <CardDescription className="text-gray-400">
              Document your work with photos and detailed notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assignment Selection */}
            <div className="space-y-2">
              <Label htmlFor="assignment" className="text-gray-200">
                Select Assignment *
              </Label>
              <Select
                value={selectedAssignment?.toString() || ""}
                onValueChange={(value) => {
                  setSelectedAssignment(parseInt(value));
                  setSelectedPhase("");
                  setSelectedTask("");
                }}
              >
                <SelectTrigger id="assignment" className="bg-[#0a1628] border-gray-700 text-white">
                  <SelectValue placeholder="Choose an assignment" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-gray-700">
                  {assignments?.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id.toString()} className="text-white">
                      {assignment.jobName} - {assignment.jobAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phase Selection */}
            {selectedAssignment && availablePhases.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="phase" className="text-gray-200">
                  Phase (Optional)
                </Label>
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger id="phase" className="bg-[#0a1628] border-gray-700 text-white">
                    <SelectValue placeholder="Choose a phase" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700">
                    {availablePhases.map((phase: string) => (
                      <SelectItem key={phase} value={phase} className="text-white">
                        {phase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task Selection */}
            {selectedPhase && availableTasks.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="task" className="text-gray-200">
                  Task (Optional)
                </Label>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger id="task" className="bg-[#0a1628] border-gray-700 text-white">
                    <SelectValue placeholder="Choose a task" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-700">
                    {availableTasks.map((task: string, index: number) => (
                      <SelectItem key={index} value={task} className="text-white">
                        {task}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="text-gray-200">Photos</Label>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-[#F59E0B] transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">Click to upload photos</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB each</p>
                </label>
              </div>

              {/* Photo Previews */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-700"
                      />
                      {photo.uploaded && (
                        <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-200">
                Notes *
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the work completed, any issues encountered, materials used, etc."
                className="bg-[#0a1628] border-gray-700 text-white min-h-[150px]"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={() => setLocation("/contractor-dashboard")}
                variant="outline"
                className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || uploading || !selectedAssignment || !notes.trim()}
                className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
