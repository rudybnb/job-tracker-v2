import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Fingerprint, ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ContractorLogin() {
  console.log('ContractorLogin component rendered');
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
  }, []); // Run only once on mount

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('handleLogin called!');
    console.log('handleLogin called', { username, password: '***' });
    
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
      console.log('Login response:', data);
      
      if (response.ok && data.result?.data) {
        toast.success("Login successful!");
        // Store the token
        localStorage.setItem('contractor_token', data.result.data.token);
        localStorage.setItem('contractor_id', data.result.data.contractor.id);
        setLocation("/contractor-dashboard");
      } else {
        toast.error(data.error?.message || "Login failed");
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
    // WebAuthn implementation will go here
  };

  return (
    <div className="min-h-screen bg-[#1a2332] relative overflow-hidden">
      {/* Dot pattern background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "30px 30px"
        }}
      />

      {/* Header buttons */}
      <div className="absolute top-6 left-6 flex gap-3 z-10">
        <button
          onClick={() => setLocation("/")}
          className="w-12 h-12 rounded-full bg-[#2a3847] hover:bg-[#3a4857] flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => setLocation("/")}
          className="w-12 h-12 rounded-full bg-[#2a3847] hover:bg-[#3a4857] flex items-center justify-center transition-colors"
        >
          <Home className="w-5 h-5 text-white" />
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

          <form onSubmit={handleLogin} className="space-y-6">
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
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:from-[#B45309] hover:to-[#D97706] text-white text-lg font-semibold rounded-xl shadow-lg"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            {/* Biometric login */}
            <button
              type="button"
              onClick={handleBiometricLogin}
              className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors py-2"
            >
              <Fingerprint className="w-5 h-5" />
              <span>Sign in with fingerprint</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
