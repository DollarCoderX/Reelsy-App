/**
 * Friend requests and friendships — backed entirely by Supabase tables.
 * MongoDB is used only to look up user info (username → supabaseId, displayName, etc.)
 */
import { Router } from 'express';
import { getUsersCollection } from '../lib/mongodb';
import { getSupabaseClient, broadcastNotification } from '../lib/supabase';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function resolveUserId(username: string): Promise<string | null> {
  const usersCollection = await getUsersCollection();
  const user = await usersCollection.findOne({
    $or: [{ username }, { username: `@${username}` }],
  });
  if (!user) return null;
  return (user as any).supabaseId || user._id?.toString() || username;
}

async function resolveUserInfo(username: string): Promise<{ userId: string; displayName: string; avatar: string } | null> {
  const usersCollection = await getUsersCollection();
  const user = await usersCollection.findOne({
    $or: [{ username }, { username: `@${username}` }],
  });
  if (!user) return null;
  return {
    userId: (user as any).supabaseId || user._id?.toString() || username,
    displayName: (user as any).displayName || username,
    avatar: (user as any).profileImage || '',
  };
}

// ── POST /api/friends/request ─────────────────────────────────────────────────
router.post('/friends/request', async (req, res) => {
  try {
    const { fromUserId, fromUsername, fromDisplayName, fromAvatar, toUsername } = req.body;
    if (!fromUserId || !fromUsername || !toUsername) {
      return res.status(400).json({ error: 'fromUserId, fromUsername, toUsername required' });
    }

    const toInfo = await resolveUserInfo(toUsername);
    if (!toInfo) return res.status(404).json({ error: 'User not found' });
    const { userId: toUserId } = toInfo;

    if (fromUserId === toUserId || fromUsername === toUsername) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const sb = getSupabaseClient();

    // Check for existing pending request
    const { data: existing } = await sb
      .from('friend_requests')
      .select('id')
      .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Friend request already pending', requestId: existing.id });
    }

    // Check already friends
    const { data: friendship } = await sb
      .from('friends')
      .select('id')
      .or(`and(user_id.eq.${fromUserId},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${fromUserId})`)
      .maybeSingle();

    if (friendship) return res.status(409).json({ error: 'Already friends' });

    // Insert friend request
    const { data: request, error } = await sb
      .from('friend_requests')
      .insert({
        from_user_id: fromUserId,
        from_username: fromUsername,
        from_display_name: fromDisplayName || fromUsername,
        from_avatar: fromAvatar || null,
        to_user_id: toUserId,
        to_username: toUsername,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !request) {
      console.error('Failed to insert friend request:', error);
      return res.status(500).json({ error: 'Failed to send friend request' });
    }

    // Broadcast notification via Supabase Realtime
    const notif = {
      userId: toUserId,
      fromUserId,
      fromUsername,
      fromDisplayName: fromDisplayName || fromUsername,
      fromProfileImage: fromAvatar || null,
      type: 'friend_request',
      requestId: request.id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    broadcastNotification(notif).catch(() => {});

    return res.status(201).json({ requestId: request.id, message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ── PUT /api/friends/request/:id/accept ──────────────────────────────────────
router.put('/friends/request/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = getSupabaseClient();

    const { data: request } = await sb
      .from('friend_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.to_user_id !== userId) return res.status(403).json({ error: 'Not authorized' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    // Update status
    await sb.from('friend_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id);

    // Fetch display info for both sides from MongoDB
    const [fromInfo, toInfo] = await Promise.all([
      resolveUserInfo(request.from_username),
      resolveUserInfo(request.to_username),
    ]);

    // Bidirectional friendship rows in Supabase
    await sb.from('friends').insert([
      {
        user_id: request.from_user_id,
        friend_id: request.to_user_id,
        username: request.from_username,
        friend_username: request.to_username,
        friend_display_name: toInfo?.displayName || request.to_username,
        friend_avatar: toInfo?.avatar || null,
      },
      {
        user_id: request.to_user_id,
        friend_id: request.from_user_id,
        username: request.to_username,
        friend_username: request.from_username,
        friend_display_name: fromInfo?.displayName || request.from_username,
        friend_avatar: fromInfo?.avatar || null,
      },
    ]);

    // Notify original sender
    const notif = {
      userId: request.from_user_id,
      fromUserId: request.to_user_id,
      fromUsername: request.to_username,
      fromDisplayName: toInfo?.displayName || request.to_username,
      type: 'friend_accepted',
      requestId: id,
      read: false,
      createdAt: new Date().toISOString(),
    };
    broadcastNotification(notif).catch(() => {});

    return res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// ── PUT /api/friends/request/:id/decline ─────────────────────────────────────
router.put('/friends/request/:id/decline', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = getSupabaseClient();

    const { data: request } = await sb
      .from('friend_requests')
      .select('from_user_id, to_user_id')
      .eq('id', id)
      .maybeSingle();

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.to_user_id !== userId && request.from_user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await sb.from('friend_requests').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', id);

    return res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    return res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// ── GET /api/friends/requests/incoming?userId= ────────────────────────────────
router.get('/friends/requests/incoming', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = getSupabaseClient();
    const { data: requests } = await sb
      .from('friend_requests')
      .select('*')
      .eq('to_user_id', userId as string)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    // Map snake_case → camelCase for frontend compatibility
    const mapped = (requests || []).map((r: any) => ({
      _id: r.id,
      id: r.id,
      fromUserId: r.from_user_id,
      fromUsername: r.from_username,
      fromDisplayName: r.from_display_name,
      fromAvatar: r.from_avatar,
      toUserId: r.to_user_id,
      toUsername: r.to_username,
      status: r.status,
      createdAt: r.created_at,
    }));

    return res.json({ requests: mapped });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// ── GET /api/friends/requests/outgoing?userId= ────────────────────────────────
router.get('/friends/requests/outgoing', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const sb = getSupabaseClient();
    const { data: requests } = await sb
      .from('friend_requests')
      .select('*')
      .eq('from_user_id', userId as string)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    const mapped = (requests || []).map((r: any) => ({
      _id: r.id,
      id: r.id,
      fromUserId: r.from_user_id,
      fromUsername: r.from_username,
      fromDisplayName: r.from_display_name,
      fromAvatar: r.from_avatar,
      toUserId: r.to_user_id,
      toUsername: r.to_username,
      status: r.status,
      createdAt: r.created_at,
    }));

    return res.json({ requests: mapped });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch outgoing requests' });
  }
});

// ── GET /api/friends/status?fromUserId=&toUsername= ──────────────────────────
router.get('/friends/status', async (req, res) => {
  try {
    const { fromUserId, toUsername } = req.query;
    if (!fromUserId || !toUsername) {
      return res.status(400).json({ error: 'fromUserId and toUsername required' });
    }

    const toId = await resolveUserId(toUsername as string);
    if (!toId) return res.json({ status: 'not_found' });

    const sb = getSupabaseClient();

    // Check if already friends
    const { data: friendship } = await sb
      .from('friends')
      .select('id')
      .eq('user_id', fromUserId as string)
      .eq('friend_id', toId)
      .maybeSingle();

    if (friendship) return res.json({ status: 'friends' });

    // Check outgoing request
    const { data: outgoing } = await sb
      .from('friend_requests')
      .select('id')
      .eq('from_user_id', fromUserId as string)
      .eq('to_user_id', toId)
      .eq('status', 'pending')
      .maybeSingle();

    if (outgoing) return res.json({ status: 'request_sent', requestId: outgoing.id });

    // Check incoming request
    const { data: incoming } = await sb
      .from('friend_requests')
      .select('id')
      .eq('from_user_id', toId)
      .eq('to_user_id', fromUserId as string)
      .eq('status', 'pending')
      .maybeSingle();

    if (incoming) return res.json({ status: 'request_received', requestId: incoming.id });

    return res.json({ status: 'none' });
  } catch (error) {
    console.error('Error fetching friend status:', error);
    return res.status(500).json({ error: 'Failed to get friend status' });
  }
});

// ── GET /api/friends/:username ────────────────────────────────────────────────
router.get('/friends/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const userId = await resolveUserId(username);
    if (!userId) return res.status(404).json({ error: 'User not found' });

    const sb = getSupabaseClient();
    const { data: friendRows } = await sb
      .from('friends')
      .select('friend_username, friend_display_name, friend_avatar')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!friendRows || friendRows.length === 0) {
      return res.json({ friends: [], count: 0 });
    }

    // Enrich with full profile from MongoDB
    const usersCollection = await getUsersCollection();
    const usernames = friendRows.map((f: any) => f.friend_username);
    const profiles = await usersCollection
      .find({ username: { $in: usernames } })
      .project({ emailPassword: 0, strikes: 0, userEmail: 0 })
      .toArray();

    // Preserve order from Supabase
    const profileMap = new Map(profiles.map((p: any) => [p.username, p]));
    const friends = friendRows.map((f: any) => profileMap.get(f.friend_username) || {
      username: f.friend_username,
      displayName: f.friend_display_name,
      profileImage: f.friend_avatar,
    });

    return res.json({ friends, count: friends.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// ── DELETE /api/friends/:friendUsername?username= ─────────────────────────────
router.delete('/friends/:friendUsername', async (req, res) => {
  try {
    const { friendUsername } = req.params;
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });

    const [myId, theirId] = await Promise.all([
      resolveUserId(username as string),
      resolveUserId(friendUsername),
    ]);
    if (!myId || !theirId) return res.status(404).json({ error: 'User not found' });

    const sb = getSupabaseClient();
    // Delete both directions
    await Promise.all([
      sb.from('friends').delete().eq('user_id', myId).eq('friend_id', theirId),
      sb.from('friends').delete().eq('user_id', theirId).eq('friend_id', myId),
    ]);

    return res.json({ message: 'Unfriended successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to unfriend' });
  }
});

export default router;
