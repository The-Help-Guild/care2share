import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { formatDistanceToNow } from "date-fns";

const Feed = () => {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", domain_id: "" });
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

      setCurrentUser({ ...session.user, profile });
    };

    const loadDomains = async () => {
      const { data } = await supabase
        .from("domains")
        .select("*")
        .order("name", { ascending: true });

      if (data) setDomains(data);
    };

    checkAuth();
    loadDomains();

    const domainParam = searchParams.get("domain");
    if (domainParam) {
      setSelectedDomain(domainParam);
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    loadPosts();
  }, [selectedDomain]);

  const loadPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select(`
        *,
        profiles!posts_user_id_fkey(full_name, profile_photo_url),
        domains(name, icon)
      `)
      .order("created_at", { ascending: false });

    if (selectedDomain) {
      const domain = domains.find(d => d.name === selectedDomain);
      if (domain) {
        query = query.eq("domain_id", domain.id);
      }
    }

    const { data } = await query;
    if (data) setPosts(data);
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("posts")
      .insert({
        title: newPost.title,
        content: newPost.content,
        domain_id: newPost.domain_id || null,
        user_id: currentUser.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
      return;
    }

    toast({
      description: "Post created successfully!",
    });
    setIsCreateDialogOpen(false);
    setNewPost({ title: "", content: "", domain_id: "" });
    loadPosts();
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
          <p className="mt-4 text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-10 shadow-soft">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary">Community Feed</h1>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Domains</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.name}>
                    {domain.icon && <span className="mr-2">{domain.icon}</span>}
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <Input
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      placeholder="Enter post title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Content</label>
                    <Textarea
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      placeholder="Share your thoughts..."
                      rows={5}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Domain (Optional)</label>
                    <Select value={newPost.domain_id} onValueChange={(value) => setNewPost({ ...newPost, domain_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Domain</SelectItem>
                        {domains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.icon && <span className="mr-2">{domain.icon}</span>}
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreatePost} className="w-full">
                    Create Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4 animate-fade-in">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {selectedDomain
                  ? `No posts in ${selectedDomain} yet`
                  : "No posts yet. Be the first to share!"}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="hover-lift">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.profiles?.profile_photo_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(post.profiles?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{post.profiles?.full_name}</p>
                      <span className="text-muted-foreground text-sm">•</span>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                      {post.domains && (
                        <>
                          <span className="text-muted-foreground text-sm">•</span>
                          <Badge variant="secondary" className="text-xs">
                            {post.domains.icon && <span className="mr-1">{post.domains.icon}</span>}
                            {post.domains.name}
                          </Badge>
                        </>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{post.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Feed;
