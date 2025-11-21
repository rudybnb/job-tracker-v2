import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Calendar, CheckCircle, Clock, MessageSquare, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ReminderLogs() {
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  // Fetch reminder logs
  const { data: reminderLogs, isLoading: logsLoading } = trpc.reminders.getReminderLogs.useQuery({
    limit: 100,
    date: selectedDate,
  });

  // Fetch check-ins
  const { data: checkIns, isLoading: checkInsLoading } = trpc.reminders.getCheckIns.useQuery({
    date: selectedDate,
  });

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = trpc.reminders.getReminderStats.useQuery({});

  const isLoading = authLoading || logsLoading || checkInsLoading || statsLoading;

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You need admin access to view reminder logs.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminder Logs</h1>
          <p className="text-muted-foreground">
            Track automated reminders and contractor check-ins
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reminders</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReminders || 0}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Morning Check-ins</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.morningCheckIns || 0}</div>
              <p className="text-xs text-muted-foreground">Sent at 8:15 AM</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Reports</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.dailyReports || 0}</div>
              <p className="text-xs text-muted-foreground">Sent at 5:00 PM</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.responseRate ? `${stats.responseRate.toFixed(1)}%` : "0%"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.responded || 0} of {stats?.totalReminders || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Date Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Date</CardTitle>
            <CardDescription>View reminders and check-ins for a specific date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
              <Button
                variant="outline"
                onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
              >
                Today
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reminder History</CardTitle>
            <CardDescription>
              {selectedDate === format(new Date(), "yyyy-MM-dd")
                ? "Today's reminders"
                : `Reminders for ${format(new Date(selectedDate), "MMMM d, yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading reminders...</p>
              </div>
            ) : reminderLogs && reminderLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminderLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.contractorName || "Unknown"}</TableCell>
                      <TableCell>
                        <Badge variant={log.reminderType === "morning_checkin" ? "default" : "secondary"}>
                          {log.reminderType === "morning_checkin" ? "Morning Check-in" : "Daily Report"}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(log.sentAt), "h:mm a")}</TableCell>
                      <TableCell>
                        {log.responded ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Responded</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-yellow-600">
                            <Clock className="h-4 w-4" />
                            <span>Pending</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.response ? (
                          <span className="text-sm">{log.response}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No response yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No reminders sent on this date</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-ins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contractor Check-ins</CardTitle>
            <CardDescription>
              {selectedDate === format(new Date(), "yyyy-MM-dd")
                ? "Today's check-ins"
                : `Check-ins for ${format(new Date(selectedDate), "MMMM d, yyyy")}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading check-ins...</p>
              </div>
            ) : checkIns && checkIns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contractor</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkIns.map((checkIn) => (
                    <TableRow key={checkIn.id}>
                      <TableCell className="font-medium">{checkIn.contractorName || "Unknown"}</TableCell>
                      <TableCell>{format(new Date(checkIn.checkInTime), "h:mm a")}</TableCell>
                      <TableCell>
                        <Badge>{checkIn.checkInType || "Manual"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {checkIn.location || "N/A"}
                      </TableCell>
                      <TableCell className="text-sm">{checkIn.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No check-ins recorded on this date</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
