import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Checkbox } from "@/components/ui/checkbox";
import { Footer } from "@/components/Footer";

const authSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }).max(100).optional(),
  termsAccepted: z.boolean().optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    (searchParams.get("mode") as "login" | "signup") || "signup"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/home");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/home");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/home`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      // Rate limit check for authentication attempts
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        const rateLimitCheck = await checkRateLimit(currentSession.user.id, 'auth_attempt');
        if (!rateLimitCheck.allowed) {
          toast.error(`Too many authentication attempts. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 300) / 60)} minutes before trying again.`);
          setLoading(false);
          return;
        }
      }

      const validationData = mode === "signup" 
        ? { email, password, fullName, termsAccepted }
        : { email, password };
      
      const result = authSchema.safeParse(validationData);
      
      if (!result.success) {
        const errors = result.error.errors.map(e => e.message).join(", ");
        toast.error(errors);
        return;
      }

      if (mode === "signup") {
        if (!termsAccepted) {
          toast.error("You must accept the Terms of Service and Privacy Policy");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile-setup`,
            data: {
              full_name: fullName,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please log in instead.");
          } else {
            throw error;
          }
          return;
        }

        toast.success("Account created! Please check your email.");
        navigate("/profile-setup");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            throw error;
          }
          return;
        }

        toast.success("Logged in successfully!");
        navigate("/home");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-light/20 to-secondary-light/20 dark:from-primary/10 dark:to-secondary/10">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img src={logo} alt="Care2Share" className="h-20 w-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-primary mb-2">
            {mode === "signup" ? "Join Care2Share" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "signup"
              ? "Start connecting with your community"
              : "Continue helping and being helped"}
          </p>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-card">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  maxLength={100}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                maxLength={255}
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {mode === "signup" && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  required
                />
                <Label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer">
                  I accept the{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  . I understand my data will be processed in accordance with GDPR regulations.
                </Label>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create Account" : "Log In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {mode === "login"
                ? "Don't have an account? Sign up"
                : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Auth;
