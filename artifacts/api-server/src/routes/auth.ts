import { Router } from 'express';
import { sendOTP, verifyOTP } from '../lib/otp';

const router = Router();

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

export default router;
