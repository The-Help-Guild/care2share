import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search as SearchIcon, Filter, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Search = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
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
      performSearch(query, selectedDomains);
    }
  }, [searchParams]);

  const performSearch = async (query: string, domainFilters: string[] = []) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      let queryBuilder = supabase
        .from("profiles")
        .select(`
          *,
          profile_domains!inner(
            domain_id,
            domains(id, name)
          ),
          expertise_tags(tag),
          hobby_tags(tag)
        `);

      // Apply domain filters
      if (domainFilters.length > 0) {
        queryBuilder = queryBuilder.in("profile_domains.domain_id", domainFilters);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Filter results based on search query
      const searchLower = query.toLowerCase();
      const filtered = data?.filter((profile) => {
        const nameMatch = profile.full_name.toLowerCase().includes(searchLower);
        const bioMatch = profile.bio?.toLowerCase().includes(searchLower);
        const expertiseMatch = profile.expertise_tags?.some((e: any) =>
          e.tag.toLowerCase().includes(searchLower)
        );
        const hobbyMatch = profile.hobby_tags?.some((h: any) =>
          h.tag.toLowerCase().includes(searchLower)
        );
        const domainMatch = profile.profile_domains?.some((pd: any) =>
          pd.domains.name.toLowerCase().includes(searchLower)
        );

        return nameMatch || bioMatch || expertiseMatch || hobbyMatch || domainMatch;
      }) || [];

      setResults(filtered);
    } catch (error: any) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      performSearch(searchQuery, selectedDomains);
    }
  };

  const handleFilterChange = (domainId: string) => {
    const newFilters = selectedDomains.includes(domainId)
      ? selectedDomains.filter((id) => id !== domainId)
      : [...selectedDomains, domainId];
    
    setSelectedDomains(newFilters);
    performSearch(searchQuery, newFilters);
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
        <div className="max-w-6xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Search Community
          </h1>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for skills, people, or services..."
                className="pl-10 h-12 text-base"
              />
            </div>
            <Button onClick={handleSearch} size="lg" className="px-8">
              Search
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="lg">
                  <Filter className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filter by Domain</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
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
              </SheetContent>
            </Sheet>
          </div>

          {selectedDomains.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDomains.map((domainId) => {
                const domain = domains.find((d) => d.id === domainId);
                return (
                  <Badge key={domainId} variant="secondary">
                    {domain?.name}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Found {results.length} {results.length === 1 ? "result" : "results"}
            </p>
            <div className="space-y-4">
              {results.map((profile) => (
                <Card
                  key={profile.id}
                  className="hover-lift cursor-pointer"
                  onClick={() => navigate(`/profile/${profile.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profile.profile_photo_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="mb-2">{profile.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {profile.bio || "No bio available"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {profile.profile_domains?.slice(0, 3).map((pd: any, i: number) => (
                            <Badge key={i} variant="secondary">
                              {pd.domains.name}
                            </Badge>
                          ))}
                          {profile.expertise_tags?.slice(0, 3).map((et: any, i: number) => (
                            <Badge key={`e-${i}`} variant="outline">
                              {et.tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="default">View Profile</Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </>
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
                Enter a search query to find community members
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
