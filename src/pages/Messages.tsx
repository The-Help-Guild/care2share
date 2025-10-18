import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, ArrowLeft, Loader2, Search as SearchIcon, AtSign, Mail, Reply, X } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MentionInput } from "@/components/MentionInput";
import { extractMentions, createMentionNotification, saveMentions, createNewMessageNotification } from "@/lib/messageHelpers";
import { z } from "zod";
import DOMPurify from "dompurify";
import { EmojiPickerComponent } from "@/components/EmojiPicker";

const messageSchema = z.object({
  content: z.string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message too long (max 5000 characters)")
});

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  reply_to_id?: string | null;
  replied_message?: {
    id: string;
    content: string;
    sender_id: string;
    sender_name?: string;
  } | null;
}

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [messageFilter, setMessageFilter] = useState<"all" | "direct" | "mentions">("all");
  const [conversationsWithMentions, setConversationsWithMentions] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
      loadMentionedConversations();
      
      const conversationId = searchParams.get("conversation");
      if (conversationId) {
        setSelectedConversation(conversationId);
      }

      // Subscribe to mention changes for real-time updates
      const mentionChannel = supabase
        .channel('mention-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_mentions',
            filter: `mentioned_user_id=eq.${currentUserId}`
          },
          () => {
            loadMentionedConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(mentionChannel);
      };
    }
  }, [currentUserId, searchParams]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      
      // Subscribe to new messages in real-time
      const messageChannel = supabase
        .channel(`messages-${selectedConversation}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${selectedConversation}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        )
        .subscribe();

      // Subscribe to typing indicators
      const typingChannel = supabase
        .channel(`typing-${selectedConversation}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'typing_indicators',
            filter: `conversation_id=eq.${selectedConversation}`
          },
          async () => {
            // Check if other user is typing
            const { data } = await supabase
              .from('typing_indicators')
              .select('user_id')
              .eq('conversation_id', selectedConversation)
              .neq('user_id', currentUserId)
              .gte('created_at', new Date(Date.now() - 10000).toISOString());
            
            setOtherUserTyping(data && data.length > 0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(typingChannel);
      };
    }
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the message briefly
      element.style.backgroundColor = "var(--accent)";
      setTimeout(() => {
        element.style.backgroundColor = "";
      }, 2000);
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const loadMentionedConversations = async () => {
    if (!currentUserId) return;
    
    try {
      // Get all UNREAD messages where user is mentioned
      const { data: mentions } = await supabase
        .from('message_mentions')
        .select('message_id')
        .eq('mentioned_user_id', currentUserId)
        .eq('read', false);

      if (!mentions || mentions.length === 0) {
        setConversationsWithMentions(new Set());
        return;
      }

      // Get conversation IDs for these messages
      const messageIds = mentions.map(m => m.message_id);
      const { data: messages } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('id', messageIds);

      if (messages) {
        const convIds = new Set(messages.map(m => m.conversation_id));
        setConversationsWithMentions(convIds);
      }
    } catch (error) {
      console.error('Error loading mentioned conversations:', error);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Get user's conversation IDs
      const { data: participantData } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (!participantData || participantData.length === 0) {
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get conversations with other participants
      const conversationsWithUsers = await Promise.all(
        conversationIds.map(async (convId) => {
          // Get other participant
          const { data: otherParticipant } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", convId)
            .neq("user_id", currentUserId)
            .single();

          if (!otherParticipant) return null;

          // Get other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .eq("id", otherParticipant.user_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", convId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get conversation updated_at
          const { data: conv } = await supabase
            .from("conversations")
            .select("updated_at")
            .eq("id", convId)
            .single();

          return {
            id: convId,
            updated_at: conv?.updated_at || new Date().toISOString(),
            other_user: profile,
            last_message: lastMessage || undefined
          };
        })
      );

      const validConversations = (conversationsWithUsers.filter(c => c !== null && c.other_user !== null) as Conversation[])
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setConversations(validConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Enrich messages with replied message data
      const enrichedMessages = await Promise.all(
        (data || []).map(async (msg: any) => {
          if (msg.reply_to_id) {
            const { data: repliedMsg } = await supabase
              .from("messages")
              .select("id, content, sender_id")
              .eq("id", msg.reply_to_id)
              .single();

            if (repliedMsg) {
              const { data: senderProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", repliedMsg.sender_id)
                .single();

              return {
                ...msg,
                replied_message: {
                  ...repliedMsg,
                  sender_name: senderProfile?.full_name || "Unknown"
                }
              };
            }
          }
          return msg;
        })
      );

      setMessages(enrichedMessages);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId);

      // Mark mentions in this conversation as read
      if (currentUserId) {
        const messageIds = data?.map((m: any) => m.id) || [];
        
        if (messageIds.length > 0) {
          const { error: mentionError } = await supabase
            .from('message_mentions')
            .update({ read: true })
            .in('message_id', messageIds)
            .eq('mentioned_user_id', currentUserId)
            .eq('read', false);

          if (mentionError) {
            console.error("Error marking mentions as read:", mentionError);
          }
          
          // Force reload mention indicators
          await loadMentionedConversations();
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    try {
      setSending(true);
      
      // Server-side rate limiting check
      const { checkRateLimit } = await import('@/lib/rateLimit');
      const rateLimitCheck = await checkRateLimit(currentUserId, 'message');
      if (!rateLimitCheck.allowed) {
        toast.error(`Rate limit exceeded. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 60) / 60)} minute(s) before sending more messages.`);
        setSending(false);
        return;
      }
      
      // Validate and sanitize message content
      const sanitizedContent = DOMPurify.sanitize(newMessage.trim(), { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [] 
      });
      const validated = messageSchema.parse({ content: sanitizedContent });
      
      const { data: messageData, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUserId,
          content: validated.content,
          reply_to_id: replyingTo?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Handle mentions
      if (mentionedUserIds.length > 0 && messageData) {
        await saveMentions(messageData.id, mentionedUserIds);
        
        // Get sender's name
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        // Create notifications for mentioned users
        for (const userId of mentionedUserIds) {
          await createMentionNotification(
            userId,
            senderProfile?.full_name || 'Someone',
            validated.content,
            selectedConversation
          );
        }
      }

      // Notify other participants about new message
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', selectedConversation)
        .neq('user_id', currentUserId);

      if (otherParticipants) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', currentUserId)
          .single();

        for (const participant of otherParticipants) {
          await createNewMessageNotification(
            participant.user_id,
            senderProfile?.full_name || 'Someone',
            validated.content,
            selectedConversation
          );
        }
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation);

      // Clear typing indicator
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', selectedConversation)
        .eq('user_id', currentUserId);

      setNewMessage("");
      setMentionedUserIds([]);
      setReplyingTo(null);
      
      // Update the conversation list locally without reloading
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === selectedConversation) {
            return {
              ...conv,
              updated_at: new Date().toISOString(),
              last_message: {
                content: validated.content,
                created_at: new Date().toISOString()
              }
            };
          }
          return conv;
        });
        // Sort by updated_at to move this conversation to the top
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
      }
    } finally {
      setSending(false);
    }
  };

  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!selectedConversation || !currentUserId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing indicator
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: selectedConversation,
          user_id: currentUserId,
          created_at: new Date().toISOString()
        });
    }

    // Clear typing indicator after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', selectedConversation)
        .eq('user_id', currentUserId);
    }, 3000);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const getFilteredConversations = () => {
    let filtered = conversations.filter(conv =>
      conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (messageFilter === "mentions") {
      filtered = filtered.filter(conv => conversationsWithMentions.has(conv.id));
    }
    // "direct" and "all" show the same conversations (all are direct messages)
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Mobile view */}
      <div className="md:hidden">
        {!selectedConversation ? (
          <>
            <header className="bg-card border-b">
              <div className="max-w-4xl mx-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-2xl font-bold text-primary">Messages</h1>
                  <div className="flex items-center gap-2">
                    <NotificationCenter />
                    <ThemeToggle />
                    <UserMenu />
                  </div>
                </div>
                <Tabs value={messageFilter} onValueChange={(v) => setMessageFilter(v as any)} className="w-full mb-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      All
                    </TabsTrigger>
                    <TabsTrigger value="direct" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Direct
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="flex items-center gap-2">
                      <AtSign className="h-4 w-4" />
                      Mentions
                      {conversationsWithMentions.size > 0 && (
                        <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conversationsWithMentions.size}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-10"
                  />
                </div>
              </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
              {conversations.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2">No conversations yet</h2>
                    <p className="text-muted-foreground">
                      Start a conversation by contacting someone from search
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {getFilteredConversations().map((conv) => {
                    const hasMentions = conversationsWithMentions.has(conv.id);
                    return (
                      <Card
                        key={conv.id}
                        className={`cursor-pointer hover-lift ${
                          hasMentions ? 'border-primary/50 bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedConversation(conv.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={conv.other_user.profile_photo_url || ""} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(conv.other_user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              {hasMentions && (
                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                                  <AtSign className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{conv.other_user.full_name}</h3>
                                {hasMentions && (
                                  <Badge variant="secondary" className="text-xs">
                                    <AtSign className="h-3 w-3 mr-1" />
                                    Mentioned you
                                  </Badge>
                                )}
                              </div>
                              {conv.last_message && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {conv.last_message.content}
                                </p>
                              )}
                            </div>
                            {conv.last_message && (
                              <span className="text-xs text-muted-foreground">
                                {formatTime(conv.last_message.created_at)}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </main>
          </>
        ) : (
          <>
            <header className="bg-card border-b sticky top-0 z-10">
              <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {conversations.find(c => c.id === selectedConversation) && (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarImage 
                        src={conversations.find(c => c.id === selectedConversation)?.other_user.profile_photo_url || ""} 
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(conversations.find(c => c.id === selectedConversation)!.other_user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="font-semibold">
                      {conversations.find(c => c.id === selectedConversation)?.other_user.full_name}
                    </h2>
                  </>
                )}
              </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  ref={(el) => messageRefs.current[message.id] = el}
                  className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className="flex items-start gap-2 max-w-[70%]">
                    {message.sender_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleReply(message)}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        message.sender_id === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.replied_message && (
                        <div
                          onClick={() => scrollToMessage(message.reply_to_id!)}
                          className={`mb-2 p-2 rounded-lg border-l-2 cursor-pointer ${
                            message.sender_id === currentUserId
                              ? 'bg-primary-foreground/10 border-primary-foreground/30'
                              : 'bg-accent border-primary/30'
                          }`}
                        >
                          <p className={`text-xs font-semibold mb-1 ${
                            message.sender_id === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {message.replied_message.sender_name}
                          </p>
                          <p className={`text-xs line-clamp-2 ${
                            message.sender_id === currentUserId ? 'text-primary-foreground/60' : 'text-muted-foreground/80'
                          }`}>
                            {message.replied_message.content}
                          </p>
                        </div>
                      )}
                      <p 
                        className="text-sm" 
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(
                            message.content.replace(
                              /@(\w+)/g,
                              '<span class="font-semibold">@$1</span>'
                            ),
                            { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] }
                          )
                        }}
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-xs ${
                          message.sender_id === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                        {message.sender_id === currentUserId && message.read && (
                          <span className="text-xs text-primary-foreground/70">✓✓</span>
                        )}
                      </div>
                    </div>
                    {message.sender_id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleReply(message)}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </main>

             <div className="fixed bottom-16 left-0 right-0 bg-card border-t p-4">
               <div className="max-w-4xl mx-auto">
                 {replyingTo && (
                   <div className="mb-2 p-2 bg-accent rounded-lg flex items-start justify-between">
                     <div className="flex-1">
                       <p className="text-xs font-semibold text-muted-foreground mb-1">
                         Replying to {replyingTo.sender_id === currentUserId ? 'yourself' : conversations.find(c => c.id === selectedConversation)?.other_user.full_name}
                       </p>
                       <p className="text-sm line-clamp-1">{replyingTo.content}</p>
                     </div>
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-6 w-6"
                       onClick={() => setReplyingTo(null)}
                     >
                       <X className="h-3 w-3" />
                     </Button>
                   </div>
                 )}
                 <div className="flex gap-2">
                   <MentionInput
                     value={newMessage}
                     onChange={(value) => {
                       setNewMessage(value);
                       handleTyping({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
                     }}
                     onMentionSelect={(userId) => {
                       setMentionedUserIds(prev => [...new Set([...prev, userId])]);
                     }}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey && !sending) {
                         e.preventDefault();
                         handleSendMessage();
                       }
                     }}
                     placeholder="Type a message... (use @ to mention)"
                     disabled={sending}
                   />
                   <Button
                     onClick={handleSendMessage}
                     disabled={!newMessage.trim() || sending}
                     size="icon"
                   >
                     {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                   </Button>
                 </div>
               </div>
             </div>
          </>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden md:block">
        <header className="bg-card border-b">
          <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Messages</h1>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-140px)]">
            {/* Conversations list */}
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <div className="bg-muted p-3 border-b space-y-3">
                <h2 className="font-semibold">Conversations</h2>
                <Tabs value={messageFilter} onValueChange={(v) => setMessageFilter(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="flex items-center gap-1 text-xs">
                      <MessageCircle className="h-3 w-3" />
                      All
                    </TabsTrigger>
                    <TabsTrigger value="direct" className="flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3" />
                      Direct
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="flex items-center gap-1 text-xs">
                      <AtSign className="h-3 w-3" />
                      Mentions
                      {conversationsWithMentions.size > 0 && (
                        <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                          {conversationsWithMentions.size}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
            ) : (
              getFilteredConversations().map((conv) => {
                const hasMentions = conversationsWithMentions.has(conv.id);
                return (
                    <div
                      key={conv.id}
                      className={`p-4 cursor-pointer border-b transition-colors ${
                        selectedConversation === conv.id 
                          ? 'bg-accent' 
                          : hasMentions 
                          ? 'bg-primary/5 hover:bg-primary/10' 
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.other_user.profile_photo_url || ""} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(conv.other_user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {hasMentions && (
                            <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                              <AtSign className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-sm">{conv.other_user.full_name}</h3>
                            {hasMentions && (
                              <AtSign className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>

            {/* Messages area */}
            <div className="col-span-2 border rounded-lg overflow-hidden flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="bg-muted p-3 border-b flex items-center gap-3">
                    {conversations.find(c => c.id === selectedConversation) && (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={conversations.find(c => c.id === selectedConversation)?.other_user.profile_photo_url || ""} 
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(conversations.find(c => c.id === selectedConversation)!.other_user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <h2 className="font-semibold">
                          {conversations.find(c => c.id === selectedConversation)?.other_user.full_name}
                        </h2>
                      </>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        ref={(el) => messageRefs.current[message.id] = el}
                        className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className="flex items-start gap-2 max-w-[70%]">
                          {message.sender_id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleReply(message)}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              message.sender_id === currentUserId
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.replied_message && (
                              <div
                                onClick={() => scrollToMessage(message.reply_to_id!)}
                                className={`mb-2 p-2 rounded-lg border-l-2 cursor-pointer ${
                                  message.sender_id === currentUserId
                                    ? 'bg-primary-foreground/10 border-primary-foreground/30'
                                    : 'bg-accent border-primary/30'
                                }`}
                              >
                                <p className={`text-xs font-semibold mb-1 ${
                                  message.sender_id === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}>
                                  {message.replied_message.sender_name}
                                </p>
                                <p className={`text-xs line-clamp-2 ${
                                  message.sender_id === currentUserId ? 'text-primary-foreground/60' : 'text-muted-foreground/80'
                                }`}>
                                  {message.replied_message.content}
                                </p>
                              </div>
                            )}
                            <p 
                              className="text-sm" 
                              dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(
                                  message.content.replace(
                                    /@(\w+)/g,
                                    '<span class="font-semibold">@$1</span>'
                                  ),
                                  { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] }
                                )
                              }}
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <p className={`text-xs ${
                                message.sender_id === currentUserId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {formatTime(message.created_at)}
                              </p>
                              {message.sender_id === currentUserId && message.read && (
                                <span className="text-xs text-primary-foreground/70">✓✓</span>
                              )}
                            </div>
                          </div>
                          {message.sender_id === currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleReply(message)}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {otherUserTyping && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t p-4">
                    {replyingTo && (
                      <div className="mb-2 p-2 bg-accent rounded-lg flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Replying to {replyingTo.sender_id === currentUserId ? 'yourself' : conversations.find(c => c.id === selectedConversation)?.other_user.full_name}
                          </p>
                          <p className="text-sm line-clamp-1">{replyingTo.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setReplyingTo(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <MentionInput
                        value={newMessage}
                        onChange={(value) => {
                          setNewMessage(value);
                          handleTyping({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
                        }}
                        onMentionSelect={(userId) => {
                          setMentionedUserIds(prev => [...new Set([...prev, userId])]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !sending) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Type a message... (use @ to mention)"
                        disabled={sending}
                      />
                      <EmojiPickerComponent
                        onEmojiSelect={(emoji) => setNewMessage(newMessage + emoji)}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default Messages;
