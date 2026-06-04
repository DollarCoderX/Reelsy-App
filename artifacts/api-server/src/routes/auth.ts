import { Router, Request, Response } from 'express';
import { sendOTP, verifyOTP } from '../lib/otp';
import { hashPassword, verifyPassword, generateToken, generateUniqueUsername, generateBaseUsername, findAvailableUsername } from '../lib/auth-utils';
import { getUsersCollection, ReelsyUser } from '../lib/mongodb';
import { createSupabaseUser, getSupabaseUser, updateSupabaseUser, initSupabase, checkSupabaseUserStatus, banUserViaAdmin, unbanUserViaAdmin } from '../lib/supabase';
import { isSuspiciousEmail, addStrike, sendSuspensionReviewEmail } from '../lib/suspension';

const router = Router();

let supabaseInitialized = false;

// Lazy initialize Supabase on first request
const ensureSupabaseInitialized = async () => {
  if (!supabaseInitialized) {
    await initSupabase();
    supabaseInitialized = true;
  }
};

// Endpoint to request an OTP
router.post('/send-otp', async (req, res) => {
  try {
    await ensureSupabaseInitialized();
    
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Disposable / temporary email protection (server-side)
    const normalized = email.trim().toLowerCase();
    const domain = normalized.split('@')[1] || '';

    // Simple allow/deny detection using a small deny list + heuristics.
    // This is intentionally lightweight (no external deps) for now.
    const disposableDomains = new Set([
      'mailinator.com',
      '10minutemail.com',
      '10minutemail.net',
      'guerrillamail.com',
      'guerrillamail.net',
      'tempmail.com',
      'temp-mail.org',
      'getairmail.com',
      'throwawaymail.com',
      'yopmail.com',
      'yopmail.net',
      'spamgourmet.com',
      'maildrop.cc',
      'trashmail.com',
      'guerrilla-mail.com',
    ]);

    const looksTemporary =
      domain &&
      (disposableDomains.has(domain) ||
        domain.includes('mailinator') ||
        domain.includes('10minutemail') ||
        domain.includes('guerrillamail') ||
        domain.includes('yopmail') ||
        domain.includes('tempmail'));

    if (looksTemporary) {
      return res.status(403).json({
        error: 'TEMP_EMAIL_BLOCKED',
        message: `Sorry, you can’t use a temporary email from ${domain} to sign up. It against our TOS.`,
        domain,
      });
    }

    await sendOTP(normalized);
    return res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    req.log.error(error, 'Error sending OTP');
    // Handle rate limit errors from sendOTP
    const msg = error && (error as Error).message;
    if (typeof msg === 'string' && msg.startsWith('RATE_LIMIT_COOLDOWN:')) {
      const parts = msg.split(':');
      const minutes = Number(parts[1]) || null;
      return res.status(429).json({ error: 'RATE_LIMIT_COOLDOWN', cooldownMinutes: minutes, message: `Too many OTP requests. Try again in ${minutes} minute(s).` });
    }

    if (typeof msg === 'string' && msg === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: 'OTP request limit reached. Please try again later.' });
    }

    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Endpoint to verify an OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    
    const isValid = verifyOTP(email, code);
    
    if (isValid) {
      return res.status(200).json({ message: 'OTP verified successfully' });
    } else {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
  } catch (error) {
    req.log.error(error, 'Error verifying OTP');
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Endpoint to register with email and password
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      displayName,
      username: rawUsername,
      age,
      interests,
      profileImage,
    } = req.body;

    if (!email || !password || !displayName || typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
      return res.status(400).json({ error: 'Email, password, and displayName are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const usersCollection = await getUsersCollection();

    // Check if email already exists
    const existingEmail = await usersCollection.findOne({ userEmail: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Normalize and validate username if provided
    let username = rawUsername && typeof rawUsername === 'string' ? rawUsername.trim().replace(/^@/, '') : '';
    if (username) {
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-24 characters and contain only letters, numbers, or underscores' });
      }
      const existingUsername = await usersCollection.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      username = username.toLowerCase();
    }

    // Check for suspicious email domain
    const emailCheck = isSuspiciousEmail(email);

    // Generate unique username if one was not provided
    if (!username) {
      const baseUsername = generateUniqueUsername(displayName);
      username = await findAvailableUsername(baseUsername, usersCollection);
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Build MongoDB user record
    const mongoUser: ReelsyUser = {
      userEmail: email.toLowerCase(),
      emailPassword: hashedPassword,
      username,
      displayName,
      authProvider: 'email',
      age: typeof age === 'number' ? age : undefined,
      interests: Array.isArray(interests) ? interests.filter((item) => typeof item === 'string') : undefined,
      profileImage: typeof profileImage === 'string' ? profileImage : undefined,
      strikeCount: emailCheck.suspicious ? 1 : 0,
      strikes: emailCheck.suspicious ? [{
        type: emailCheck.reason || 'suspicious_email',
        timestamp: new Date(),
        details: `Suspicious email domain detected: ${emailCheck.reason}`,
      }] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mongoResult = await usersCollection.insertOne(mongoUser);

    // Generate token
    const token = generateToken({ userId: mongoResult.insertedId, username, email });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: mongoResult.insertedId,
        username,
        displayName,
        email,
        age: mongoUser.age,
        interests: mongoUser.interests,
        profileImage: mongoUser.profileImage,
      },
      token,
    });
  } catch (error) {
    req.log.error(error, 'Error registering user');
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Email sign-in endpoint
router.post('/signin-email', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ userEmail: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'EMAIL_NOT_REGISTERED', message: 'This email is not registered' });
    }

    if (!user.emailPassword) {
      return res.status(401).json({ error: 'INVALID_AUTH_METHOD', message: 'This account uses Google Sign-In' });
    }

    const passwordMatch = verifyPassword(password, user.emailPassword);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'INVALID_PASSWORD', message: 'Incorrect password' });
    }

    const token = generateToken({ userId: user._id, username: user.username, email: user.userEmail });

    return res.json({
      message: 'Sign-in successful',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.userEmail,
        age: user.age,
        profileImage: user.profileImage,
        interests: user.interests,
      },
      token,
    });
  } catch (error) {
    req.log.error(error, 'Error signing in with email');
    return res.status(500).json({ error: 'Sign-in failed' });
  }
});

// Google OAuth - register or login
router.post('/signin-google', async (req, res) => {
  try {
    const { accessToken, displayName, birthday, age: providedAge, location, profileImage } = req.body;

    if (!accessToken || !displayName) {
      return res.status(400).json({ error: 'Supabase access token and displayName are required' });
    }

    // Decode JWT token
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    let supabaseUser: any;
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      supabaseUser = {
        id: payload.sub,
        email: payload.email,
      };
    } catch (decodeErr) {
      return res.status(401).json({ error: 'Failed to decode token' });
    }

    if (!supabaseUser.email) {
      return res.status(400).json({ error: 'Email not available from Google account' });
    }

    const email = supabaseUser.email;
    const usersCollection = await getUsersCollection();

    // Check if user exists
    const existingUser = await usersCollection.findOne({ userEmail: email.toLowerCase() });

    if (existingUser) {
      // Login - update profile image if provided
      let profileImageToReturn = existingUser.profileImage;
      if (profileImage && profileImage !== existingUser.profileImage) {
        await usersCollection.updateOne(
          { userEmail: email.toLowerCase() },
          { $set: { profileImage, updatedAt: new Date() } }
        );
        profileImageToReturn = profileImage;
      }

      const token = generateToken({ userId: existingUser._id, username: existingUser.username, email });
      return res.json({
        message: 'Login successful',
        user: {
          id: existingUser._id,
          username: existingUser.username,
          displayName: existingUser.displayName,
          email,
          age: existingUser.age,
          tier: existingUser.tier || 'free',
          profileImage: profileImageToReturn,
          supabaseId: supabaseUser.id,
          isBanned: existingUser.isBanned || false,
          banReason: existingUser.banReason,
          bannedAt: existingUser.bannedAt,
          bannedUntil: existingUser.bannedUntil,
          isSuspended: existingUser.isSuspended || false,
          suspensionReason: existingUser.suspensionReason,
          suspensionDetails: existingUser.suspensionDetails,
        },
        token,
      });
    }

    // Keep the Google display-name username when it is available; only change it when MongoDB has a collision.
    const baseUsername = generateBaseUsername(displayName) || generateUniqueUsername(displayName);
    const username = await findAvailableUsername(baseUsername, usersCollection);

    let age: number | undefined = typeof providedAge === 'number' ? providedAge : undefined;
    if (age === undefined && birthday) {
      const birthDate = new Date(birthday);
      if (!Number.isNaN(birthDate.getTime())) {
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
    }

    // Create MongoDB user with Google auth (no password)
    const mongoUser: ReelsyUser = {
      userEmail: email.toLowerCase(),
      username,
      displayName,
      age,
      profileImage: profileImage || undefined,
      interests: location ? [location] : [],
      supabaseId: supabaseUser.id,
      authProvider: 'google',
      isBanned: false,
      banReason: undefined,
      bannedAt: undefined,
      bannedUntil: undefined,
      strikeCount: 0,
      strikes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mongoResult = await usersCollection.insertOne(mongoUser);

    // Generate token
    const token = generateToken({ userId: mongoResult.insertedId, username, email });

    return res.status(201).json({
      message: 'Google registration successful',
      user: {
        id: mongoResult.insertedId,
        username,
        displayName,
        email,
        age,
        tier: 'free',
        profileImage: profileImage || undefined,
        supabaseId: supabaseUser.id,
        isBanned: mongoUser.isBanned || false,
        banReason: mongoUser.banReason,
        bannedAt: mongoUser.bannedAt,
        bannedUntil: mongoUser.bannedUntil,
        isSuspended: mongoUser.isSuspended || false,
        suspensionReason: mongoUser.suspensionReason,
        suspensionDetails: mongoUser.suspensionDetails,
      },
      token,
    });
  } catch (error) {
    req.log.error(error, 'Error registering with Google');
    return res.status(500).json({
      error: 'Google registration failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Endpoint to update user profile
router.post('/profile/update', async (req, res) => {
  try {
    const { username, displayName, profileImage, age, interests } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const cleanUsername = username.replace(/^@/, '');
    const usersCollection = await getUsersCollection();

    const updateData: any = { updatedAt: new Date() };
    if (displayName) updateData.displayName = displayName;
    if (profileImage) updateData.profileImage = profileImage;
    if (age !== undefined) updateData.age = age;
    if (interests && Array.isArray(interests)) updateData.interests = interests;

    const result = await usersCollection.updateOne(
      { username: cleanUsername },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    req.log.error(error, 'Error updating profile');
    return res.status(500).json({ error: 'Profile update failed' });
  }
});

// Endpoint to update user tier
router.post('/tier/update', async (req, res) => {
  try {
    const { username, tier } = req.body;

    if (!username || !tier) {
      return res.status(400).json({ error: 'Username and tier are required' });
    }

    const validTiers = ['free', 'premium', 'premium+', 'gold', 'verified'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const result = await updateSupabaseUser(username, { tier });

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'Tier updated successfully' });
  } catch (error) {
    req.log.error(error, 'Error updating tier');
    return res.status(500).json({ error: 'Tier update failed' });
  }
});

// Endpoint to get user profile
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.replace(/^@/, '');

    const usersCollection = await getUsersCollection();
    const mongoUser = await usersCollection.findOne({ username: cleanUsername });

    if (!mongoUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUser = await getSupabaseUser(username);

    const isBanned = !!((mongoUser as any).banned || mongoUser.isBanned);

    return res.status(200).json({
      id: mongoUser._id,
      username: mongoUser.username,
      displayName: mongoUser.displayName,
      email: mongoUser.userEmail,
      profileImage: mongoUser.profileImage,
      age: mongoUser.age,
      interests: mongoUser.interests,
      tier: supabaseUser?.tier || 'free',
      isSuspended: mongoUser.isSuspended || false,
      suspensionReason: mongoUser.suspensionReason,
      suspensionDetails: mongoUser.suspensionDetails,
      isBanned,
      banReason: mongoUser.banReason || null,
      bannedAt: mongoUser.bannedAt || null,
      bannedUntil: mongoUser.bannedUntil || null,
      createdAt: mongoUser.createdAt,
      updatedAt: mongoUser.updatedAt,
    });
  } catch (error) {
    req.log.error(error, 'Error fetching profile');
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Check if user account is suspended
router.get('/check-suspension/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      isSuspended: user.isSuspended || false,
      suspensionReason: user.suspensionReason,
      suspensionDetails: user.suspensionDetails,
      suspendedAt: user.suspendedAt,
    });
  } catch (error) {
    req.log.error(error, 'Error checking suspension');
    return res.status(500).json({ error: 'Failed to check suspension' });
  }
});

// Submit suspension review with telemetry
router.post('/suspension-review', async (req, res) => {
  try {
    const { username, email, telemetry } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    // Collect telemetry data
    const reviewData = {
      username,
      email,
      submittedAt: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket?.remoteAddress,
      timezone: telemetry?.timezone || 'unknown',
      locale: telemetry?.locale || 'unknown',
      platform: telemetry?.platform || 'unknown',
      screenResolution: telemetry?.screenResolution,
      deviceMemory: telemetry?.deviceMemory,
      deviceCores: telemetry?.deviceCores,
      connectionType: telemetry?.connectionType,
      // Additional 20+ fields from telemetry
      ...telemetry,
    };

    // Send review request to admin email
    const emailSent = await sendSuspensionReviewEmail(email, username, reviewData);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send review request' });
    }

    return res.status(200).json({
      message: 'Review request submitted. Our team will investigate.',
      submittedAt: new Date(),
    });
  } catch (error) {
    req.log.error(error, 'Error submitting suspension review');
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Check Supabase account status (ban/disable status)
router.get('/check-supabase-status', async (req, res) => {
  try {
    const { supabaseId } = req.query;

    if (!supabaseId || typeof supabaseId !== 'string') {
      return res.status(400).json({ error: 'supabaseId is required' });
    }

    // Check if user is disabled on Supabase
    const status = await checkSupabaseUserStatus(supabaseId);

    return res.status(200).json({
      isDisabled: status.isDisabled,
      reason: status.reason,
      bannedUntil: status.bannedUntil,
    });
  } catch (error) {
    req.log.error(error, 'Error checking Supabase status');
    return res.status(500).json({ error: 'Failed to check account status' });
  }
});

/**
 * Ban a user (Admin operation)
 * Uses Supabase Admin API to ban user and revoke all sessions
 * Updates both Supabase and MongoDB
 */
router.post('/admin/ban-user', async (req: Request, res: Response) => {
  try {
    const { supabaseUserId, username, banReason = 'Violation of Community Guidelines', banDurationHours = 87600 } = req.body;

    // TODO: Add proper admin authentication check
    // For now, this endpoint requires the supabaseUserId parameter
    if (!supabaseUserId && !username) {
      return res.status(400).json({ error: 'supabaseUserId or username is required' });
    }

    // If username provided, find the user first
    let userId = supabaseUserId;
    if (!userId && username) {
      const usersCollection = await getUsersCollection();
      const user = await usersCollection.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = user.supabaseId;
    }

    // Ban the user
    const result = await banUserViaAdmin(userId, null, banReason, banDurationHours);

    if (!result.success) {
      return res.status(500).json({ error: result.message, details: result.error });
    }

    return res.json({
      banReason: banReason,
      bannedUntil: new Date(Date.now() + banDurationHours * 3600000).toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return res.status(500).json({ error: 'Failed to ban user' });
  }
});

/**
 * Unban a user (Admin operation)
 * Uses Supabase Admin API to clear ban and updates MongoDB
 */
router.post('/admin/unban-user', async (req: Request, res: Response) => {
  try {
    const { supabaseUserId, username } = req.body;

    // TODO: Add proper admin authentication check
    if (!supabaseUserId && !username) {
      return res.status(400).json({ error: 'supabaseUserId or username is required' });
    }

    // If username provided, find the user first
    let userId = supabaseUserId;
    if (!userId && username) {
      const usersCollection = await getUsersCollection();
      const user = await usersCollection.findOne({ username });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = user.supabaseId;
    }

    // Unban the user
    const result = await unbanUserViaAdmin(userId, null);

    if (!result.success) {
      return res.status(500).json({ error: result.message, details: result.error });
    }

    return res.json(result);
  } catch (error) {
    console.error('Unban user error:', error);
    return res.status(500).json({ error: 'Failed to unban user' });
  }
});

/**
 * Get ban status for a user
 */
router.get('/ban-status/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isBanned = !!((user as any).banned || user.isBanned);

    return res.json({
      username: user.username,
      isBanned,
      banReason: user.banReason || null,
      bannedAt: user.bannedAt || null,
      bannedUntil: user.bannedUntil || null,
      isSuspended: user.isSuspended || false,
      suspensionReason: user.suspensionReason || null,
    });
  } catch (error) {
    console.error('Get ban status error:', error);
    return res.status(500).json({ error: 'Failed to get ban status' });
  }
});

// Simple MongoDB ban endpoint (no Supabase required)
router.post('/ban-simple', async (req, res) => {
  try {
    const { username, banReason = 'Banned by admin', banDurationHours = 24 } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const usersCollection = await getUsersCollection();
    const bannedUntil = new Date(Date.now() + banDurationHours * 60 * 60 * 1000);

    const result = await usersCollection.updateOne(
      { username },
      {
        $set: {
          isBanned: true,
          banReason,
          bannedAt: new Date(),
          bannedUntil,
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ BANNED: ${username} until ${bannedUntil}`);
    return res.json({ 
      message: 'User banned successfully',
      username,
      banReason,
      bannedUntil,
    });
  } catch (error) {
    console.error('Ban error:', error);
    return res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Simple MongoDB unban endpoint
router.post('/unban-simple', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const usersCollection = await getUsersCollection();

    const result = await usersCollection.updateOne(
      { username },
      {
        $unset: {
          isBanned: "",
          banReason: "",
          bannedAt: "",
          bannedUntil: "",
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ UNBANNED: ${username}`);
    return res.json({ 
      message: 'User unbanned successfully',
      username,
    });
  } catch (error) {
    console.error('Unban error:', error);
    return res.status(500).json({ error: 'Failed to unban user' });
  }
});

export default router;
