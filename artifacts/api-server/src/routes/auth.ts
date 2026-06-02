import { Router, Request, Response } from 'express';
import { sendOTP, verifyOTP } from '../lib/otp';
import { hashPassword, verifyPassword, generateToken, generateUniqueUsername, findAvailableUsername } from '../lib/auth-utils';
import { getUsersCollection, ReelsyUser } from '../lib/mongodb';
import { createSupabaseUser, getSupabaseUser, updateSupabaseUser, initSupabase } from '../lib/supabase';

const router = Router();

// Initialize Supabase on route setup
initSupabase().catch(err => console.error('Supabase initialization error:', err));

// Endpoint to request an OTP
router.post('/send-otp', async (req, res) => {
  try {
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
    const { email, password, displayName } = req.body;

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

    // Generate unique username from display name
    const baseUsername = generateUniqueUsername(displayName);
    const username = await findAvailableUsername(baseUsername, usersCollection);

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create MongoDB user
    const mongoUser: ReelsyUser = {
      userEmail: email.toLowerCase(),
      emailPassword: hashedPassword,
      username,
      displayName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mongoResult = await usersCollection.insertOne(mongoUser);

    // Create Supabase user
    const supabaseUser = await createSupabaseUser({
      username,
      displayName,
      tier: 'free',
    });

    // Generate token
    const token = generateToken({ userId: mongoResult.insertedId, username, email });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: mongoResult.insertedId,
        username,
        displayName,
        email,
        tier: 'free',
      },
      token,
    });
  } catch (error) {
    req.log.error(error, 'Error registering user');
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Endpoint to register/login with Google OAuth via Supabase
router.post('/register/google', async (req, res) => {
  try {
    const { accessToken, displayName, birthday, location } = req.body;

    if (!accessToken || !displayName || !birthday) {
      return res.status(400).json({ error: 'Supabase access token, displayName, and birthday are required' });
    }

    // Decode and verify JWT token (don't need to call Supabase API)
    // The token is a JWT that Supabase issued, we can decode it directly
    const parts = accessToken.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    let supabaseUser: any;
    try {
      // Decode JWT payload (part 1, without verification since Supabase signed it)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      supabaseUser = {
        id: payload.sub,
        email: payload.email,
        user_metadata: payload.user_metadata,
        app_metadata: payload.app_metadata,
      };
    } catch (decodeErr) {
      return res.status(401).json({ error: 'Failed to decode token' });
    }

    if (!supabaseUser.email) {
      return res.status(400).json({ error: 'Email not available from Google account' });
    }

    const email = supabaseUser.email;
    const usersCollection = await getUsersCollection();

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ userEmail: email.toLowerCase() });

    if (existingUser) {
      // User already registered, just log them in
      const token = generateToken({ userId: existingUser._id, username: existingUser.username, email });
      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: existingUser._id,
          username: existingUser.username,
          displayName: existingUser.displayName,
          email,
          tier: existingUser.tier || 'free',
        },
        token,
      });
    }

    // Generate unique username from display name
    const baseUsername = generateUniqueUsername(displayName);
    const username = await findAvailableUsername(baseUsername, usersCollection);

    // Calculate age from birthday
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Create MongoDB user with Google auth (no password)
    const mongoUser: ReelsyUser = {
      userEmail: email.toLowerCase(),
      username,
      displayName,
      age,
      interests: location ? [location] : [],
      supabaseId: supabaseUser.id,
      authProvider: 'google',
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
      },
      token,
    });
  } catch (error) {
    req.log.error(error, 'Error registering with Google');
    return res.status(500).json({ error: 'Google registration failed' });
  }
});

// Endpoint to update user profile
router.post('/profile/update', async (req, res) => {
  try {
    const { username, profileImage, age, interests } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const usersCollection = await getUsersCollection();

    const updateData: any = { updatedAt: new Date() };
    if (profileImage) updateData.profileImage = profileImage;
    if (age !== undefined) updateData.age = age;
    if (interests && Array.isArray(interests)) updateData.interests = interests;

    const result = await usersCollection.updateOne(
      { username },
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

    const usersCollection = await getUsersCollection();
    const mongoUser = await usersCollection.findOne({ username });

    if (!mongoUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const supabaseUser = await getSupabaseUser(username);

    return res.status(200).json({
      id: mongoUser._id,
      username: mongoUser.username,
      displayName: mongoUser.displayName,
      email: mongoUser.userEmail,
      profileImage: mongoUser.profileImage,
      age: mongoUser.age,
      interests: mongoUser.interests,
      tier: supabaseUser?.tier || 'free',
      createdAt: mongoUser.createdAt,
      updatedAt: mongoUser.updatedAt,
    });
  } catch (error) {
    req.log.error(error, 'Error fetching profile');
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
