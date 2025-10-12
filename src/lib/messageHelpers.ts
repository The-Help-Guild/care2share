import { supabase } from "@/integrations/supabase/client";

export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

export const getUserByUsername = async (fullName: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .ilike('full_name', `%${fullName}%`)
    .limit(5);
  
  if (error) {
    console.error('Error searching users:', error);
    return [];
  }
  
  return data || [];
};

export const createMentionNotification = async (
  mentionedUserId: string,
  senderName: string,
  messageContent: string,
  conversationId: string
) => {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: mentionedUserId,
        type: 'mention',
        title: `${senderName} mentioned you`,
        message: messageContent.substring(0, 100),
        link: `/messages?conversation=${conversationId}`,
        metadata: { conversation_id: conversationId }
      });
  } catch (error) {
    console.error('Error creating mention notification:', error);
  }
};

export const saveMentions = async (
  messageId: string,
  mentionedUserIds: string[]
) => {
  try {
    const mentions = mentionedUserIds.map(userId => ({
      message_id: messageId,
      mentioned_user_id: userId
    }));

    await supabase
      .from('message_mentions')
      .insert(mentions);
  } catch (error) {
    console.error('Error saving mentions:', error);
  }
};

export const highlightMentions = (text: string): string => {
  return text.replace(
    /@(\w+)/g,
    '<span class="text-primary font-semibold">@$1</span>'
  );
};

export const createNewMessageNotification = async (
  recipientUserId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
) => {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: recipientUserId,
        type: 'new_message',
        title: `New message from ${senderName}`,
        message: messagePreview.substring(0, 100),
        link: `/messages?conversation=${conversationId}`,
        metadata: { conversation_id: conversationId }
      });
  } catch (error) {
    console.error('Error creating message notification:', error);
  }
};
