import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Users, 
  Ban, 
  Trash2, 
  Activity, 
  ArrowLeft,
  Loader2,
  UserCog,
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

interface User {
  id: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  block_reason: string | null;
  created_at: string;
}

interface AdminAction {
  id: string;
  action_type: string;
  details: any;
  created_at: string;
  admin_id: string;
  target_user_id: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  photo_url?: string | null;
  youtube_url?: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface SupportRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface SupportReply {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  request_id: string;
  support_requests?: {
    title: string;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

type ActivityItem = 
  | { type: 'admin_action'; data: AdminAction }
  | { type: 'post'; data: Post }
  | { type: 'support_request'; data: SupportRequest }
  | { type: 'support_reply'; data: SupportReply };

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading, userId: currentAdminId } = useAdmin();
  
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dialog states
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/home");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAllActivities();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_photo_url, is_blocked, blocked_at, block_reason, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllActivities = async () => {
    try {
      const [adminActionsRes, postsRes, supportReqsRes, supportRepliesRes] = await Promise.all([
        supabase.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('posts').select('id, title, content, created_at, user_id, photo_url, youtube_url').order('created_at', { ascending: false }).limit(50),
        supabase.from('support_requests').select('id, title, description, category, status, created_at, user_id').order('created_at', { ascending: false }).limit(50),
        supabase.from('support_request_replies').select('id, content, created_at, user_id, request_id').order('created_at', { ascending: false }).limit(50),
      ]);

      const adminActionsData = adminActionsRes.data || [];
      const postsData = postsRes.data || [];
      const supportRequestsData = supportReqsRes.data || [];
      const supportRepliesData = supportRepliesRes.data || [];

      // Build a user map to avoid joins
      const userIds = new Set<string>();
      postsData.forEach((p: any) => userIds.add(p.user_id));
      supportRequestsData.forEach((s: any) => userIds.add(s.user_id));
      supportRepliesData.forEach((r: any) => userIds.add(r.user_id));

      let profilesMap = new Map<string, { full_name: string; email: string }>();
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(userIds));
        profilesData?.forEach((p: any) => {
          profilesMap.set(p.id, { full_name: p.full_name, email: p.email });
        });
      }

      // Build a map of support request titles for replies
      const requestIds = new Set<string>();
      supportRepliesData.forEach((r: any) => requestIds.add(r.request_id));
      let requestTitleMap = new Map<string, string>();
      if (requestIds.size > 0) {
        const { data: reqData } = await supabase
          .from('support_requests')
          .select('id, title')
          .in('id', Array.from(requestIds));
        reqData?.forEach((r: any) => requestTitleMap.set(r.id, r.title));
      }

      // Combine all activities
      const combined: ActivityItem[] = [
        ...(adminActionsData.map((a: any) => ({ type: 'admin_action' as const, data: a })) || []),
        ...(postsData.map((p: any) => ({
          type: 'post' as const,
          data: { ...p, profiles: profilesMap.get(p.user_id) || null },
        })) || []),
        ...(supportRequestsData.map((s: any) => ({
          type: 'support_request' as const,
          data: { ...s, profiles: profilesMap.get(s.user_id) || null },
        })) || []),
        ...(supportRepliesData.map((r: any) => ({
          type: 'support_reply' as const,
          data: {
            ...r,
            profiles: profilesMap.get(r.user_id) || null,
            support_requests: { title: requestTitleMap.get(r.request_id) || '' },
          },
        })) || []),
      ];

      // Sort by created_at
      combined.sort(
        (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime(),
      );

      setActivities(combined);
    } catch (error: any) {
      console.error('Failed to load activities:', error);
      toast.error('Failed to load activity log');
    }
  };

  const logAdminAction = async (actionType: string, targetUserId: string | null, details: any) => {
    try {
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: currentAdminId,
          action_type: actionType,
          target_user_id: targetUserId,
          details: details
        });
    } catch (error) {
      console.error("Failed to log admin action:", error);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser || !blockReason.trim()) {
      toast.error("Please provide a reason for blocking");
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('block-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: selectedUser.id,
          reason: blockReason,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`User ${selectedUser.full_name} has been blocked`);
      setBlockDialogOpen(false);
      setBlockReason("");
      setSelectedUser(null);
      loadUsers();
      loadAllActivities();
    } catch (error: any) {
      toast.error(error.message || "Failed to block user");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async (user: User) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('unblock-user', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          userId: user.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`User ${user.full_name} has been unblocked`);
      loadUsers();
      loadAllActivities();
    } catch (error: any) {
      toast.error("Failed to unblock user");
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      // Call the delete-account edge function
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: selectedUser.id }
      });

      if (error) throw error;

      await logAdminAction('DELETE_USER', selectedUser.id, {
        user_email: selectedUser.email,
        user_name: selectedUser.full_name
      });

      toast.success(`User account deleted successfully`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
      loadAllActivities();
    } catch (error: any) {
      toast.error("Failed to delete user account");
      console.error(error);
    } finally {
      setActionLoading(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const handleDeleteActivity = async (activity: ActivityItem) => {
    setActionLoading(true);
    try {
      if (activity.type === 'post') {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', activity.data.id);
        if (error) throw error;
        toast.success('Post deleted');
      } else if (activity.type === 'support_request') {
        const { error } = await supabase
          .from('support_requests')
          .delete()
          .eq('id', activity.data.id);
        if (error) throw error;
        toast.success('Support request deleted');
      } else if (activity.type === 'support_reply') {
        const { error } = await supabase
          .from('support_request_replies')
          .delete()
          .eq('id', activity.data.id);
        if (error) throw error;
        toast.success('Support reply deleted');
      }
      
      await logAdminAction(
        `DELETE_${activity.type.toUpperCase()}`, 
        activity.type === 'post' || activity.type === 'support_request' || activity.type === 'support_reply' 
          ? activity.data.user_id 
          : null,
        { item_id: activity.data.id }
      );
      
      setActivityDialogOpen(false);
      setSelectedActivity(null);
      loadAllActivities();
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast.error('Failed to delete item');
    } finally {
      setActionLoading(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const renderActivityContent = (activity: ActivityItem) => {
    if (activity.type === 'post') {
      const post = activity.data as Post;
      return (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>
          </div>
          {post.photo_url && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={post.photo_url} 
                alt="Post" 
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}
          {post.youtube_url && (() => {
            const videoId = extractYoutubeId(post.youtube_url);
            return videoId ? (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : null;
          })()}
          <div className="text-sm text-muted-foreground">
            <p>Author: {post.profiles?.full_name || 'Unknown'}</p>
            <p>Posted: {formatDate(post.created_at)}</p>
          </div>
        </div>
      );
    } else if (activity.type === 'support_request') {
      const request = activity.data as SupportRequest;
      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{request.title}</h3>
              <Badge variant={request.status === 'open' ? 'default' : 'secondary'}>
                {request.status}
              </Badge>
            </div>
            <Badge variant="outline" className="mb-3">{request.category}</Badge>
            <p className="text-muted-foreground whitespace-pre-wrap">{request.description}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Submitted by: {request.profiles?.full_name || 'Unknown'}</p>
            <p>Created: {formatDate(request.created_at)}</p>
          </div>
        </div>
      );
    } else if (activity.type === 'support_reply') {
      const reply = activity.data as SupportReply;
      return (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Reply to: {reply.support_requests?.title || 'Support Request'}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">{reply.content}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Author: {reply.profiles?.full_name || 'Unknown'}</p>
            <p>Posted: {formatDate(reply.created_at)}</p>
          </div>
        </div>
      );
    } else if (activity.type === 'admin_action') {
      const action = activity.data as AdminAction;
      return (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{action.action_type}</h3>
            <pre className="text-sm text-muted-foreground bg-muted p-3 rounded-md overflow-auto">
              {JSON.stringify(action.details, null, 2)}
            </pre>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Action performed: {formatDate(action.created_at)}</p>
          </div>
        </div>
      );
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const stats = {
    totalUsers: users.length,
    blockedUsers: users.filter(u => u.is_blocked).length,
    activeUsers: users.filter(u => !u.is_blocked).length,
    recentActions: activities.length
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-primary flex-1">Admin Panel</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>
              <Ban className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.blockedUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Manage user accounts, block users, or delete accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile_photo_url || ''} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(user.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {user.is_blocked ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Blocked
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.is_blocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnblockUser(user)}
                                disabled={actionLoading}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBlockDialogOpen(true);
                                }}
                                disabled={actionLoading}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Block
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  All system activity including posts, support requests, and admin actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity, index) => (
                      <TableRow 
                        key={`${activity.type}-${activity.data.id}-${index}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedActivity(activity);
                          setActivityDialogOpen(true);
                        }}
                      >
                        <TableCell>
                          <Badge variant="outline">
                            {activity.type === 'admin_action' && 'Admin Action'}
                            {activity.type === 'post' && 'Post'}
                            {activity.type === 'support_request' && 'Support Request'}
                            {activity.type === 'support_reply' && 'Support Reply'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          {activity.type === 'admin_action' && (
                            <div className="text-sm">
                              <div className="font-medium">
                                {activity.data.action_type.replace(/_/g, ' ')}
                              </div>
                              {activity.data.details?.user_email && (
                                <span className="text-muted-foreground">
                                  User: {activity.data.details.user_email}
                                </span>
                              )}
                            </div>
                          )}
                          {activity.type === 'post' && (
                            <div className="text-sm">
                              <div className="font-medium line-clamp-1">
                                {activity.data.title}
                              </div>
                              <div className="text-muted-foreground line-clamp-2">
                                {activity.data.content}
                              </div>
                            </div>
                          )}
                          {activity.type === 'support_request' && (
                            <div className="text-sm">
                              <div className="font-medium line-clamp-1">
                                {activity.data.title}
                              </div>
                              <div className="text-muted-foreground">
                                Category: {activity.data.category} • Status: {activity.data.status}
                              </div>
                            </div>
                          )}
                          {activity.type === 'support_reply' && (
                            <div className="text-sm">
                              <div className="text-muted-foreground line-clamp-2">
                                Reply to: {activity.data.support_requests?.title}
                              </div>
                              <div className="line-clamp-2">
                                {activity.data.content}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {activity.type !== 'admin_action' && activity.data.profiles?.full_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(activity.data.created_at)}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedActivity(activity);
                                setActivityDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {activity.type !== 'admin_action' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteActivity(activity);
                                }}
                                disabled={actionLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Block User Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Block {selectedUser?.full_name}? They will no longer be able to access their account or appear in searches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="blockReason">Reason for blocking *</Label>
              <Textarea
                id="blockReason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter the reason for blocking this user..."
                rows={3}
                required
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={!blockReason.trim() || actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selectedUser?.full_name}'s account? This action cannot be undone. 
              All user data, messages, and content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Detail Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedActivity?.type === 'post' && 'Post Details'}
              {selectedActivity?.type === 'support_request' && 'Support Request Details'}
              {selectedActivity?.type === 'support_reply' && 'Support Reply Details'}
              {selectedActivity?.type === 'admin_action' && 'Admin Action Details'}
            </DialogTitle>
            <DialogDescription>
              View full details and manage this item
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedActivity && renderActivityContent(selectedActivity)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
              Close
            </Button>
            {selectedActivity && selectedActivity.type !== 'admin_action' && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteActivity(selectedActivity)}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
