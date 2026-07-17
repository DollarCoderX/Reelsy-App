import { Router } from 'express';

async function generateHelpResponse(userMessage: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return "Hi! I'm the Reelsy Help Center 🐋. I can help with account issues, how-to questions, and app features. (AI responses require GROQ_API_KEY to be configured.)";
  }
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are Whales, the Reelsy Help Center assistant 🐋. Reelsy is a social media app with posts, reels, stories, direct messages, notifications, and friend requests. 
You help users with:
- Account setup, login, and profile issues
- How to post, comment, like, share
- Privacy settings and messaging policies  
- Friend requests and notifications
- App features and troubleshooting

Be friendly, concise (2-3 sentences max), and helpful. Use occasional emojis. If you don't know something specific, direct them to support@reelsy.app.`,
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });
    const j = await r.json() as any;
    return j.choices?.[0]?.message?.content?.trim() || "I'm here to help! Could you tell me more about your issue? 🐋";
  } catch {
    return "I'm here to help with anything Reelsy-related! 🐋 Could you be more specific about what you need?";
  }
}
import { initSupabase } from '../lib/supabase';

const router = Router();

// Helper: get or initialise Supabase client
async function getSupabase() {
  return initSupabase();
}

// Ensure Supabase tables exist (called once at startup)
export async function ensureMessagingTables() {
  try {
    const sb = await getSupabase();
    // conversations table
    await sb.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          last_message_at TIMESTAMPTZ,
          last_message_preview TEXT
        );

        CREATE TABLE IF NOT EXISTS conversation_participants (
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT,
          avatar_url TEXT,
          joined_at TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY (conversation_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id TEXT NOT NULL,
          sender_username TEXT NOT NULL,
          sender_avatar TEXT,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          created_at TIMESTAMPTZ DEFAULT now(),
          read_by TEXT[] DEFAULT '{}'
        );

        CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages(conversation_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS participants_user_idx ON conversation_participants(user_id);

        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
      `,
    }).catch(() => {
      // rpc may not exist — try direct SQL instead, ignore errors
    });
    console.log('Messaging tables ready');
  } catch (_) {
    // Tables may already exist or RPC unavailable — non-fatal
  }
}

// POST /api/messages/conversations — get-or-create a DM between two users
router.post('/messages/conversations', async (req, res) => {
  try {
    const { myUserId, myUsername, myDisplayName, myAvatar, otherUserId, otherUsername, otherDisplayName, otherAvatar } = req.body;
    if (!myUserId || !otherUserId) {
      return res.status(400).json({ error: 'myUserId and otherUserId required' });
    }

    // Check if target user has friends-only chat policy (fail-closed: deny if policy check throws)
    const { getUsersCollection } = await import('../lib/mongodb');
    const usersCollection = await getUsersCollection();
    const targetUser = await usersCollection.findOne({ username: otherUsername });
    // Check messaging policy: only block if explicitly set to 'friends-only'
    // Default to 'everyone' — friendPolicy does NOT restrict messaging unless messagingPolicy is set
    const msgPolicy: string = (targetUser as any).messagingPolicy || 'everyone';
    if (targetUser && msgPolicy === 'friends-only') {
      // Target requires friends-only messaging — verify friendship
      const { getMongoDBCollection } = await import('../lib/mongodb');
      const friendsCollection = await getMongoDBCollection('friends');
      const areFriends = await friendsCollection.findOne({
        $or: [
          { userId: myUserId, friendId: otherUserId },
          { userId: otherUserId, friendId: myUserId },
        ],
      });
      if (!areFriends) {
        return res.status(403).json({
          error: 'This user only accepts messages from friends',
          code: 'FRIENDS_ONLY',
        });
      }
    }

    const sb = await getSupabase();

    // Find existing DM conversation between these two
    const { data: myConvs } = await sb
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', myUserId);

    const { data: theirConvs } = await sb
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId);

    const myIds = (myConvs || []).map((r: any) => r.conversation_id);
    const theirIds = (theirConvs || []).map((r: any) => r.conversation_id);
    const shared = myIds.filter((id: string) => theirIds.includes(id));

    if (shared.length > 0) {
      // Return existing conversation
      const { data: conv } = await sb
        .from('conversations')
        .select('*')
        .eq('id', shared[0])
        .single();
      return res.json({ conversation: conv, existing: true });
    }

    // Create new conversation
    const { data: conv, error: convErr } = await sb
      .from('conversations')
      .insert({ last_message_at: new Date().toISOString() })
      .select()
      .single();

    if (convErr || !conv) {
      console.error('Failed to create conversation:', convErr);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Add both participants
    await sb.from('conversation_participants').insert([
      {
        conversation_id: conv.id,
        user_id: myUserId,
        username: myUsername,
        display_name: myDisplayName || myUsername,
        avatar_url: myAvatar,
      },
      {
        conversation_id: conv.id,
        user_id: otherUserId,
        username: otherUsername,
        display_name: otherDisplayName || otherUsername,
        avatar_url: otherAvatar,
      },
    ]);

    return res.status(201).json({ conversation: conv, existing: false });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/messages/conversations?userId=
router.get('/messages/conversations', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = await getSupabase();

    // Get all conversation IDs for user
    const { data: participantRows } = await sb
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId as string);

    if (!participantRows || participantRows.length === 0) {
      return res.json({ conversations: [] });
    }

    const convIds = participantRows.map((r: any) => r.conversation_id);

    // Fetch conversations
    const { data: convs } = await sb
      .from('conversations')
      .select('*')
      .in('id', convIds)
      .order('last_message_at', { ascending: false });

    // Fetch all participants for these convs (to get other user info)
    const { data: allParticipants } = await sb
      .from('conversation_participants')
      .select('*')
      .in('conversation_id', convIds)
      .neq('user_id', userId as string);

    // Fetch unread counts
    const enriched = await Promise.all(
      (convs || []).map(async (conv: any) => {
        const otherParticipant = (allParticipants || []).find(
          (p: any) => p.conversation_id === conv.id
        );

        const { count: unreadCount } = await sb
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .not('read_by', 'cs', `{"${userId}"}`);

        return {
          ...conv,
          otherUser: otherParticipant || null,
          unreadCount: unreadCount || 0,
        };
      })
    );

    return res.json({ conversations: enriched });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/messages/conversations/:id/send — send a message
router.post('/messages/conversations/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { senderId, senderUsername, senderAvatar, content, messageType = 'text' } = req.body;
    if (!senderId || !senderUsername || !content) {
      return res.status(400).json({ error: 'senderId, senderUsername, content required' });
    }

    const sb = await getSupabase();

    const { data: msg, error } = await sb
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: senderId,
        sender_username: senderUsername,
        sender_avatar: senderAvatar,
        content,
        message_type: messageType,
        read_by: [senderId],
      })
      .select()
      .single();

    if (error || !msg) {
      console.error('Failed to send message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Update conversation last_message
    await sb
      .from('conversations')
      .update({
        last_message_at: msg.created_at,
        last_message_preview: content.slice(0, 80),
        updated_at: msg.created_at,
      })
      .eq('id', id);

    // ── Whales Help Center auto-response ──────────────────────────────────────
    // Run after the response so the user gets an immediate ack
    setImmediate(async () => {
      try {
        const { data: parts } = await sb
          .from('conversation_participants')
          .select('user_id, username')
          .eq('conversation_id', id);
        const whalesP = (parts || []).find((p: any) => p.username === 'whales');
        if (!whalesP || senderId === whalesP.user_id) return;

        await new Promise((r) => setTimeout(r, 1400));

        const aiReply = await generateHelpResponse(content);

        const { data: reply } = await sb.from('messages').insert({
          conversation_id: id,
          sender_id: whalesP.user_id,
          sender_username: 'whales',
          sender_avatar: null,
          content: aiReply,
          message_type: 'text',
          read_by: [whalesP.user_id],
        }).select().single();

        if (reply) {
          await sb.from('conversations').update({
            last_message_at: reply.created_at,
            last_message_preview: aiReply.slice(0, 80),
          }).eq('id', id);
        }
      } catch (e) { /* non-fatal */ }
    });

    return res.status(201).json({ message: msg });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/conversations/:id/messages?limit=&before=
router.get('/messages/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 40, 100);
    const before = req.query.before as string | undefined;

    const sb = await getSupabase();

    let query = sb
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    return res.json({ messages: (messages || []).reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/messages/conversations/:id/read?userId=
router.put('/messages/conversations/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = await getSupabase();

    // Append userId to read_by for all messages not yet read by this user
    const { data: unread } = await sb
      .from('messages')
      .select('id, read_by')
      .eq('conversation_id', id)
      .not('read_by', 'cs', `{"${userId}"}`);

    if (unread && unread.length > 0) {
      for (const msg of unread) {
        await sb
          .from('messages')
          .update({ read_by: [...(msg.read_by || []), userId] })
          .eq('id', msg.id);
      }
    }

    return res.json({ marked: unread?.length || 0 });
  } catch (error) {
    console.error('Error marking messages read:', error);
    return res.status(500).json({ error: 'Failed to mark messages read' });
  }
});

export default router;
