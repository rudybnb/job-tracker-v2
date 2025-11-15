import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, FileText, Briefcase, AlertCircle } from "lucide-react";

type Application = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  telegramId: string | null;
  fullAddress: string;
  city: string;
  postcode: string;
  hasRightToWork: boolean;
  passportNumber: string | null;
  passportPhotoUrl: string | null;
  hasPublicLiability: boolean | null;
  cisRegistrationStatus: "registered" | "not_registered";
  cisNumber: string | null;
  utrNumber: string | null;
  hasValidCscsCard: boolean | null;
  bankName: string;
  accountHolderName: string;
  sortCode: string;
  accountNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  primaryTrade: string;
  yearsOfExperience: string;
  hasOwnTools: boolean | null;
  status: "pending" | "approved" | "rejected";
  adminNotes: string | null;
  cisRate: number | null;
  createdAt: Date;
};

export default function ContractorApplications() {
  const [selectedTab, setSelectedTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [cisRate, setCisRate] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");

  const utils = trpc.useUtils();

  // Query applications by status
  const { data: applications = [], isLoading } = trpc.contractorApplications.listByStatus.useQuery({
    status: selectedTab,
  });

  // Query statistics for all statuses
  const { data: stats } = trpc.contractorApplications.stats.useQuery();

  // Approve mutation
  const approveMutation = trpc.contractorApplications.approve.useMutation({
    onSuccess: () => {
      toast.success("Application approved successfully");
      utils.contractorApplications.listByStatus.invalidate();
      utils.contractorApplications.stats.invalidate();
      setShowApproveDialog(false);
      setSelectedApplication(null);
      setCisRate("");
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = trpc.contractorApplications.reject.useMutation({
    onSuccess: () => {
      toast.success("Application rejected");
      utils.contractorApplications.listByStatus.invalidate();
      utils.contractorApplications.stats.invalidate();
      setShowRejectDialog(false);
      setSelectedApplication(null);
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const handleApprove = () => {
    if (!selectedApplication) return;
    approveMutation.mutate({
      id: selectedApplication.id,
      cisRate: cisRate ? parseInt(cisRate) : undefined,
      adminNotes: adminNotes || undefined,
    });
  };

  const handleReject = () => {
    if (!selectedApplication) return;
    rejectMutation.mutate({
      id: selectedApplication.id,
      adminNotes: adminNotes || undefined,
    });
  };

  // Get counts from stats query
  const pendingCount = stats?.pending ?? 0;
  const approvedCount = stats?.approved ?? 0;
  const rejectedCount = stats?.rejected ?? 0;

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contractor Applications</h1>
        <p className="text-muted-foreground">Review and manage contractor applications</p>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as typeof selectedTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {selectedTab} applications
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app: Application) => (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {app.firstName} {app.lastName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Briefcase className="h-4 w-4" />
                            {app.primaryTrade} • {app.yearsOfExperience} experience
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={
                          app.status === "pending"
                            ? "secondary"
                            : app.status === "approved"
                            ? "default"
                            : "destructive"
                        }
                      >
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{app.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{app.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{app.city}, {app.postcode}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>CIS: {app.cisRegistrationStatus === "registered" ? "Registered" : "Not Registered"}</span>
                      </div>
                    </div>

                    {/* Key Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Right to Work:</span>
                        <Badge variant={app.hasRightToWork ? "default" : "destructive"} className="ml-2">
                          {app.hasRightToWork ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">CSCS Card:</span>
                        <Badge variant={app.hasValidCscsCard ? "default" : "secondary"} className="ml-2">
                          {app.hasValidCscsCard ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Own Tools:</span>
                        <Badge variant={app.hasOwnTools ? "default" : "secondary"} className="ml-2">
                          {app.hasOwnTools ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Public Liability:</span>
                        <Badge variant={app.hasPublicLiability ? "default" : "secondary"} className="ml-2">
                          {app.hasPublicLiability ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {app.status === "pending" && (
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={() => {
                            setSelectedApplication(app);
                            setShowApproveDialog(true);
                          }}
                          className="flex-1"
                          variant="default"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Application
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedApplication(app);
                            setShowRejectDialog(true);
                          }}
                          className="flex-1"
                          variant="destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Application
                        </Button>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {app.adminNotes && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="text-sm">
                            <span className="font-medium">Admin Notes:</span>
                            <p className="text-muted-foreground mt-1">{app.adminNotes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Approve {selectedApplication?.firstName} {selectedApplication?.lastName}'s contractor application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cisRate">CIS Rate (%)</Label>
              <Input
                id="cisRate"
                type="number"
                placeholder="20 or 30"
                value={cisRate}
                onChange={(e) => setCisRate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {selectedApplication?.cisRegistrationStatus === "registered"
                  ? "Registered contractors typically have 20% deduction"
                  : "Non-registered contractors typically have 30% deduction"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                placeholder="Add any notes about this approval..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Reject {selectedApplication?.firstName} {selectedApplication?.lastName}'s contractor application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectNotes">Reason for Rejection (Optional)</Label>
              <Textarea
                id="rejectNotes"
                placeholder="Explain why this application is being rejected..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
