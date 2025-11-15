import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Edit, Save, X, CheckCircle, User } from "lucide-react";
import { useLocation } from "wouter";

export default function ContractorDetail() {
  const [, params] = useRoute("/contractors/:id");
  const contractorId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const [editingAdmin, setEditingAdmin] = useState(false);
  
  const { data: contractor, isLoading, refetch } = trpc.contractors.getById.useQuery(
    { id: contractorId },
    { enabled: contractorId > 0 }
  );

  const { data: application } = trpc.contractorApplications.getByContractorId.useQuery(
    { contractorId },
    { enabled: contractorId > 0 }
  );

  const [adminData, setAdminData] = useState({
    dailyRate: 0,
    cisVerified: false,
    adminNotes: "",
  });

  const updateMutation = trpc.contractors.updateAdminDetails.useMutation({
    onSuccess: () => {
      toast.success("Admin details updated successfully");
      setEditingAdmin(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contractor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Contractor not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleEditAdmin = () => {
    setAdminData({
      dailyRate: contractor.dailyRate || 0,
      cisVerified: contractor.cisVerified || false,
      adminNotes: contractor.adminNotes || "",
    });
    setEditingAdmin(true);
  };

  const handleSaveAdmin = () => {
    updateMutation.mutate({
      id: contractorId,
      ...adminData,
    });
  };

  const formatCurrency = (pence: number | null) => {
    if (!pence) return "Not set";
    return `£${(pence / 100).toFixed(2)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/contractors")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contractors
            </Button>
          </div>
          <Badge
            variant={
              contractor.status === "approved"
                ? "default"
                : contractor.status === "rejected"
                ? "destructive"
                : "secondary"
            }
          >
            {contractor.status}
          </Badge>
        </div>

        {/* Main Profile Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {contractor.firstName} {contractor.lastName}
                </CardTitle>
                <CardDescription className="flex flex-col gap-1 mt-2">
                  <span>📧 {contractor.email}</span>
                  <span>📞 {contractor.phone || "N/A"}</span>
                  {application?.fullAddress && (
                    <span>📍 {application.fullAddress}, {application.city} {application.postcode}</span>
                  )}
                  <span>🔨 {contractor.primaryTrade || "N/A"} • {application?.yearsOfExperience || "N/A"} experience</span>
                </CardDescription>
              </div>
              {contractor.status === "approved" && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Approved {contractor.updatedAt ? new Date(contractor.updatedAt).toLocaleDateString() : ""}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tax & CIS Information */}
          {application && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tax & CIS Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CIS Status:</span>
                  <span className="text-sm font-medium">
                    {application.cisRegistrationStatus === "registered" ? "Admin" : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">UTR:</span>
                  <span className="text-sm font-medium">{application.utrNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CIS Registered:</span>
                  <span className="text-sm font-medium">
                    {application.cisRegistrationStatus === "registered" ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valid CSCS:</span>
                  <span className="text-sm font-medium">
                    {application.hasValidCscsCard ? "Yes" : "No"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Banking Details */}
          {application && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">£ Banking Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bank Name:</span>
                  <span className="text-sm font-medium">{application.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account Holder:</span>
                  <span className="text-sm font-medium">{application.accountHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sort Code:</span>
                  <span className="text-sm font-medium font-mono">{application.sortCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account Number:</span>
                  <span className="text-sm font-medium font-mono">{application.accountNumber}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Details */}
          {application && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Work Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Right to Work:</span>
                  <span className="text-sm font-medium">
                    {application.hasRightToWork ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Public Liability:</span>
                  <span className="text-sm font-medium">
                    {application.hasPublicLiability ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Own Tools:</span>
                  <span className="text-sm font-medium">
                    {application.hasOwnTools ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Passport Photo:</span>
                  <span className="text-sm font-medium">
                    {application.passportPhotoUrl ? (
                      <a
                        href={application.passportPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      "Not uploaded"
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Details - Editable */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">⚙️ Admin Details</CardTitle>
                {!editingAdmin ? (
                  <Button variant="outline" size="sm" onClick={handleEditAdmin}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingAdmin(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveAdmin}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingAdmin ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CIS:</span>
                    <span className="text-sm font-medium">
                      {contractor.cisVerified ? "Verified" : "Not verified"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">£ Rate:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(contractor.dailyRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1">
                      {contractor.adminNotes || "None"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cisVerified">CIS Verified</Label>
                    <select
                      id="cisVerified"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={adminData.cisVerified ? "true" : "false"}
                      onChange={(e) =>
                        setAdminData({ ...adminData, cisVerified: e.target.value === "true" })
                      }
                    >
                      <option value="false">Not verified</option>
                      <option value="true">Verified</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyRate">Daily Rate (£)</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      step="0.01"
                      value={adminData.dailyRate / 100}
                      onChange={(e) =>
                        setAdminData({
                          ...adminData,
                          dailyRate: Math.round(parseFloat(e.target.value) * 100),
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">Admin Notes</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminData.adminNotes}
                      onChange={(e) =>
                        setAdminData({ ...adminData, adminNotes: e.target.value })
                      }
                      placeholder="Add notes about this contractor..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Emergency Contact */}
        {application && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Name:</span>
                <p className="text-sm font-medium mt-1">{application.emergencyContactName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Phone:</span>
                <p className="text-sm font-medium mt-1">{application.emergencyContactPhone}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Relationship:</span>
                <p className="text-sm font-medium mt-1">{application.emergencyContactRelationship}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
