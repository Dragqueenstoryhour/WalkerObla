import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Stethoscope, Users, BarChart3, CheckCircle } from "lucide-react";
import { getApiUrl } from "@/lib/utils";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", 
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", 
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", 
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", 
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", 
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", 
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

export default function TherapistLogin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(true); // Default to sign-up view
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stateOfLicensure, setStateOfLicensure] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated as therapist
  useEffect(() => {
    if (isAuthenticated && user?.role === "therapist") {
      setLocation("/therapist-portal");
    }
  }, [isAuthenticated, user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validation
    if (!email || !password) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }
      if (!firstName || !lastName) {
        setError("Please provide your first and last name");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        // Sign up logic
        const response = await fetch(getApiUrl('/api/auth/signup'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            role: 'therapist',
            licenseNumber: stateOfLicensure || undefined, // Map state to existing licenseNumber field
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Sign up failed');
        }

        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account, then sign in.",
        });

        // Switch to sign in mode
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        // Sign in logic
        console.log('Attempting login for:', email);
        const result = await login(email, password);
        console.log('Login result:', result);
        console.log('Full user object:', JSON.stringify(result.user, null, 2));
        
        if (result.success) {
          console.log('Login successful, user role:', result.user?.role);
          console.log('User ID:', result.user?.id);
          console.log('User email:', result.user?.email);
          console.log('All user fields:', Object.keys(result.user || {}));
          
          if (result.user?.role === 'therapist') {
            toast({
              title: "Welcome back!",
              description: "Redirecting to your therapist portal...",
            });
            setLocation("/therapist-portal");
          } else {
            console.error('Role mismatch - expected therapist, got:', result.user?.role);
            console.error('Full user object for debugging:', result.user);
            setError(`Account role is "${result.user?.role || 'unknown'}" but expected "therapist". Please contact support if you believe this is an error.`);
          }
        } else {
          console.error('Login failed:', result.error);
          setError(result.error || "Login failed");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Marketing content */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Obla Therapist Portal</h1>
            </div>
            <p className="text-xl text-gray-600">
              Empower your clients with AI-powered speech therapy tools and track their progress in real-time.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Client Management</h3>
                <p className="text-gray-600">Invite clients, create custom assignments, and monitor their practice sessions.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Progress Analytics</h3>
                <p className="text-gray-600">Detailed insights into pronunciation accuracy, fluency, and improvement trends.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI-Powered Assessment</h3>
                <p className="text-gray-600">Leverage Azure AI to provide real-time pronunciation feedback and scoring.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold">
                {isSignUp ? "Create Therapist Account" : "Sign In to Portal"}
              </CardTitle>
              <CardDescription>
                {isSignUp 
                  ? "Join the Obla platform to start helping your clients improve their speech"
                  : "Access your therapist dashboard and client management tools"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required={isSignUp}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required={isSignUp}
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stateOfLicensure">State of Licensure (Optional)</Label>
                      <Select value={stateOfLicensure} onValueChange={setStateOfLicensure}>
                        <SelectTrigger id="stateOfLicensure">
                          <SelectValue placeholder="Select your state of licensure" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="therapist@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={isSignUp}
                      placeholder="Confirm your password"
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  disabled={isLoading}
                >
                  {isLoading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleMode}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in" 
                    : "Need an account? Sign up"
                  }
                </Button>
              </div>

              {!isSignUp && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      // TODO: Implement forgot password
                      toast({
                        title: "Password Reset",
                        description: "Please contact support for password reset assistance.",
                      });
                    }}
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              By signing up, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}