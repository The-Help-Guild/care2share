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
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/^[a-zA-Z]/, { message: "Password must start with a letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "Password must contain at least one special character" }),
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
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be 8+ characters, start with a letter, and include: lowercase, uppercase, number, and special character
              </p>
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
