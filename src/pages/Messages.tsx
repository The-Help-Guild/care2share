import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Messages = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-primary">Messages</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Messaging Coming Soon</h2>
            <p className="text-muted-foreground">
              We're building a secure messaging system so you can connect directly
              with community members. Stay tuned!
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Messages;
