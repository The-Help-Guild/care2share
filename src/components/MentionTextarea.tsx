import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserByUsername } from "@/lib/messageHelpers";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (userId: string, userName: string) => void;
  placeholder?: string;
  rows?: number;
}

interface UserSuggestion {
  id: string;
  full_name: string;
  profile_photo_url?: string | null;
}

export const MentionTextarea = ({
  value,
  onChange,
  onMentionSelect,
  placeholder,
  rows = 4
}: MentionTextareaProps) => {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const checkForMention = async () => {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
        
        // Check if we're still in a mention (no spaces after @)
        if (!textAfterAt.includes(' ') && textAfterAt.length > 0) {
          setMentionStart(lastAtSymbol);
          const users = await getUserByUsername(textAfterAt);
          setSuggestions(users);
          setShowSuggestions(users.length > 0);
          setSelectedIndex(0);
        } else if (textAfterAt.length === 0) {
          setMentionStart(lastAtSymbol);
          setSuggestions([]);
          setShowSuggestions(false);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    };

    checkForMention();
  }, [value]);

  const handleSelectSuggestion = (user: UserSuggestion) => {
    if (mentionStart === -1) return;

    const before = value.substring(0, mentionStart);
    const after = value.substring(textareaRef.current?.selectionStart || value.length);
    const newValue = `${before}@${user.full_name} ${after}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    if (onMentionSelect) {
      onMentionSelect(user.id, user.full_name);
    }

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = before.length + user.full_name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && selectedIndex >= 0 && !e.shiftKey) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
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

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 max-h-48 overflow-auto z-50">
          <div className="p-1">
            {suggestions.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                  index === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectSuggestion(user)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profile_photo_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.full_name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
