import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

const STEPS = [
  "Personal Details",
  "Right to Work",
  "CIS & Tax",
  "Banking",
  "Emergency Contact",
  "Trade & Tools",
];

export default function ContractorForm() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const prefilledName = params.get("name") || "";
  const telegramId = params.get("telegram_id") || "";
  const applicationId = params.get("id") || "";

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Personal Details
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    telegramId: telegramId,
    fullAddress: "",
    city: "",
    postcode: "",

    // Step 2: Right to Work
    hasRightToWork: true,
    passportNumber: "",
    passportPhotoUrl: "",

    // Step 3: CIS & Tax
    hasPublicLiability: false,
    cisRegistrationStatus: "not_registered" as "registered" | "not_registered",
    cisNumber: "",
    utrNumber: "",
    hasValidCscsCard: false,

    // Step 4: Banking
    bankName: "",
    accountHolderName: "",
    sortCode: "",
    accountNumber: "",

    // Step 5: Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",

    // Step 6: Trade & Tools
    primaryTrade: "",
    yearsOfExperience: "",
    hasOwnTools: false,
  });

  // Pre-fill name if provided
  useEffect(() => {
    if (prefilledName) {
      const names = prefilledName.trim().split(" ");
      if (names.length >= 2) {
        setFormData((prev) => ({
          ...prev,
          firstName: names[0],
          lastName: names.slice(1).join(" "),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          firstName: prefilledName,
        }));
      }
    }
  }, [prefilledName]);

  const submitMutation = trpc.contractorApplications.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to submit: ${error.message}`);
    },
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    submitMutation.mutate(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Application Submitted!</CardTitle>
            <CardDescription>
              Thank you for completing your contractor registration form. Our admin team will review your
              application and get back to you soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>You will receive a notification via Telegram once your application has been reviewed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-12 mx-auto mb-4" />}
          <h1 className="text-3xl font-bold">Contractor Registration</h1>
          <p className="text-muted-foreground mt-2">ER Build & Design</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={`flex-1 text-center ${
                  index === currentStep
                    ? "text-primary font-semibold"
                    : index < currentStep
                    ? "text-green-500"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm ${
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-muted"
                  }`}
                >
                  {index < currentStep ? "✓" : index + 1}
                </div>
                <p className="text-xs hidden sm:block">{step}</p>
              </div>
            ))}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep]}</CardTitle>
            <CardDescription>Step {currentStep + 1} of {STEPS.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Personal Details */}
            {currentStep === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fullAddress">Full Address *</Label>
                  <Input
                    id="fullAddress"
                    value={formData.fullAddress}
                    onChange={(e) => updateField("fullAddress", e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="postcode">Postcode *</Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => updateField("postcode", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Right to Work */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label>Do you have the right to work in the UK? *</Label>
                  <RadioGroup
                    value={formData.hasRightToWork ? "yes" : "no"}
                    onValueChange={(value) => updateField("hasRightToWork", value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="rtw-yes" />
                      <Label htmlFor="rtw-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="rtw-no" />
                      <Label htmlFor="rtw-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label htmlFor="passportNumber">Passport Number</Label>
                  <Input
                    id="passportNumber"
                    value={formData.passportNumber}
                    onChange={(e) => updateField("passportNumber", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="passportPhoto">Passport Photo URL</Label>
                  <Input
                    id="passportPhoto"
                    type="url"
                    value={formData.passportPhotoUrl}
                    onChange={(e) => updateField("passportPhotoUrl", e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your photo to a service like Imgur and paste the link here
                  </p>
                </div>
              </>
            )}

            {/* Step 3: CIS & Tax */}
            {currentStep === 2 && (
              <>
                <div>
                  <Label>Do you have public liability insurance?</Label>
                  <RadioGroup
                    value={formData.hasPublicLiability ? "yes" : "no"}
                    onValueChange={(value) => updateField("hasPublicLiability", value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="pli-yes" />
                      <Label htmlFor="pli-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="pli-no" />
                      <Label htmlFor="pli-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>CIS Registration Status *</Label>
                  <RadioGroup
                    value={formData.cisRegistrationStatus}
                    onValueChange={(value) => updateField("cisRegistrationStatus", value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="registered" id="cis-registered" />
                      <Label htmlFor="cis-registered">Registered</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="not_registered" id="cis-not-registered" />
                      <Label htmlFor="cis-not-registered">Not Registered</Label>
                    </div>
                  </RadioGroup>
                </div>
                {formData.cisRegistrationStatus === "registered" && (
                  <div>
                    <Label htmlFor="cisNumber">CIS Number</Label>
                    <Input
                      id="cisNumber"
                      value={formData.cisNumber}
                      onChange={(e) => updateField("cisNumber", e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="utrNumber">UTR Number</Label>
                  <Input
                    id="utrNumber"
                    value={formData.utrNumber}
                    onChange={(e) => updateField("utrNumber", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Do you have a valid CSCS card?</Label>
                  <RadioGroup
                    value={formData.hasValidCscsCard ? "yes" : "no"}
                    onValueChange={(value) => updateField("hasValidCscsCard", value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="cscs-yes" />
                      <Label htmlFor="cscs-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="cscs-no" />
                      <Label htmlFor="cscs-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Step 4: Banking */}
            {currentStep === 3 && (
              <>
                <div>
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => updateField("accountHolderName", e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sortCode">Sort Code *</Label>
                    <Input
                      id="sortCode"
                      value={formData.sortCode}
                      onChange={(e) => updateField("sortCode", e.target.value)}
                      placeholder="00-00-00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => updateField("accountNumber", e.target.value)}
                      placeholder="12345678"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Emergency Contact */}
            {currentStep === 4 && (
              <>
                <div>
                  <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => updateField("emergencyContactName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactPhone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyContactRelationship">Relationship *</Label>
                  <Input
                    id="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={(e) => updateField("emergencyContactRelationship", e.target.value)}
                    placeholder="e.g., Spouse, Parent, Sibling"
                    required
                  />
                </div>
              </>
            )}

            {/* Step 6: Trade & Tools */}
            {currentStep === 5 && (
              <>
                <div>
                  <Label htmlFor="primaryTrade">Primary Trade *</Label>
                  <Input
                    id="primaryTrade"
                    value={formData.primaryTrade}
                    onChange={(e) => updateField("primaryTrade", e.target.value)}
                    placeholder="e.g., Plumber, Electrician, Carpenter"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                  <Input
                    id="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={(e) => updateField("yearsOfExperience", e.target.value)}
                    placeholder="e.g., 5-10 years"
                    required
                  />
                </div>
                <div>
                  <Label>Do you have your own tools?</Label>
                  <RadioGroup
                    value={formData.hasOwnTools ? "yes" : "no"}
                    onValueChange={(value) => updateField("hasOwnTools", value === "yes")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="tools-yes" />
                      <Label htmlFor="tools-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="tools-no" />
                      <Label htmlFor="tools-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
