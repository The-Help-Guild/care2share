import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface MentionTextProps {
  text: string;
  className?: string;
}

interface UserMention {
  name: string;
  userId: string | null;
}

export const MentionText = ({ text, className = "" }: MentionTextProps) => {
  const navigate = useNavigate();
  const [mentions, setMentions] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Extract all @mentions from the text
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
    const mentionNames = new Set<string>();
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentionNames.add(match[1]);
    }

    if (mentionNames.size > 0) {
      // Fetch user IDs for all mentioned names
      const fetchUserIds = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("full_name", Array.from(mentionNames));

        if (data) {
          const mentionMap = new Map<string, string>();
          data.forEach((profile) => {
            mentionMap.set(profile.full_name, profile.id);
          });
          setMentions(mentionMap);
        }
      };

      fetchUserIds();
    }
  }, [text]);

  const renderTextWithMentions = () => {
    const parts: JSX.Element[] = [];
    const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)*)/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1];
      const userId = mentions.get(mentionName);

      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add mention
      if (userId) {
        parts.push(
          <span
            key={`mention-${key++}`}
            className="text-primary font-medium cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${userId}`);
            }}
          >
            @{mentionName}
          </span>
        );
      } else {
        parts.push(
          <span key={`mention-${key++}`} className="text-muted-foreground">
            @{mentionName}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : text;
  };

  return <div className={className}>{renderTextWithMentions()}</div>;
};
