import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Ban, Flag } from "lucide-react";
import { toast } from "sonner";

interface BlockReportMenuProps {
  userId: string;
  onBlock?: () => void;
}

const userIdSchema = z.string().uuid("Invalid user ID");

export const BlockReportMenu = ({ userId, onBlock }: BlockReportMenuProps) => {
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleBlock = async () => {
    try {
      // Validate user ID
      const validatedUserId = userIdSchema.parse(userId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("blocked_users")
        .insert({
          blocker_user_id: session.user.id,
          blocked_user_id: validatedUserId
        });

      if (error) throw error;

      toast.success("User blocked successfully");
      setShowBlockDialog(false);
      onBlock?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error("Invalid user ID");
      } else if (error.message?.includes("duplicate")) {
        toast.error("User is already blocked");
      } else {
        toast.error("Failed to block user");
      }
    }
  };

  const handleReport = () => {
    // In a production app, this would submit a report to admins
    toast.success("User reported. Our team will review this report.");
    setShowReportDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowBlockDialog(true)}
          >
            <Ban className="h-4 w-4 mr-2" />
            Block User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
            <Flag className="h-4 w-4 mr-2" />
            Report User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will no longer be able to send you messages or see your profile.
              You can unblock them later from your settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this user?</AlertDialogTitle>
            <AlertDialogDescription>
              Your report will be reviewed by our moderation team. Provide as much detail as possible about the issue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReport}>
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
