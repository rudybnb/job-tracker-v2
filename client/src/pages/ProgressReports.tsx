import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";

export default function ProgressReports() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"reviewed" | "approved">("approved");

  const utils = trpc.useUtils();

  // Fetch progress reports with filters
  const { data: reports, isLoading } = trpc.progressReports.getAll.useQuery({
    status: statusFilter === "all" ? undefined : (statusFilter as "submitted" | "reviewed" | "approved"),
  });

  // Review mutation
  const reviewMutation = trpc.progressReports.review.useMutation({
    onSuccess: () => {
      toast.success("Progress report reviewed successfully");
      setReviewModalOpen(false);
      setSelectedReport(null);
      setReviewNotes("");
      utils.progressReports.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to review report: ${error.message}`);
    },
  });

  const handleReview = () => {
    if (!selectedReport) return;

    reviewMutation.mutate({
      reportId: selectedReport.id,
      status: reviewAction,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setReviewModalOpen(true);
    setReviewNotes(report.reviewNotes || "");
    setReviewAction(report.status === "submitted" ? "approved" : report.status);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-500">Submitted</Badge>;
      case "reviewed":
        return <Badge className="bg-yellow-500">Reviewed</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Reports</h1>
        <p className="text-muted-foreground">
          Review and approve contractor progress reports
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter progress reports by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Reports ({reports?.length || 0})
          </CardTitle>
          <CardDescription>
            All submitted progress reports from contractors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No progress reports found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{formatDate(report.reportDate)}</TableCell>
                    <TableCell className="font-medium">
                      {report.contractorName}
                    </TableCell>
                    <TableCell>{report.jobTitle}</TableCell>
                    <TableCell>{report.phaseName || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {report.taskName || "—"}
                    </TableCell>
                    <TableCell>
                      {report.audioUrl ? (
                        <Badge variant="outline" className="bg-blue-50">
                          🎤 Voice
                        </Badge>
                      ) : (
                        <Badge variant="outline">📝 Text</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Progress Report</DialogTitle>
            <DialogDescription>
              Review and approve contractor progress report
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Report Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Contractor</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.contractorName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Job</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.jobTitle}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phase</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.phaseName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Task</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.taskName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Report Date</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedReport.reportDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(selectedReport.status)}
                </div>
              </div>

              {/* Voice Message */}
              {selectedReport.audioUrl && (
                <div className="space-y-2">
                  <Label>Voice Message</Label>
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    {/* Audio Player */}
                    <audio controls className="w-full">
                      <source src={selectedReport.audioUrl} type="audio/ogg" />
                      <source src={selectedReport.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    
                    {/* Language and Duration Info */}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {selectedReport.originalLanguage && (
                        <span>Language: {selectedReport.originalLanguage.toUpperCase()}</span>
                      )}
                      {selectedReport.transcriptionDuration && (
                        <span>Duration: {Math.round(selectedReport.transcriptionDuration)}s</span>
                      )}
                    </div>

                    {/* Transcription */}
                    {selectedReport.transcribedText && (
                      <div className="p-3 bg-background rounded border">
                        <p className="text-sm font-medium mb-1">Transcription (English):</p>
                        <p className="text-sm whitespace-pre-wrap">{selectedReport.transcribedText}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Notes */}
              <div className="space-y-2">
                <Label>Progress Notes</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedReport.notes || selectedReport.reportText || "No notes provided"}
                  </p>
                </div>
              </div>

              {/* Photos */}
              {selectedReport.photoUrls && JSON.parse(selectedReport.photoUrls).length > 0 && (
                <div className="space-y-2">
                  <Label>Photos</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {JSON.parse(selectedReport.photoUrls).map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Progress photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Review Action */}
              <div className="space-y-2">
                <Label>Review Action</Label>
                <Select
                  value={reviewAction}
                  onValueChange={(value) => setReviewAction(value as "reviewed" | "approved")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">Mark as Reviewed</SelectItem>
                    <SelectItem value="approved">Approve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <Label>Review Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any comments or feedback..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewModalOpen(false);
                setSelectedReport(null);
                setReviewNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : reviewAction === "approved" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Report
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Mark as Reviewed
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
