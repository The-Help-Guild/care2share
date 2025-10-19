import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { StartConversationButton } from "@/components/StartConversationButton";
import { formatDistanceToNow } from "date-fns";
import UserMap from "@/components/UserMap";

const Home = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
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

      if (!profile) {
        navigate("/profile-setup");
        return;
      }

      setCurrentUser({ ...session.user, profile });
      setUserId(session.user.id);
    };

    const loadRecentProfiles = async () => {
      // Use left join to include profiles even without domains
      const { data } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          bio,
          location,
          latitude,
          longitude,
          profile_photo_url,
          created_at,
          profile_domains(
            domains(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) setRecentProfiles(data);
      setLoading(false);
    };

    const loadSupportRequests = async () => {
      const { data } = await supabase
        .from("support_requests")
        .select(`
          id,
          title,
          category,
          status,
          created_at,
          user_id
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) {
        // Fetch profile data separately for each request
        const requestsWithProfiles = await Promise.all(
          data.map(async (request) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, profile_photo_url")
              .eq("id", request.user_id)
              .single();
            
            return {
              ...request,
              profiles: profile
            };
          })
        );
        setSupportRequests(requestsWithProfiles);
      }
    };

    const loadDomains = async () => {
      const { data } = await supabase
        .from("domains")
        .select("*")
        .order("name", { ascending: true });

      if (data) setDomains(data);
    };

    checkAuth();
    loadRecentProfiles();
    loadSupportRequests();
    loadDomains();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    // Subscribe to support requests changes
    const supportRequestsChannel = supabase
      .channel('support-requests-home')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_requests'
        },
        () => {
          loadSupportRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(supportRequestsChannel);
    };
  }, [navigate]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {currentUser?.profile?.full_name?.split(" ")[0] || "Friend"}!
            </h1>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="What do you need help with today?"
                className="pl-11 h-12 text-sm"
              />
            </div>
            <Button onClick={handleSearch} size="lg" className="px-6 md:px-8 shrink-0 h-12">
              Search
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
        <section>
          <UserMap users={recentProfiles} />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">New Members in Your Area</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProfiles.map((profile) => (
              <Card
                key={profile.id}
                className="hover-lift cursor-pointer"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 border-2 border-primary/10">
                      <AvatarImage src={profile.profile_photo_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-base">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {profile.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {profile.bio?.slice(0, 50) || "No bio yet"}
                        {profile.bio && profile.bio.length > 50 && "..."}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {profile.profile_domains?.slice(0, 3).map((pd: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs font-medium">
                        {pd.domains.name}
                      </Badge>
                    ))}
                    {profile.profile_domains?.length > 3 && (
                      <Badge variant="outline" className="text-xs font-medium">
                        +{profile.profile_domains.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {recentProfiles.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-base text-muted-foreground">
                  No profiles yet. Be among the first to share your expertise!
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Recent Support Requests</h2>
          </div>
          
          <div className="space-y-4">
            {supportRequests.map((request) => (
              <Card
                key={request.id}
                className="cursor-pointer hover-lift"
                onClick={() => navigate('/support')}
              >
                 <CardHeader className="pb-3">
                   <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-3">{request.title}</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs font-medium w-fit">
                          {request.category}
                        </Badge>
                        <span className="hidden sm:inline">•</span>
                        <span className="text-xs sm:text-sm">{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Avatar className="h-10 w-10 border-2 border-primary/10">
                        <AvatarImage src={request.profiles?.profile_photo_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(request.profiles?.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      {userId && request.user_id !== userId && (
                        <StartConversationButton
                          targetUserId={request.user_id}
                          currentUserId={userId}
                          variant="ghost"
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                 </CardHeader>
              </Card>
            ))}
            {supportRequests.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-base text-muted-foreground">No support requests yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold tracking-tight">Explore All Domains</h2>
            </div>
            <Badge variant="secondary" className="ml-auto font-medium">{domains.length} Available</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {domains.map((domain) => (
              <Button
                key={domain.id}
                variant="outline"
                className="h-auto py-6 px-4 flex flex-col items-center gap-3 hover-lift w-full"
                onClick={() => navigate(`/feed?domain=${encodeURIComponent(domain.name)}`)}
              >
                {domain.icon && <span className="text-3xl shrink-0">{domain.icon}</span>}
                <span className="font-medium text-center text-sm break-words w-full leading-snug">{domain.name}</span>
              </Button>
            ))}
          </div>

          {domains.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No domains available yet</p>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Popular Categories</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Technical Support", "Mentorship", "Skills Exchange", "Career Guidance"].map((skill) => (
              <Card
                key={skill}
                className="cursor-pointer hover-lift"
                onClick={() => navigate(`/support?category=${encodeURIComponent(skill)}`)}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-medium">{skill}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
