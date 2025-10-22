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
import { MessageSquare, Plus, Trash2, Pencil, Heart, Send, Upload, X, Youtube } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import DOMPurify from "dompurify";
import { EmojiPickerComponent } from "@/components/EmojiPicker";
import { useAdmin } from "@/hooks/useAdmin";
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
import imageCompression from "browser-image-compression";

const Feed = () => {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", domain_id: "", photo_url: "", youtube_url: "" });
  const [editingPost, setEditingPost] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

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
    if (domains.length > 0) {
      loadPosts();
    }
  }, [selectedDomain, domains.length]);

  useEffect(() => {
    if (posts.length > 0 && currentUser) {
      loadPostLikes();
      loadAllComments();
    }
  }, [posts.length, currentUser]);

  const loadPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedDomain) {
      const domain = domains.find(d => d.name === selectedDomain);
      if (domain) {
        query = query.eq("domain_id", domain.id);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error("Error loading posts:", error);
      toast({
        title: "Error loading posts",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      // Fetch author profiles in a single batched query
      const userIds = Array.from(new Set(data.map((p) => p.user_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading profiles for posts:", profilesError);
        } else if (profileRows) {
          profileMap = Object.fromEntries(profileRows.map((r) => [r.id, r]));
        }
      }

      // Build a domain map from already loaded domains
      const domainMap: Record<string, { name: string; icon: string | null }> = Object.fromEntries(
        (domains || []).map((d: any) => [d.id, { name: d.name, icon: d.icon }])
      );

      const enriched = data.map((p) => ({
        ...p,
        profiles: p.user_id ? profileMap[p.user_id] ?? null : null,
        domains: p.domain_id ? domainMap[p.domain_id] ?? null : null,
      }));

      setPosts(enriched);
    }
    
    setLoading(false);
  };

  const postSchema = z.object({
    title: z.string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be less than 200 characters")
      .refine(val => !val.includes('<script'), "Invalid characters in title"),
    content: z.string()
      .trim()
      .min(10, "Content must be at least 10 characters")
      .max(5000, "Content must be less than 5000 characters"),
    domain_id: z.string().uuid().optional(),
    photo_url: z.string().url().optional().or(z.literal("")),
    youtube_url: z.string().url().optional().or(z.literal(""))
  });

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handlePhotoUpload = async (file: File) => {
    if (!currentUser) return null;

    try {
      setUploadingPhoto(true);

      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // Upload to Supabase Storage
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('post-photos')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreatePost = async () => {
    if (!currentUser) return;
    
    try {
      setUploadingPhoto(true);
      
      // Upload photo if exists
      let photoUrl = newPost.photo_url;
      if (photoFile) {
        const uploadedUrl = await handlePhotoUpload(photoFile);
        if (uploadedUrl) photoUrl = uploadedUrl;
      }

      // Sanitize inputs (strip any HTML)
      const sanitizedTitle = DOMPurify.sanitize(newPost.title.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      const sanitizedContent = DOMPurify.sanitize(newPost.content.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });

      // Validate with zod
      const validated = postSchema.parse({
        title: sanitizedTitle,
        content: sanitizedContent,
        domain_id: newPost.domain_id || undefined,
        photo_url: photoUrl || "",
        youtube_url: newPost.youtube_url || ""
      });

      const { error } = await supabase.from("posts").insert({
        title: validated.title,
        content: validated.content,
        domain_id: validated.domain_id || null,
        photo_url: validated.photo_url || null,
        youtube_url: validated.youtube_url || null,
        user_id: currentUser.id,
      });

      if (error) throw error;

      toast({
        description: "Post created successfully!",
      });
      
      setNewPost({ title: "", content: "", domain_id: "", photo_url: "", youtube_url: "" });
      setPhotoFile(null);
      setPhotoPreview("");
      setIsCreateDialogOpen(false);
      loadPosts();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create post",
          variant: "destructive",
        });
      }
    } finally {
      setUploadingPhoto(false);
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

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast({
        description: "Post deleted successfully",
      });
      
      loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleEditPost = async () => {
    if (!currentUser || !editingPost) return;
    
    try {
      setUploadingPhoto(true);

      // Upload new photo if exists
      let photoUrl = editingPost.photo_url;
      if (photoFile) {
        const uploadedUrl = await handlePhotoUpload(photoFile);
        if (uploadedUrl) photoUrl = uploadedUrl;
      }

      const sanitizedTitle = DOMPurify.sanitize(editingPost.title.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
      const sanitizedContent = DOMPurify.sanitize(editingPost.content.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });

      const validated = postSchema.parse({
        title: sanitizedTitle,
        content: sanitizedContent,
        domain_id: editingPost.domain_id || undefined,
        photo_url: photoUrl || "",
        youtube_url: editingPost.youtube_url || ""
      });

      // Build update query - admins can edit any post
      let query = supabase
        .from("posts")
        .update({
          title: validated.title,
          content: validated.content,
          domain_id: validated.domain_id || null,
          photo_url: validated.photo_url || null,
          youtube_url: validated.youtube_url || null,
        })
        .eq("id", editingPost.id);

      // Regular users can only edit their own posts
      if (!isAdmin) {
        query = query.eq("user_id", currentUser.id);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        description: "Post updated successfully!",
      });
      
      setPhotoFile(null);
      setPhotoPreview("");
      setIsEditDialogOpen(false);
      setEditingPost(null);
      loadPosts();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update post",
          variant: "destructive",
        });
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadPostLikes = async () => {
    if (!currentUser) return;

    const postIds = posts.map(p => p.id);
    const { data: likesData } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds);

    const likesMap: Record<string, { count: number; isLiked: boolean }> = {};
    
    postIds.forEach(postId => {
      const postLikesData = likesData?.filter(l => l.post_id === postId) || [];
      likesMap[postId] = {
        count: postLikesData.length,
        isLiked: postLikesData.some(l => l.user_id === currentUser.id)
      };
    });

    setPostLikes(likesMap);
  };

  const togglePostLike = async (postId: string) => {
    if (!currentUser) return;

    const isLiked = postLikes[postId]?.isLiked;

    if (isLiked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id);

      if (!error) {
        setPostLikes(prev => ({
          ...prev,
          [postId]: { count: prev[postId].count - 1, isLiked: false }
        }));
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: currentUser.id });

      if (!error) {
        setPostLikes(prev => ({
          ...prev,
          [postId]: { count: (prev[postId]?.count || 0) + 1, isLiked: true }
        }));
      }
    }
  };

  const loadAllComments = async () => {
    const postIds = posts.map(p => p.id);
    
    const { data: commentsData } = await supabase
      .from("comments")
      .select("*, profiles(id, full_name, profile_photo_url)")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    if (commentsData) {
      const commentsMap: Record<string, any[]> = {};
      commentsData.forEach(comment => {
        if (!commentsMap[comment.post_id]) {
          commentsMap[comment.post_id] = [];
        }
        commentsMap[comment.post_id].push(comment);
      });
      setComments(commentsMap);

      // Load comment likes
      if (currentUser && commentsData.length > 0) {
        const commentIds = commentsData.map(c => c.id);
        const { data: likesData } = await supabase
          .from("comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", commentIds);

        const likesMap: Record<string, { count: number; isLiked: boolean }> = {};
        
        commentIds.forEach(commentId => {
          const commentLikesData = likesData?.filter(l => l.comment_id === commentId) || [];
          likesMap[commentId] = {
            count: commentLikesData.length,
            isLiked: commentLikesData.some(l => l.user_id === currentUser.id)
          };
        });

        setCommentLikes(likesMap);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!currentUser || !newComment[postId]?.trim()) return;

    const sanitizedContent = DOMPurify.sanitize(newComment[postId].trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });

    if (sanitizedContent.length < 1 || sanitizedContent.length > 1000) {
      toast({
        title: "Validation Error",
        description: "Comment must be between 1 and 1000 characters",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: currentUser.id, content: sanitizedContent })
      .select("*, profiles(id, full_name, profile_photo_url)")
      .single();

    if (!error && data) {
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data]
      }));
      setNewComment(prev => ({ ...prev, [postId]: "" }));
      toast({ description: "Comment added!" });
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (!error) {
      setComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== commentId)
      }));
      toast({ description: "Comment deleted" });
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUser) return;

    const isLiked = commentLikes[commentId]?.isLiked;

    if (isLiked) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUser.id);

      if (!error) {
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: { count: prev[commentId].count - 1, isLiked: false }
        }));
      }
    } else {
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: currentUser.id });

      if (!error) {
        setCommentLikes(prev => ({
          ...prev,
          [commentId]: { count: (prev[commentId]?.count || 0) + 1, isLiked: true }
        }));
      }
    }
  };

  const toggleCommentsExpanded = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
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
            <Select value={selectedDomain || "all"} onValueChange={(value) => setSelectedDomain(value === "all" ? "" : value)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
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
                    <div className="flex gap-2">
                      <Input
                        value={newPost.title}
                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                        placeholder="Enter post title"
                        className="flex-1"
                      />
                      <EmojiPickerComponent
                        onEmojiSelect={(emoji) =>
                          setNewPost({ ...newPost, title: newPost.title + emoji })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Content</label>
                    <div className="relative">
                      <Textarea
                        value={newPost.content}
                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                        placeholder="Share your thoughts..."
                        rows={5}
                        className="pr-12"
                      />
                      <div className="absolute bottom-2 right-2">
                        <EmojiPickerComponent
                          onEmojiSelect={(emoji) =>
                            setNewPost({ ...newPost, content: newPost.content + emoji })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Domain (Optional)</label>
                    <Select value={newPost.domain_id || "none"} onValueChange={(value) => setNewPost({ ...newPost, domain_id: value === "none" ? "" : value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a domain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Domain</SelectItem>
                        {domains.map((domain) => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.icon && <span className="mr-2">{domain.icon}</span>}
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Photo (Optional)</label>
                    <div className="space-y-2">
                      {photoPreview && (
                        <div className="relative">
                          <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview("");
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('photo-upload-create')?.click()}
                        disabled={uploadingPhoto}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                      </Button>
                      <input
                        id="photo-upload-create"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">YouTube URL (Optional)</label>
                    <div className="flex gap-2">
                      <Youtube className="h-5 w-5 text-muted-foreground mt-2" />
                      <Input
                        value={newPost.youtube_url}
                        onChange={(e) => setNewPost({ ...newPost, youtube_url: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                  </div>

                  <Button onClick={handleCreatePost} className="w-full" disabled={uploadingPhoto}>
                    {uploadingPhoto ? "Uploading..." : "Create Post"}
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
                  <div className="flex items-center gap-1 ml-auto">
                    {(currentUser?.id === post.user_id || isAdmin) && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPost(post);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {(currentUser?.id === post.user_id || isAdmin) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Post</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this post? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                
                {/* Photo Display */}
                {post.photo_url && (
                  <img 
                    src={post.photo_url} 
                    alt="Post" 
                    className="w-full rounded-lg mt-4 max-h-96 object-cover"
                  />
                )}

                {/* YouTube Preview */}
                {post.youtube_url && extractYoutubeId(post.youtube_url) && (
                  <div className="mt-4 rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="315"
                      src={`https://www.youtube.com/embed/${extractYoutubeId(post.youtube_url)}`}
                      title="YouTube video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full"
                    />
                  </div>
                )}
                
                {/* Like and Comment Actions */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePostLike(post.id)}
                    className="gap-2"
                  >
                    <Heart
                      className={`h-4 w-4 ${postLikes[post.id]?.isLiked ? "fill-destructive text-destructive" : ""}`}
                    />
                    <span>{postLikes[post.id]?.count || 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCommentsExpanded(post.id)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>{comments[post.id]?.length || 0}</span>
                  </Button>
                </div>

                {/* Comments Section */}
                {expandedPosts.has(post.id) && (
                  <div className="mt-4 space-y-4">
                    {/* Existing Comments */}
                    {comments[post.id]?.map(comment => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={comment.profiles?.profile_photo_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(comment.profiles?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{comment.profiles?.full_name}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                            {(currentUser?.id === comment.user_id || isAdmin) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 ml-auto"
                                onClick={() => handleDeleteComment(comment.id, post.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCommentLike(comment.id)}
                            className="h-6 px-2 gap-1"
                          >
                            <Heart
                              className={`h-3 w-3 ${commentLikes[comment.id]?.isLiked ? "fill-destructive text-destructive" : ""}`}
                            />
                            <span className="text-xs">{commentLikes[comment.id]?.count || 0}</span>
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a comment..."
                        value={newComment[post.id] || ""}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newComment[post.id]?.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <div className="flex gap-2">
                <Input
                  value={editingPost?.title || ""}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  placeholder="Enter post title"
                  className="flex-1"
                />
                <EmojiPickerComponent
                  onEmojiSelect={(emoji) =>
                    setEditingPost({ ...editingPost, title: (editingPost?.title || "") + emoji })
                  }
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <div className="relative">
                <Textarea
                  value={editingPost?.content || ""}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  placeholder="Share your thoughts..."
                  rows={5}
                  className="pr-12"
                />
                <div className="absolute bottom-2 right-2">
                  <EmojiPickerComponent
                    onEmojiSelect={(emoji) =>
                      setEditingPost({ ...editingPost, content: (editingPost?.content || "") + emoji })
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Domain (Optional)</label>
              <Select 
                value={editingPost?.domain_id || "none"} 
                onValueChange={(value) => setEditingPost({ ...editingPost, domain_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Domain</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.icon && <span className="mr-2">{domain.icon}</span>}
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Photo (Optional)</label>
              <div className="space-y-2">
                {(photoPreview || editingPost?.photo_url) && (
                  <div className="relative">
                    <img 
                      src={photoPreview || editingPost?.photo_url} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg" 
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview("");
                        setEditingPost({ ...editingPost, photo_url: "" });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById('photo-upload-edit')?.click()}
                  disabled={uploadingPhoto}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </Button>
                <input
                  id="photo-upload-edit"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">YouTube URL (Optional)</label>
              <div className="flex gap-2">
                <Youtube className="h-5 w-5 text-muted-foreground mt-2" />
                <Input
                  value={editingPost?.youtube_url || ""}
                  onChange={(e) => setEditingPost({ ...editingPost, youtube_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <Button onClick={handleEditPost} className="w-full" disabled={uploadingPhoto}>
              {uploadingPhoto ? "Uploading..." : "Update Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Feed;
