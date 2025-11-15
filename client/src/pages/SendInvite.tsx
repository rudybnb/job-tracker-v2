import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SendInvite() {
  const [contractorName, setContractorName] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [applicationId, setApplicationId] = useState("");

  // Check bot status
  const { data: botStatus } = trpc.telegram.verifyBot.useQuery();

  const sendInviteMutation = trpc.telegram.sendInvite.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation sent successfully!");
      setGeneratedLink(data.formUrl);
      // Clear form
      setContractorName("");
      setTelegramId("");
    },
    onError: (error) => {
      toast.error(`Failed to send invite: ${error.message}`);
    },
  });

  const handleSendInvite = () => {
    if (!contractorName.trim()) {
      toast.error("Please enter contractor name");
      return;
    }
    if (!telegramId.trim()) {
      toast.error("Please enter Telegram ID");
      return;
    }

    // Generate unique application ID
    const appId = `app_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setApplicationId(appId);

    sendInviteMutation.mutate({
      contractorName: contractorName.trim(),
      telegramId: telegramId.trim(),
      applicationId: appId,
    });
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Send Contractor Invite</h1>
          <p className="text-muted-foreground mt-2">
            Send a registration form link to a new contractor via Telegram
          </p>
        </div>

        {/* Bot Status Alert */}
        {botStatus && (
          <Alert className="mb-6" variant={botStatus.configured && botStatus.isValid ? "default" : "destructive"}>
            {botStatus.configured && botStatus.isValid ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Telegram bot is connected and ready to send messages
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {!botStatus.configured
                    ? "Telegram bot token not configured. Please add TELEGRAM_BOT_TOKEN to environment variables."
                    : "Telegram bot token is invalid. Please check your configuration."}
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Contractor Information</CardTitle>
            <CardDescription>
              Enter the contractor's name and Telegram ID to send them a registration form
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contractorName">Contractor Name *</Label>
              <Input
                id="contractorName"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="e.g., John Smith"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This name will be pre-filled in the registration form
              </p>
            </div>

            <div>
              <Label htmlFor="telegramId">Telegram Chat ID *</Label>
              <Input
                id="telegramId"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="e.g., 7617462316"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The contractor's Telegram Chat ID (numeric). They can get this from @userinfobot
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSendInvite}
                disabled={sendInviteMutation.isPending || !botStatus?.isValid}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendInviteMutation.isPending ? "Sending..." : "Send Telegram Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Link Display */}
        {generatedLink && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-green-600">Invite Sent Successfully!</CardTitle>
              <CardDescription>
                The contractor has been sent a Telegram message with the registration form link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Registration Form Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={generatedLink} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You can also share this link manually if needed
                </p>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  The contractor will receive a Telegram message with:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Personalized greeting with their name</li>
                    <li>Link to the registration form</li>
                    <li>List of required documents</li>
                    <li>24-hour completion deadline</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Get Telegram Chat ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-2">Method 1: Using @userinfobot</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open Telegram and search for @userinfobot</li>
                <li>Start the bot by clicking "Start"</li>
                <li>The bot will send you your Chat ID</li>
              </ol>
            </div>

            <div>
              <p className="font-semibold mb-2">Method 2: Send message to your bot</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Have the contractor send any message to your bot</li>
                <li>Visit: https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</li>
                <li>Look for "chat":{"{"}"id":123456789{"}"} in the response</li>
              </ol>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Known Contractor IDs:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Rudy Diedericks: 7617462316</li>
                  <li>Marius Andronache: 8006717361</li>
                  <li>Dalwayne Diedericks: 8016744652</li>
                  <li>Earl Johnson: 6792554033</li>
                  <li>Hamza Aouichaoui: 8108393007</li>
                  <li>Muhammed/Midou: 5209713845</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
