import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StartConversationButtonProps {
  targetUserId: string;
  currentUserId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export const StartConversationButton = ({
  targetUserId,
  currentUserId,
  variant = "default",
  size = "default",
  className = "",
  children
}: StartConversationButtonProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleStartConversation = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!targetUserId || !currentUserId || targetUserId === currentUserId) return;

    try {
      setLoading(true);

      // Rate limit check
      const { checkRateLimit } = await import('@/lib/rateLimit');
      const rateLimitCheck = await checkRateLimit(currentUserId, 'conversation');
      if (!rateLimitCheck.allowed) {
        toast.error(`You've created too many conversations. Please wait ${Math.ceil((rateLimitCheck.remainingTime || 3600) / 60)} minutes.`);
        return;
      }

      // Use the database function to start or get existing conversation
      const { data: conversationId, error } = await supabase
        .rpc('start_conversation', { target_user: targetUserId });

      if (error) throw error;

      toast.success("Conversation started!");
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleStartConversation}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <MessageCircle className="h-4 w-4 mr-2" />
          {children || "Message"}
        </>
      )}
    </Button>
  );
};
