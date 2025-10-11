import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          // Attempt to bootstrap admin for the first signed-in user
          await supabase.rpc('bootstrap_admin', { _user_id: session.user.id });
        } catch (e) {
          console.error('Error bootstrapping admin role:', e);
        }

        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (profile) {
          navigate("/home");
        } else {
          navigate("/profile-setup");
        }
      } else {
        navigate("/onboarding");
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading Care2Share...</p>
      </div>
    </div>
  );
};

export default Index;
