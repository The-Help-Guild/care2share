import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MyProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [expertiseTags, setExpertiseTags] = useState<any[]>([]);
  const [hobbyTags, setHobbyTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        setProfile(profile);
        
        // Load domains
        const { data: profileDomains } = await supabase
          .from("profile_domains")
          .select("domains(*)")
          .eq("profile_id", profile.id);
        
        if (profileDomains) {
          setDomains(profileDomains.map((pd: any) => pd.domains));
        }

        // Load expertise tags
        const { data: expertise } = await supabase
          .from("expertise_tags")
          .select("*")
          .eq("profile_id", profile.id);
        
        if (expertise) setExpertiseTags(expertise);

        // Load hobby tags
        const { data: hobbies } = await supabase
          .from("hobby_tags")
          .select("*")
          .eq("profile_id", profile.id);
        
        if (hobbies) setHobbyTags(hobbies);
      }
      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error("Failed to log out");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success("Account deleted successfully");
      navigate("/auth");
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast.error("Failed to delete account");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">My Profile</h1>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
        {profile && (
          <>
            <ProfileCompleteness 
              profile={profile}
              domains={domains}
              expertiseTags={expertiseTags}
              hobbyTags={hobbyTags}
            />
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profile.profile_photo_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
                    <p className="text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                View Public Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/profile/edit')}
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your
                      account and remove all your data from our servers, including your
                      profile, messages, and all associated information in compliance with
                      GDPR regulations.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default MyProfile;
