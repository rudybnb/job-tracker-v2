import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ContractorLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"requesting" | "enabled" | "disabled">("requesting");
  const [isLoading, setIsLoading] = useState(false);

  // Request GPS permission on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsStatus("enabled"),
        () => setGpsStatus("disabled")
      );
    } else {
      setGpsStatus("disabled");
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/trpc/mobileApi.login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ json: { username, password } }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.result?.data?.json) {
        const result = data.result.data.json;
        toast.success("Login successful!");
        // Store the token
        localStorage.setItem('contractor_token', result.token);
        localStorage.setItem('contractor_id', result.contractor.id);
        setLocation("/contractor-dashboard");
      } else {
        toast.error(data.error?.json?.message || "Login failed");
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Unable to connect to server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    toast.info("Biometric authentication coming soon!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#0f1419] to-[#1a2332] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#D97706] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-[#F59E0B] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#D97706] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo and branding */}
        <div className="flex items-center gap-4 mb-12">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D97706] to-[#F59E0B] flex items-center justify-center shadow-lg">
            <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Sculpt Projects</h1>
            <p className="text-lg text-[#F59E0B]">GPS Time Tracking & Job Management</p>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-md bg-[#2a3847] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-3xl font-bold text-white text-center mb-2">Welcome Back</h2>
          <p className="text-gray-400 text-center mb-8">Sign in to access your dashboard</p>

          <div className="space-y-6">
            {/* Username field */}
            <div>
              <Label htmlFor="username" className="text-white text-base mb-2 block">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-[#1a2332] border-none text-white placeholder:text-gray-500 h-14 text-base"
              />
            </div>

            {/* Password field */}
            <div>
              <Label htmlFor="password" className="text-white text-base mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="bg-[#1a2332] border-none text-white placeholder:text-gray-500 h-14 text-base pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* GPS Status */}
            <div className="text-gray-400 text-sm">
              GPS Status: {" "}
              <span className={
                gpsStatus === "enabled" ? "text-green-500" :
                gpsStatus === "requesting" ? "text-yellow-500" :
                "text-red-500"
              }>
                {gpsStatus === "enabled" ? "Enabled" :
                 gpsStatus === "requesting" ? "Requesting" :
                 "Disabled"}
              </span>
            </div>

            {/* Sign In button */}
            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-[#B45309] hover:to-[#D97706] text-white text-lg font-semibold rounded-xl shadow-lg"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            {/* Biometric login */}
            <button
              type="button"
              onClick={handleBiometricLogin}
              className="w-full flex items-center justify-center gap-3 py-4 border-2 border-gray-600 rounded-xl text-gray-300 hover:border-[#F59E0B] hover:text-white transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <span>Sign in with fingerprint</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-8">
          Need help? Contact your project manager
        </p>
      </div>
    </div>
  );
}
