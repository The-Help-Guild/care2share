import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Download, Loader2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BlockReportMenu } from "@/components/BlockReportMenu";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [expertiseTags, setExpertiseTags] = useState<any[]>([]);
  const [hobbyTags, setHobbyTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
    };

    const loadProfile = async () => {
      if (!id) return;

      try {
        // Query only safe fields - don't request email, latitude, longitude, resume_url unless it's own profile
        const fieldsToSelect = id === currentUserId 
          ? "*"  // Own profile - get everything
          : "id, full_name, bio, location, profile_photo_url, created_at";  // Other profiles - only safe fields
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(fieldsToSelect)
          .eq("id", id)
          .maybeSingle();

        if (profileError) throw profileError;
        
        if (!profileData) {
          toast.error("Profile not found");
          navigate("/home");
          return;
        }
        
        setProfile(profileData);

        const { data: domainsData } = await supabase
          .from("profile_domains")
          .select("domains(*)")
          .eq("profile_id", id);
        
        if (domainsData) {
          setDomains(domainsData.map((d: any) => d.domains));
        }

        const { data: expertiseData } = await supabase
          .from("expertise_tags")
          .select("*")
          .eq("profile_id", id);
        
        if (expertiseData) setExpertiseTags(expertiseData);

        const { data: hobbyData } = await supabase
          .from("hobby_tags")
          .select("*")
          .eq("profile_id", id);
        
        if (hobbyData) setHobbyTags(hobbyData);

      } catch (error: any) {
        toast.error("Failed to load profile");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    loadProfile();
  }, [id, navigate]);

  const handleContactClick = async () => {
    if (!id || !currentUserId) return;

    try {
      // Rate limit check
      const { checkRateLimit } = await import('@/lib/rateLimit');
      const rateLimitCheck = await checkRateLimit(currentUserId, 'conversation');
      if (!rateLimitCheck.allowed) {
        toast.error(`You've created too many conversations. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 3600) / 60)} minutes before trying again.`);
        return;
      }

      // Check if conversation already exists between these users
      const { data: existingConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (existingConversations) {
        for (const conv of existingConversations) {
          const { data: otherParticipants } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id)
            .neq("user_id", currentUserId);

          if (otherParticipants?.some(p => p.user_id === id)) {
            navigate(`/messages?conversation=${conv.conversation_id}`);
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants to the conversation
      const { error: participantsError } = await supabase
        .from("conversation_participants")
        .insert([
          { conversation_id: newConversation.id, user_id: currentUserId },
          { conversation_id: newConversation.id, user_id: id }
        ]);

      if (participantsError) throw participantsError;

      toast.success("Conversation started!");
      navigate(`/messages?conversation=${newConversation.id}`);
    } catch (error: any) {
      toast.error("Failed to start conversation");
      console.error(error);
    }
  };

  const handleResumeDownload = async () => {
    if (!profile?.resume_url) return;

    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(profile.resume_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profile.full_name}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download resume");
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Profile not found</p>
            <Button onClick={() => navigate("/home")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUserId === id;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-10 shadow-soft">
        <div className="max-w-4xl mx-auto p-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary flex-1">Profile</h1>
          {!isOwnProfile && <BlockReportMenu userId={id!} />}
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.profile_photo_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{profile.full_name}</CardTitle>
                {isOwnProfile && profile.email && (
                  <p className="text-muted-foreground">{profile.email}</p>
                )}
                {profile.location && (
                  <p className="text-muted-foreground text-sm mt-1">📍 {profile.location}</p>
                )}
                <div className="mt-4">
                {!isOwnProfile && (
                  <Button onClick={handleContactClick} className="gap-2">
                    <Mail className="h-4 w-4" />
                    Contact
                  </Button>
                )}
                {isOwnProfile && (
                  <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                    Edit Profile
                  </Button>
                )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {profile.bio && (
          <Card>
            <CardHeader>
              <CardTitle>Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {domains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expertise Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <Badge key={domain.id} variant="default" className="text-base py-1">
                    {domain.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {expertiseTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Areas of Expertise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {expertiseTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-sm">
                    {tag.tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hobbyTags.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Hobbies & Passions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hobbyTags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-sm">
                    {tag.tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {profile.resume_url && isOwnProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Resume / Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleResumeDownload} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download Resume
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
