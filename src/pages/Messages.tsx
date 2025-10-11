import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { z } from "zod";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      
      const conversationId = searchParams.get("conversation");
      if (conversationId) {
        setSelectedConversation(conversationId);
      }
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
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId);
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
      
      // Validate message content
      const validated = messageSchema.parse({ content: newMessage.trim() });
      
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUserId,
          content: validated.content
        });

      if (error) throw error;

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
      loadConversations();
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
                  <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <UserMenu />
                  </div>
                </div>
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
                  {conversations
                    .filter(conv => 
                      conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((conv) => (
                    <Card
                      key={conv.id}
                      className="cursor-pointer hover-lift"
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conv.other_user.profile_photo_url || ""} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(conv.other_user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold">{conv.other_user.full_name}</h3>
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
                  ))}
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
                  className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      message.sender_id === currentUserId
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
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
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1"
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
              <div className="bg-muted p-3 border-b">
                <h2 className="font-semibold mb-3">Conversations</h2>
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
              conversations
                .filter(conv => 
                  conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-4 cursor-pointer border-b hover:bg-accent transition-colors ${
                        selectedConversation === conv.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.other_user.profile_photo_url || ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(conv.other_user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{conv.other_user.full_name}</h3>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.last_message.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
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
                        className={`flex ${message.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            message.sender_id === currentUserId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
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
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1"
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
