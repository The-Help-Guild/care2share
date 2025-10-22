import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon, Filter, Loader2, Users, MessageSquare, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { StartConversationButton } from "@/components/StartConversationButton";
import { CATEGORIES } from "@/lib/constants";
import { getLocationAddress } from "@/lib/locationHelpers";
import { formatDistanceToNow } from "date-fns";

const searchInputSchema = z.object({
  query: z.string().max(200, "Search query too long (max 200 characters)"),
  location: z.string().max(100, "Location too long (max 100 characters)")
});

const Search = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [postResults, setPostResults] = useState<any[]>([]);
  const [supportResults, setSupportResults] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
    };

    const loadDomains = async () => {
      const { data } = await supabase
        .from("domains")
        .select("*")
        .order("name");
      if (data) setDomains(data);
    };

    checkAuth();
    loadDomains();
  }, [navigate]);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query, selectedDomains, selectedCategories, locationFilter);
    }
  }, [searchParams]);

  const performSearch = async (query: string, domainFilters: string[] = [], categoryFilters: string[] = [], location: string = "") => {
    if (!query.trim()) {
      setResults([]);
      setPostResults([]);
      setSupportResults([]);
      return;
    }

    setLoading(true);

    try {
      // Rate limit check
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        const rateLimitCheck = await checkRateLimit(session.user.id, 'search');
        if (!rateLimitCheck.allowed) {
          toast.error(`Too many searches. Please wait a moment before searching again.`);
          setLoading(false);
          return;
        }
      }

      const searchLower = query.toLowerCase();
      const locationLower = location.toLowerCase();

      // Search profiles
      const profileSelectBase = `
        id,
        full_name,
        bio,
        location,
        profile_photo_url,
        profile_domains(
          domain_id,
          domains(id, name)
        ),
        expertise_tags(tag),
        hobby_tags(tag)
      `;
      const profileSelectWithInner = `
        id,
        full_name,
        bio,
        location,
        profile_photo_url,
        profile_domains!inner(
          domain_id,
          domains(id, name)
        ),
        expertise_tags(tag),
        hobby_tags(tag)
      `;

      let profileQuery = supabase
        .from("profiles")
        .select(domainFilters.length > 0 ? profileSelectWithInner : profileSelectBase);

      if (domainFilters.length > 0) {
        profileQuery = profileQuery.in("profile_domains.domain_id", domainFilters);
      }

      // Search posts
      let postQuery = supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          created_at,
          user_id,
          domain_id,
          domains(name)
        `)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (domainFilters.length > 0) {
        postQuery = postQuery.in("domain_id", domainFilters);
      }

      // Search support requests
      const supportQuery = supabase
        .from("support_requests")
        .select(`
          id,
          title,
          description,
          category,
          status,
          created_at,
          user_id
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      const [profileData, postData, supportData] = await Promise.all([
        profileQuery,
        postQuery,
        supportQuery
      ]);

      if (profileData.error) throw profileData.error;
      if (postData.error) throw postData.error;
      if (supportData.error) throw supportData.error;

      // Fetch profiles for posts
      const postsWithProfiles = await Promise.all(
        (postData.data || []).map(async (post) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", post.user_id)
            .single();
          return { ...post, profiles: profile };
        })
      );

      // Fetch profiles for support requests
      const supportWithProfiles = await Promise.all(
        (supportData.data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", request.user_id)
            .single();
          return { ...request, profiles: profile };
        })
      );

      // Filter and score profiles
      const filtered = profileData.data?.filter((profile) => {
        const profileLocation = getLocationAddress(profile.location);
        if (locationLower && !profileLocation?.toLowerCase().includes(locationLower)) {
          return false;
        }

        const nameMatch = profile.full_name.toLowerCase().includes(searchLower);
        const bioMatch = profile.bio?.toLowerCase().includes(searchLower);
        const locationMatch = profileLocation?.toLowerCase().includes(searchLower);
        const expertiseMatch = profile.expertise_tags?.some((e: any) =>
          e.tag.toLowerCase().includes(searchLower)
        );
        const hobbyMatch = profile.hobby_tags?.some((h: any) =>
          h.tag.toLowerCase().includes(searchLower)
        );
        const domainMatch = profile.profile_domains?.some((pd: any) =>
          pd.domains.name.toLowerCase().includes(searchLower)
        );

        return nameMatch || bioMatch || locationMatch || expertiseMatch || hobbyMatch || domainMatch;
      }) || [];

      const scored = filtered.map(profile => {
        let score = 0;
        
        if (profile.full_name.toLowerCase() === searchLower) score += 100;
        else if (profile.full_name.toLowerCase().includes(searchLower)) score += 50;
        
        const expertiseMatches = profile.expertise_tags?.filter((e: any) =>
          e.tag.toLowerCase().includes(searchLower)
        ).length || 0;
        score += expertiseMatches * 30;
        
        const domainMatches = profile.profile_domains?.filter((pd: any) =>
          pd.domains.name.toLowerCase().includes(searchLower)
        ).length || 0;
        score += domainMatches * 20;
        
        const hobbyMatches = profile.hobby_tags?.filter((h: any) =>
          h.tag.toLowerCase().includes(searchLower)
        ).length || 0;
        score += hobbyMatches * 10;
        
        if (profile.bio?.toLowerCase().includes(searchLower)) score += 15;
        
        const profileLocation = getLocationAddress(profile.location);
        if (location && profileLocation?.toLowerCase().includes(locationLower)) score += 25;
        
        if (categoryFilters.length > 0) {
          const allTags = [
            ...(profile.expertise_tags || []).map((t: any) => t.tag.toLowerCase()),
            ...(profile.hobby_tags || []).map((t: any) => t.tag.toLowerCase()),
          ];
          
          const categoryMatches = categoryFilters.filter(cat => 
            allTags.some(tag => 
              tag.includes(cat.toLowerCase()) || cat.toLowerCase().includes(tag)
            )
          ).length;
          
          if (categoryMatches > 0) {
            score += categoryMatches * 40;
          } else {
            score -= 30;
          }
        }
        
        return { ...profile, relevance_score: score };
      });

      const sorted = scored.sort((a, b) => b.relevance_score - a.relevance_score);

      setResults(sorted);
      setPostResults(postsWithProfiles);
      setSupportResults(supportWithProfiles);
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      try {
        // Validate search inputs
        searchInputSchema.parse({ query: searchQuery, location: locationFilter });
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        performSearch(searchQuery, selectedDomains, selectedCategories, locationFilter);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(error.errors[0].message);
        }
      }
    }
  };

  const handleFilterChange = (domainId: string) => {
    const newFilters = selectedDomains.includes(domainId)
      ? selectedDomains.filter((id) => id !== domainId)
      : [...selectedDomains, domainId];
    
    setSelectedDomains(newFilters);
    performSearch(searchQuery, newFilters, selectedCategories, locationFilter);
  };

  const handleCategoryFilterChange = (category: string) => {
    const newFilters = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newFilters);
    performSearch(searchQuery, selectedDomains, newFilters, locationFilter);
  };

  const handleLocationFilterChange = (location: string) => {
    try {
      // Validate location input
      if (location) {
        searchInputSchema.shape.location.parse(location);
      }
      setLocationFilter(location);
      if (searchQuery.trim()) {
        performSearch(searchQuery, selectedDomains, selectedCategories, location);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-10 shadow-soft">
        <div className="max-w-6xl mx-auto p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-lg sm:text-2xl font-bold text-primary">
              Search Community
            </h1>
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for skills, people, or services..."
                className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
              />
            </div>
            <Button onClick={handleSearch} size="default" className="px-4 sm:px-8 h-10 sm:h-12">
              Search
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="default" className="h-10 sm:h-12 px-3 sm:px-4">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <Label htmlFor="location-filter" className="text-base font-semibold mb-3 block">
                      Location
                    </Label>
                    <Input
                      id="location-filter"
                      value={locationFilter}
                      onChange={(e) => handleLocationFilterChange(e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                      className="mb-2"
                    />
                    {locationFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLocationFilterChange("")}
                        className="text-xs"
                      >
                        Clear location
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Domains
                    </Label>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {domains.map((domain) => (
                        <div key={domain.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={domain.id}
                            checked={selectedDomains.includes(domain.id)}
                            onCheckedChange={() => handleFilterChange(domain.id)}
                          />
                          <Label htmlFor={domain.id} className="cursor-pointer flex-1">
                            {domain.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Categories
                    </Label>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {CATEGORIES.map((category) => (
                        <div key={category} className="flex items-center space-x-3">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={() => handleCategoryFilterChange(category)}
                          />
                          <Label htmlFor={`category-${category}`} className="cursor-pointer flex-1">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {(selectedDomains.length > 0 || selectedCategories.length > 0 || locationFilter) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {locationFilter && (
                <Badge variant="default">
                  📍 {locationFilter}
                </Badge>
              )}
              {selectedDomains.map((domainId) => {
                const domain = domains.find((d) => d.id === domainId);
                return (
                  <Badge key={domainId} variant="secondary">
                    {domain?.name}
                  </Badge>
                );
              })}
              {selectedCategories.map((category) => (
                <Badge key={category} variant="outline">
                  🏷️ {category}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (results.length > 0 || postResults.length > 0 || supportResults.length > 0) ? (
          <div className="space-y-8">
            {/* People Results */}
            {results.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People ({results.length})
                </h2>
                <div className="space-y-4">
                  {results.map((profile) => (
                    <Card
                      key={profile.id}
                      className="hover-lift cursor-pointer"
                      onClick={() => navigate(`/profile/${profile.id}`)}
                    >
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <Avatar className="h-16 w-16 sm:h-16 sm:w-16">
                            <AvatarImage src={profile.profile_photo_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(profile.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 w-full">
                            <CardTitle className="text-lg mb-2">{profile.full_name}</CardTitle>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {profile.bio || "No bio available"}
                            </p>
                            <div className="space-y-2">
                              {profile.location && (
                                <p className="text-xs text-muted-foreground">📍 {getLocationAddress(profile.location)}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {profile.profile_domains?.slice(0, 3).map((pd: any, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {pd.domains.name}
                                  </Badge>
                                ))}
                                {profile.expertise_tags?.slice(0, 3).map((et: any, i: number) => (
                                  <Badge key={`e-${i}`} variant="outline" className="text-xs">
                                    {et.tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                            <Button 
                              variant="default" 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${profile.id}`);
                              }}
                              className="flex-1 sm:flex-none sm:min-w-[120px]"
                            >
                              View Profile
                            </Button>
                            {currentUserId && profile.id !== currentUserId && (
                              <StartConversationButton
                                targetUserId={profile.id}
                                currentUserId={currentUserId}
                                variant="outline"
                                size="default"
                                className="flex-1 sm:flex-none"
                              />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Results */}
            {postResults.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Posts ({postResults.length})
                </h2>
                <div className="space-y-4">
                  {postResults.map((post) => (
                    <Card
                      key={post.id}
                      className="hover-lift cursor-pointer"
                      onClick={() => navigate(`/feed?post=${post.id}`)}
                    >
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={post.profiles?.profile_photo_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {getInitials(post.profiles?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                              <p className="font-semibold text-sm">{post.profiles?.full_name}</p>
                              {post.domains && (
                                <Badge variant="secondary" className="text-xs w-fit">
                                  {post.domains.name}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base sm:text-lg mb-2">{post.title}</CardTitle>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {post.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Support Requests Results */}
            {supportResults.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Support Requests ({supportResults.length})
                </h2>
                <div className="space-y-4">
                  {supportResults.map((request) => (
                    <Card
                      key={request.id}
                      className="hover-lift cursor-pointer"
                      onClick={() => navigate('/support')}
                    >
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start gap-3">
                          <div className="flex-1 min-w-0 w-full">
                            <CardTitle className="text-base sm:text-lg mb-2">{request.title}</CardTitle>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {request.description}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs font-medium w-fit">
                                {request.category}
                              </Badge>
                              <span className="hidden sm:inline">•</span>
                              <span className="text-xs">
                                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <Avatar className="h-10 w-10 shrink-0 sm:order-last order-first self-end sm:self-auto">
                            <AvatarImage src={request.profiles?.profile_photo_url} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {getInitials(request.profiles?.full_name || "?")}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : searchQuery ? (
          <Card>
            <CardContent className="py-12 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No results found for "{searchQuery}"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try different keywords or adjust your filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Search for people, posts, or support requests
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Search;
