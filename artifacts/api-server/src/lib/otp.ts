import { sendEmailViaBrevo } from './email';

interface OTPRecord {
  code: string;
  expiresAt: number;
}
const otpStore = new Map<string, OTPRecord>();

interface RateLimitRecord {
  attempts: number;
  lastRequestAt: number;
  cooldownUntil?: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_OTP_ATTEMPTS = 5;
const COOLDOWN_DURATION = 30 * 60 * 1000; // 30 minutes

function checkRateLimit(email: string): { allowed: boolean; remainingAttempts?: number; cooldownMinutes?: number } {
  const normalizedEmail = email.toLowerCase();
  const rateLimit = rateLimitStore.get(normalizedEmail);
  const now = Date.now();

  if (!rateLimit) {
    return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS };
  }

  if (rateLimit.cooldownUntil && now < rateLimit.cooldownUntil) {
    const cooldownMinutes = Math.ceil((rateLimit.cooldownUntil - now) / 60000);
    return { allowed: false, cooldownMinutes };
  }

  if (rateLimit.cooldownUntil && now >= rateLimit.cooldownUntil) {
    rateLimitStore.delete(normalizedEmail);
    return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS };
  }

  if (rateLimit.attempts >= MAX_OTP_ATTEMPTS) {
    const cooldownUntil = rateLimit.lastRequestAt + COOLDOWN_DURATION;
    rateLimit.cooldownUntil = cooldownUntil;
    rateLimitStore.set(normalizedEmail, rateLimit);
    const cooldownMinutes = Math.ceil((cooldownUntil - now) / 60000);
    return { allowed: false, cooldownMinutes };
  }

  const remainingAttempts = MAX_OTP_ATTEMPTS - rateLimit.attempts;
  return { allowed: true, remainingAttempts };
}

function updateRateLimit(email: string): void {
  const normalizedEmail = email.toLowerCase();
  const existing = rateLimitStore.get(normalizedEmail);
  if (existing) {
    existing.attempts += 1;
    existing.lastRequestAt = Date.now();
  } else {
    rateLimitStore.set(normalizedEmail, { attempts: 1, lastRequestAt: Date.now() });
  }
}

function generateAlphanumericCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function sendOTP(email: string): Promise<void> {
  try {
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      if (rateCheck.cooldownMinutes) {
        throw new Error(`RATE_LIMIT_COOLDOWN:${rateCheck.cooldownMinutes}`);
      }
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    const code = generateAlphanumericCode(6);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email.toLowerCase(), { code, expiresAt });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reelsy Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Roboto', sans-serif; background-color: #f8f9fa;">
  <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 540px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="height: 220px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative; overflow: hidden;">
              <div style="position: relative; z-index: 1; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <div style="font-size: 56px; margin-bottom: 12px;">🎬</div>
                <h1 style="margin: 0; font-size: 32px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">Reelsy</h1>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #667eea; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">VERIFICATION CODE</p>
              <h2 style="margin: 0 0 24px 0; font-size: 24px; color: #1a1a1a; font-weight: 600; line-height: 1.3;">Your Reelsy Code</h2>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #555; line-height: 1.7;">Enter the code below to verify your account. Valid for <strong>10 minutes</strong>.</p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
                <p style="margin: 0 0 16px 0; font-size: 11px; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Your Code</p>
                <div style="font-size: 48px; letter-spacing: 6px; color: #ffffff; font-weight: 800; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.1); padding: 20px; border-radius: 8px;">${code}</div>
              </div>
              <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.6;">If you didn't request this code, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #999;">© 2026 Reelsy Inc. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await sendEmailViaBrevo(email, `Your Reelsy Code: ${code}`, htmlContent);
    updateRateLimit(email);
  } catch (error) {
    throw error;
  }
}

export function verifyOTP(email: string, code: string): boolean {
  const normalizedEmail = email.toLowerCase();
  const record = otpStore.get(normalizedEmail);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return false;
  }
  if (record.code === code.toUpperCase()) {
    otpStore.delete(normalizedEmail);
    return true;
  }
  return false;
}

// Magic link store
interface MagicLinkRecord {
  email: string;
  token: string;
  expiresAt: number;
  used: boolean;
}
const magicLinkStore = new Map<string, MagicLinkRecord>();

export function generateMagicLinkToken(email: string): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  magicLinkStore.set(token, {
    email: email.toLowerCase(),
    token,
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    used: false,
  });
  return token;
}

export function verifyMagicLinkToken(token: string): { valid: boolean; email?: string } {
  const record = magicLinkStore.get(token);
  if (!record) return { valid: false };
  if (record.used) return { valid: false };
  if (Date.now() > record.expiresAt) {
    magicLinkStore.delete(token);
    return { valid: false };
  }
  record.used = true;
  return { valid: true, email: record.email };
}
