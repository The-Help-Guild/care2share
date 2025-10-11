import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const Home = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
        .single();

      if (!profile) {
        navigate("/profile-setup");
        return;
      }

      setCurrentUser({ ...session.user, profile });
    };

    const loadRecentProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select(`
          *,
          profile_domains!inner(
            domains(name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (data) setRecentProfiles(data);
      setLoading(false);
    };

    checkAuth();
    loadRecentProfiles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
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
      <header className="bg-card border-b sticky top-0 z-10 shadow-soft">
        <div className="max-w-6xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Welcome, {currentUser?.profile?.full_name?.split(" ")[0] || "Friend"}!
          </h1>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="What do you need help with today?"
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button onClick={handleSearch} size="lg" className="px-8">
              Search
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-8 animate-fade-in">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">New Members in Your Area</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProfiles.map((profile) => (
              <Card
                key={profile.id}
                className="hover-lift cursor-pointer"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile.profile_photo_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {profile.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {profile.bio?.slice(0, 50) || "No bio yet"}
                        {profile.bio && profile.bio.length > 50 && "..."}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {profile.profile_domains?.slice(0, 3).map((pd: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {pd.domains.name}
                      </Badge>
                    ))}
                    {profile.profile_domains?.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.profile_domains.length - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {recentProfiles.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No profiles yet. Be among the first to share your expertise!
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Trending Skills</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Web Development", "Graphic Design", "Home Repair", "Life Coaching"].map((skill) => (
              <Card
                key={skill}
                className="cursor-pointer hover-lift"
                onClick={() => navigate(`/search?q=${encodeURIComponent(skill)}`)}
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
