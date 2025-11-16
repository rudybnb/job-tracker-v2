import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Clock, CheckCircle2, AlertCircle, Navigation } from "lucide-react";
import { toast } from "sonner";

interface ClockInOutProps {
  assignmentId: number;
  jobTitle: string;
  jobLocation: string;
}

export default function ClockInOut({ assignmentId, jobTitle, jobLocation }: ClockInOutProps) {
  const [location, setLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { data: currentSession, refetch: refetchSession } = trpc.mobileApi.getCurrentSession.useQuery();
  
  const clockInMutation = trpc.mobileApi.clockIn.useMutation({
    onSuccess: (data) => {
      toast.success("Clocked in successfully!");
      refetchSession();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clock in");
    },
  });

  const clockOutMutation = trpc.mobileApi.clockOut.useMutation({
    onSuccess: (data) => {
      toast.success(`Clocked out! Hours worked: ${data.hoursWorked}, Net pay: £${data.netPay}`);
      refetchSession();
      setLocation(null);
      setDistance(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to clock out");
    },
  });

  const getLocation = () => {
    setGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toString();
        const lon = position.coords.longitude.toString();
        setLocation({ latitude: lat, longitude: lon });
        setGettingLocation(false);
        toast.success("Location obtained");
      },
      (error) => {
        let message = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        setLocationError(message);
        setGettingLocation(false);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClockIn = () => {
    if (!location) {
      toast.error("Please get your location first");
      return;
    }

    clockInMutation.mutate({
      assignmentId,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  const handleClockOut = () => {
    if (!location) {
      toast.error("Please get your location first");
      return;
    }

    clockOutMutation.mutate({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  // Calculate session duration
  const getSessionDuration = () => {
    if (!currentSession) return "0:00";
    
    const start = new Date(currentSession.startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Auto-refresh session duration every minute
  useEffect(() => {
    if (currentSession) {
      const interval = setInterval(() => {
        refetchSession();
      }, 60000); // Refresh every minute
      
      return () => clearInterval(interval);
    }
  }, [currentSession, refetchSession]);

  const isWithinGeofence = currentSession?.isWithinGeofence ?? false;
  const distanceFromSite = currentSession?.distanceFromSite;

  return (
    <Card className="bg-[#2a3847] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#F59E0B]" />
          Time Tracking
        </CardTitle>
        <CardDescription className="text-gray-400">
          {jobTitle} • {jobLocation}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current session status */}
        {currentSession ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                <span className="text-white font-medium">Clocked In</span>
              </div>
              <Badge className="bg-[#10B981] text-white">
                {getSessionDuration()}
              </Badge>
            </div>

            {distanceFromSite !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">
                  Distance from site: {distanceFromSite}m
                </span>
                {isWithinGeofence && (
                  <Badge className="bg-[#10B981] text-white text-xs">Within range</Badge>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <AlertCircle className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">Not clocked in</span>
          </div>
        )}

        {/* Location status */}
        <div className="space-y-2">
          <Button
            onClick={getLocation}
            disabled={gettingLocation}
            variant="outline"
            className="w-full bg-transparent border-gray-600 text-white hover:bg-[#1a2332]"
          >
            {gettingLocation ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 mr-2" />
                {location ? "Refresh Location" : "Get My Location"}
              </>
            )}
          </Button>

          {location && (
            <div className="text-xs text-gray-400 text-center">
              Location: {parseFloat(location.latitude).toFixed(6)}, {parseFloat(location.longitude).toFixed(6)}
            </div>
          )}

          {locationError && (
            <div className="text-xs text-red-400 text-center">
              {locationError}
            </div>
          )}
        </div>

        {/* Clock in/out buttons */}
        <div className="space-y-2">
          {!currentSession ? (
            <Button
              onClick={handleClockIn}
              disabled={!location || clockInMutation.isPending}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
            >
              {clockInMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clocking in...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Clock In
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleClockOut}
              disabled={!location || clockOutMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {clockOutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Clocking out...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Clock Out
                </>
              )}
            </Button>
          )}
        </div>

        {!location && (
          <p className="text-xs text-gray-400 text-center">
            Click "Get My Location" to enable clock in/out
          </p>
        )}
      </CardContent>
    </Card>
  );
}
