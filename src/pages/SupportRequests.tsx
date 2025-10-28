import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { MessageSquare, Plus, Search, Clock, CheckCircle, AlertCircle, Filter, Send, Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { StartConversationButton } from "@/components/StartConversationButton";
import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";
import DOMPurify from "dompurify";
import { EmojiPickerComponent } from "@/components/EmojiPicker";
import { useAdmin } from "@/hooks/useAdmin";

const requestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000, "Description too long"),
  category: z.string().min(1, "Category is required"),
});

const replySchema = z.object({
  content: z.string().min(1, "Reply cannot be empty").max(2000, "Reply too long"),
});

// Sanitization helper to strip all HTML and prevent XSS attacks
const sanitizeInput = (content: string): string => {
  return DOMPurify.sanitize(content, { 
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [] // Strip all attributes
  });
};

interface SupportRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
  reply_count?: number;
}

interface Reply {
  id: string;
  request_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_reply_id: string | null;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
  nestedReplies?: Reply[];
}

const SupportRequests = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { isAdmin } = useAdmin();

  // Read category from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam && CATEGORIES.includes(categoryParam as any)) {
      setCategoryFilter(categoryParam);
    }
  }, []);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [editingReply, setEditingReply] = useState<Reply | null>(null);
  const [isEditReplyDialogOpen, setIsEditReplyDialogOpen] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      loadRequests();
    }
  }, [userId, categoryFilter, statusFilter]);

  useEffect(() => {
    if (selectedRequest) {
      loadReplies(selectedRequest.id);
      
      // Subscribe to new replies
      const channel = supabase
        .channel(`replies-${selectedRequest.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_request_replies',
            filter: `request_id=eq.${selectedRequest.id}`
          },
          () => {
            loadReplies(selectedRequest.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedRequest]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles and reply counts for each request
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (request) => {
          // Get profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", request.user_id)
            .single();
          
          // Get reply count
          const { count } = await supabase
            .from("support_request_replies")
            .select("*", { count: 'exact', head: true })
            .eq("request_id", request.id);
          
          return {
            ...request,
            profiles: profile || { full_name: "Unknown User", profile_photo_url: null },
            reply_count: count || 0
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load support requests");
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_request_replies")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Fetch profiles for each reply
      const repliesWithProfiles = await Promise.all(
        (data || []).map(async (reply) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, profile_photo_url")
            .eq("id", reply.user_id)
            .single();
          
          return {
            ...reply,
            profiles: profile || { full_name: "Unknown User", profile_photo_url: null },
            nestedReplies: []
          };
        })
      );
      
      // Organize replies hierarchically
      const topLevelReplies = repliesWithProfiles.filter(r => !r.parent_reply_id);
      const nestedRepliesMap = new Map<string, Reply[]>();
      
      repliesWithProfiles.filter(r => r.parent_reply_id).forEach(reply => {
        if (!nestedRepliesMap.has(reply.parent_reply_id!)) {
          nestedRepliesMap.set(reply.parent_reply_id!, []);
        }
        nestedRepliesMap.get(reply.parent_reply_id!)!.push(reply);
      });
      
      // Attach nested replies to their parents
      const organizeReplies = (replies: Reply[]): Reply[] => {
        return replies.map(reply => ({
          ...reply,
          nestedReplies: organizeReplies(nestedRepliesMap.get(reply.id) || [])
        }));
      };
      
      setReplies(organizeReplies(topLevelReplies));
    } catch (error) {
      console.error("Error loading replies:", error);
      toast.error("Failed to load replies");
    }
  };

  const handleCreateRequest = async () => {
    if (!userId) return;

    try {
      setSubmitting(true);
      
      const validated = requestSchema.parse({
        title: sanitizeInput(newTitle.trim()),
        description: sanitizeInput(newDescription.trim()),
        category: newCategory
      });

      const { error } = await supabase
        .from("support_requests")
        .insert({
          user_id: userId,
          title: validated.title,
          description: validated.description,
          category: validated.category,
          status: "open"
        });

      if (error) throw error;

      toast.success("Request created successfully");
      setCreateDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewCategory("");
      loadRequests();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error creating request:", error);
        toast.error("Failed to create request");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!userId || !selectedRequest) return;

    try {
      setSubmitting(true);
      
      const validated = replySchema.parse({
        content: sanitizeInput(replyContent.trim())
      });

      const { error } = await supabase
        .from("support_request_replies")
        .insert({
          request_id: selectedRequest.id,
          user_id: userId,
          content: validated.content,
          parent_reply_id: replyingToId
        });

      if (error) throw error;

      toast.success(replyingToId ? "Comment posted" : "Reply posted");
      setReplyContent("");
      setReplyingToId(null);
      loadReplies(selectedRequest.id);
      loadRequests(); // Refresh to update reply count
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error posting reply:", error);
        toast.error("Failed to post reply");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("support_requests")
        .update({ status: newStatus })
        .eq("id", requestId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Status updated");
      loadRequests();
      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from("support_request_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;

      toast.success("Reply deleted successfully");
      if (selectedRequest) {
        loadReplies(selectedRequest.id);
        loadRequests(); // Refresh to update reply count
      }
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast.error("Failed to delete reply");
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("support_requests")
        .delete()
        .eq("id", requestId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Support request deleted successfully");
      setDetailsOpen(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Error deleting support request:", error);
      toast.error("Failed to delete support request");
    }
  };


  const handleEditReply = async () => {
    if (!userId || !editingReply) return;

    try {
      setSubmitting(true);
      
      const validated = replySchema.parse({
        content: sanitizeInput(editingReply.content.trim())
      });

      const { error } = await supabase
        .from("support_request_replies")
        .update({ content: validated.content })
        .eq("id", editingReply.id)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Reply updated");
      setIsEditReplyDialogOpen(false);
      setEditingReply(null);
      if (selectedRequest) {
        loadReplies(selectedRequest.id);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error updating reply:", error);
        toast.error("Failed to update reply");
      }
    } finally {
      setSubmitting(false);
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in_progress":
        return <Clock className="h-4 w-4" />;
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "in_progress":
        return "bg-warning/10 text-warning border-warning/20";
      case "closed":
        return "bg-success/10 text-success border-success/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredRequests = requests.filter(request =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Support Requests">
        <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requests..."
                className="pl-10"
              />
            </div>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Support Request</DialogTitle>
                  <DialogDescription>
                    Post a request for help, support, or collaboration
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <div className="flex gap-2">
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Brief description of your request"
                        maxLength={200}
                        className="flex-1"
                      />
                      <EmojiPickerComponent
                        onEmojiSelect={(emoji) => setNewTitle(newTitle + emoji)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {newTitle.length}/200 characters
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <div className="relative">
                      <Textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Provide details about what you need help with..."
                        rows={6}
                        maxLength={5000}
                        className="pr-12"
                      />
                      <div className="absolute bottom-2 right-2">
                        <EmojiPickerComponent
                          onEmojiSelect={(emoji) => setNewDescription(newDescription + emoji)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {newDescription.length}/5000 characters
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRequest} disabled={submitting || !newCategory}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
      </Header>

      <main className="max-w-4xl mx-auto p-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No requests found</h2>
              <p className="text-muted-foreground mb-4">
                {requests.length === 0 
                  ? "Be the first to post a support request"
                  : "Try adjusting your filters or search"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover-lift cursor-pointer" onClick={() => {
                setSelectedRequest(request);
                setDetailsOpen(true);
              }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.profiles.profile_photo_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(request.profiles.full_name)}
                      </AvatarFallback>
                    </Avatar>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-start justify-between gap-2 mb-1">
                         <CardTitle className="text-base">{request.title}</CardTitle>
                         <Badge variant="outline" className={`${getStatusColor(request.status)} shrink-0`}>
                           {getStatusIcon(request.status)}
                           <span className="ml-1 capitalize">{request.status.replace('_', ' ')}</span>
                         </Badge>
                       </div>
                       <CardDescription className="text-sm">
                         {request.profiles.full_name} • {formatDate(request.created_at)}
                       </CardDescription>
                       {userId && request.user_id !== userId && (
                         <div className="mt-2">
                           <StartConversationButton
                             targetUserId={request.user_id}
                             currentUserId={userId}
                             variant="outline"
                             size="sm"
                           />
                         </div>
                       )}
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {request.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{request.category}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      <span>{request.reply_count || 0} {request.reply_count === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Request Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3 mb-2">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedRequest.profiles.profile_photo_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedRequest.profiles.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedRequest.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.profiles.full_name} • {formatDate(selectedRequest.created_at)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{selectedRequest.category}</Badge>
                      {selectedRequest.user_id === userId ? (
                        <Select 
                          value={selectedRequest.status} 
                          onValueChange={(val) => handleStatusChange(selectedRequest.id, val)}
                        >
                          <SelectTrigger className="w-[150px] h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={getStatusColor(selectedRequest.status)}>
                          {getStatusIcon(selectedRequest.status)}
                          <span className="ml-1 capitalize">{selectedRequest.status.replace('_', ' ')}</span>
                        </Badge>
                      )}
                      {(userId === selectedRequest.user_id || isAdmin) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Support Request</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this support request? This action cannot be undone and will also delete all replies.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRequest(selectedRequest.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4">
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <h3 className="font-semibold">Replies ({replies.length})</h3>
                
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No replies yet. Be the first to respond!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {replies.map((reply) => {
                      const renderReply = (reply: Reply, depth: number = 0) => (
                        <div key={reply.id} className={depth > 0 ? "ml-8 mt-3" : ""}>
                          <div className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reply.profiles.profile_photo_url || ""} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(reply.profiles.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted rounded-lg p-3">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{reply.profiles.full_name}</span>
                                  <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {userId === reply.user_id && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setEditingReply(reply);
                                        setIsEditReplyDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {(userId === reply.user_id || isAdmin) && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Reply</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this reply? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteReply(reply.id)}>
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 mt-2 text-xs"
                                onClick={() => {
                                  setReplyingToId(reply.id);
                                  document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="reply"]')?.focus();
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Reply
                              </Button>
                            </div>
                          </div>
                          {reply.nestedReplies && reply.nestedReplies.length > 0 && (
                            <div className="space-y-3">
                              {reply.nestedReplies.map(nestedReply => renderReply(nestedReply, depth + 1))}
                            </div>
                          )}
                        </div>
                      );
                      return renderReply(reply);
                    })}
                  </div>
                )}

                {replyingToId && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-lg mt-4">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Replying to a comment</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 ml-auto"
                      onClick={() => setReplyingToId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <div className="flex-1 relative">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write your reply..."
                      rows={3}
                      maxLength={2000}
                      className="pr-12"
                    />
                    <div className="absolute bottom-2 right-2">
                      <EmojiPickerComponent
                        onEmojiSelect={(emoji) => setReplyContent(replyContent + emoji)}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleReply} 
                    disabled={submitting || !replyContent.trim()}
                    size="icon"
                    className="shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Reply Dialog */}
      <Dialog open={isEditReplyDialogOpen} onOpenChange={setIsEditReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Textarea
                value={editingReply?.content || ""}
                onChange={(e) => setEditingReply(editingReply ? { ...editingReply, content: e.target.value } : null)}
                placeholder="Edit your reply..."
                rows={5}
                maxLength={2000}
                className="pr-12"
              />
              <div className="absolute bottom-2 right-2">
                <EmojiPickerComponent
                  onEmojiSelect={(emoji) => 
                    setEditingReply(editingReply ? { ...editingReply, content: editingReply.content + emoji } : null)
                  }
                />
              </div>
            </div>
            <Button 
              onClick={handleEditReply} 
              disabled={submitting || !editingReply?.content.trim()}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Reply"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SupportRequests;
