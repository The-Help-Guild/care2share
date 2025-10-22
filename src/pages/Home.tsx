import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Users, MessageSquare, Calendar, Megaphone, MapPin } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { StartConversationButton } from "@/components/StartConversationButton";
import { formatDistanceToNow, format } from "date-fns";
import UserMap from "@/components/UserMap";
import { MentionText } from "@/components/MentionText";

const Home = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentProfiles, setRecentProfiles] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [latestEvents, setLatestEvents] = useState<any[]>([]);
  const [eventPolls, setEventPolls] = useState<Record<string, any>>({});
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
      // 1) Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          bio,
          location,
          latitude,
          longitude,
          profile_photo_url,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!profilesData || profilesData.length === 0) {
        setRecentProfiles([]);
        setLoading(false);
        return;
      }

      // 2) Fetch profile_domains (no embedded join dependency)
      const profileIds = profilesData.map((p) => p.id);
      const { data: profileDomains } = await supabase
        .from("profile_domains")
        .select("profile_id, domain_id")
        .in("profile_id", profileIds);

      // 3) Fetch all referenced domains in one query
      const domainIds = Array.from(new Set((profileDomains || []).map((pd) => pd.domain_id)));
      let domainsById: Record<string, { id: string; name: string }> = {};
      if (domainIds.length > 0) {
        const { data: domainsData } = await supabase
          .from("domains")
          .select("id, name")
          .in("id", domainIds);
        (domainsData || []).forEach((d) => {
          domainsById[d.id as string] = { id: d.id as string, name: d.name as string };
        });
      }

      // 4) Fetch expertise and hobby tags
      const { data: expertise } = await supabase
        .from("expertise_tags")
        .select("profile_id, tag")
        .in("profile_id", profileIds);
      const { data: hobbies } = await supabase
        .from("hobby_tags")
        .select("profile_id, tag")
        .in("profile_id", profileIds);

      // 5) Merge back into profiles
      const enrichedProfiles = profilesData.map((profile) => {
        const pds = (profileDomains || []).filter((pd) => pd.profile_id === profile.id);
        const mappedDomains = pds
          .map((pd) => domainsById[pd.domain_id as string])
          .filter(Boolean)
          .map((d) => ({ domains: { name: d.name } }));
        const mappedExpertise = (expertise || [])
          .filter((e) => e.profile_id === profile.id)
          .map((e) => ({ tag: e.tag }));
        const mappedHobbies = (hobbies || [])
          .filter((h) => h.profile_id === profile.id)
          .map((h) => ({ tag: h.tag }));
        return { ...profile, profile_domains: mappedDomains, expertise_tags: mappedExpertise, hobby_tags: mappedHobbies };
      });

      setRecentProfiles(enrichedProfiles);
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
      // Fetch all domains
      const { data: domainsData } = await supabase
        .from("domains")
        .select("id, name, icon, created_at");

      if (!domainsData) {
        setDomains([]);
        return;
      }

      // Fetch all posts and count by domain
      const { data: postsData } = await supabase
        .from("posts")
        .select("domain_id");

      // Count posts per domain
      const postCounts: Record<string, number> = {};
      (postsData || []).forEach((post) => {
        if (post.domain_id) {
          postCounts[post.domain_id] = (postCounts[post.domain_id] || 0) + 1;
        }
      });

      // Add post counts and sort by popularity
      const domainsWithCounts = domainsData
        .map((domain) => ({
          ...domain,
          post_count: postCounts[domain.id] || 0,
        }))
        .sort((a, b) => b.post_count - a.post_count);

      setDomains(domainsWithCounts);
    };

    const loadCategories = async () => {
      // Fetch all support requests
      const { data: requestsData } = await supabase
        .from("support_requests")
        .select("category");

      if (!requestsData) {
        setCategories([]);
        return;
      }

      // Count requests per category
      const categoryCounts: Record<string, number> = {};
      requestsData.forEach((request) => {
        if (request.category) {
          categoryCounts[request.category] = (categoryCounts[request.category] || 0) + 1;
        }
      });

      // Convert to array and sort by count
      const sortedCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4); // Show top 4

      setCategories(sortedCategories);
    };

    const loadLatestEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);

      if (data) {
        setLatestEvents(data);
        
        // Load polls for these events
        for (const event of data) {
          await loadPollForEvent(event.id);
        }
      }
    };

    const loadPollForEvent = async (eventId: string) => {
      try {
        const { data: pollData, error: pollError } = await supabase
          .from("event_polls")
          .select("id, question")
          .eq("event_id", eventId)
          .maybeSingle();

        if (pollError) throw pollError;
        if (!pollData) return;

        const { data: optionsData, error: optionsError } = await supabase
          .from("poll_options")
          .select("id, option_text")
          .eq("poll_id", pollData.id);

        if (optionsError) throw optionsError;

        const { data: votesData, error: votesError } = await supabase
          .from("poll_votes")
          .select("option_id, user_id")
          .eq("poll_id", pollData.id);

        if (votesError) throw votesError;

        const { data: { user } } = await supabase.auth.getUser();
        const userVote = votesData?.find(v => v.user_id === user?.id)?.option_id;

        const optionsWithVotes = (optionsData || []).map(opt => ({
          ...opt,
          votes: votesData?.filter(v => v.option_id === opt.id).length || 0
        }));

        setEventPolls(prev => ({
          ...prev,
          [eventId]: {
            id: pollData.id,
            event_id: eventId,
            question: pollData.question,
            options: optionsWithVotes,
            userVote
          }
        }));
      } catch (error) {
        console.error("Error fetching poll:", error);
      }
    };

    checkAuth();
    loadRecentProfiles();
    loadSupportRequests();
    loadDomains();
    loadCategories();
    loadLatestEvents();

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

  const handleVote = async (pollId: string, optionId: string, eventId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please log in to vote");
        return;
      }

      const currentVote = eventPolls[eventId]?.userVote;

      if (currentVote) {
        await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_id", pollId)
          .eq("user_id", userData.user.id);
      }

      if (currentVote !== optionId) {
        const { error } = await supabase
          .from("poll_votes")
          .insert({
            poll_id: pollId,
            option_id: optionId,
            user_id: userData.user.id
          });

        if (error) throw error;
      }

      // Reload poll data
      const { data: votesData } = await supabase
        .from("poll_votes")
        .select("option_id, user_id")
        .eq("poll_id", pollId);

      const poll = eventPolls[eventId];
      if (poll) {
        const updatedOptions = poll.options.map((opt: any) => ({
          ...opt,
          votes: votesData?.filter(v => v.option_id === opt.id).length || 0
        }));

        setEventPolls(prev => ({
          ...prev,
          [eventId]: {
            ...poll,
            options: updatedOptions,
            userVote: currentVote !== optionId ? optionId : undefined
          }
        }));
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to vote");
    }
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
        {latestEvents.length > 0 && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestEvents.map((event) => {
                const poll = eventPolls[event.id];
                const totalVotes = poll ? poll.options.reduce((sum: number, opt: any) => sum + opt.votes, 0) : 0;
                const isAnnouncement = event.type === "announcement";

                return (
                  <Card 
                    key={event.id}
                    className={`hover-lift cursor-pointer ${
                      isAnnouncement 
                        ? "border-border bg-card" 
                        : "border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
                    }`}
                    onClick={() => navigate('/events')}
                  >
                    <CardHeader className={isAnnouncement ? "space-y-4" : ""}>
                      {isAnnouncement ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent/10 text-accent-foreground">
                              <Megaphone className="h-5 w-5" />
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Announcement
                            </Badge>
                          </div>
                          <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                              🔔 {event.title}
                            </CardTitle>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="p-3 rounded-lg bg-primary/10 text-primary">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                Event
                              </Badge>
                            </div>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            {event.event_date && (
                              <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(event.event_date), "PPp")}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <MentionText 
                        text={event.description} 
                        className={`text-sm ${isAnnouncement ? "text-foreground" : "text-muted-foreground"} line-clamp-4`}
                      />

                      {poll && (
                        <div className="border-t pt-4" onClick={(e) => e.stopPropagation()}>
                          <h4 className="font-semibold mb-3 text-sm">{poll.question}</h4>
                          <div className="space-y-2">
                            {poll.options.map((option: any) => {
                              const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                              const isSelected = poll.userVote === option.id;

                              return (
                                <button
                                  key={option.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVote(poll.id, option.id, event.id);
                                  }}
                                  className={`w-full text-left p-2 rounded-lg border transition-colors relative overflow-hidden ${
                                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <div className="absolute inset-0 bg-primary/10" style={{ width: `${percentage}%` }} />
                                  <div className="relative flex items-center justify-between text-sm">
                                    <span className="font-medium">{option.option_text}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {option.votes} ({percentage.toFixed(0)}%)
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

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
                    {(() => {
                      const specialties = Array.from(new Set([
                        ...(profile.profile_domains?.map((pd: any) => pd.domains.name) || []),
                        ...(profile.expertise_tags?.map((et: any) => et.tag) || []),
                        ...(profile.hobby_tags?.map((ht: any) => ht.tag) || []),
                      ]));
                      return (
                        <>
                          {specialties.slice(0, 3).map((name: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs font-medium">
                              {name}
                            </Badge>
                          ))}
                          {specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs font-medium">
                              +{specialties.length - 3} more
                            </Badge>
                          )}
                          {specialties.length === 0 && (
                            <Badge variant="outline" className="text-xs font-medium">No specialties yet</Badge>
                          )}
                        </>
                      );
                    })()}
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
            {categories.map((category) => (
              <Card
                key={category.name}
                className="cursor-pointer hover-lift"
                onClick={() => navigate(`/support?category=${encodeURIComponent(category.name)}`)}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{category.count} requests</p>
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
