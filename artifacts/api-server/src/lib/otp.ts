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

  if (!rateLimit) return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS };
  if (rateLimit.cooldownUntil && now < rateLimit.cooldownUntil) {
    return { allowed: false, cooldownMinutes: Math.ceil((rateLimit.cooldownUntil - now) / 60000) };
  }
  if (rateLimit.cooldownUntil && now >= rateLimit.cooldownUntil) {
    rateLimitStore.delete(normalizedEmail);
    return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS };
  }
  if (rateLimit.attempts >= MAX_OTP_ATTEMPTS) {
    const cooldownUntil = rateLimit.lastRequestAt + COOLDOWN_DURATION;
    rateLimit.cooldownUntil = cooldownUntil;
    rateLimitStore.set(normalizedEmail, rateLimit);
    return { allowed: false, cooldownMinutes: Math.ceil((cooldownUntil - now) / 60000) };
  }
  return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS - rateLimit.attempts };
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

function generateAlphanumericCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function sendOTP(email: string): Promise<void> {
  const rateCheck = checkRateLimit(email);
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.cooldownMinutes ? `RATE_LIMIT_COOLDOWN:${rateCheck.cooldownMinutes}` : 'RATE_LIMIT_EXCEEDED');
  }

  const code = generateAlphanumericCode(6);
  otpStore.set(email.toLowerCase(), { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Reelsy Login Code</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI','Roboto',sans-serif;background:#f8f9fa;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f9fa;">
    <tr><td align="center" style="padding:40px 20px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;max-width:540px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <tr><td style="height:220px;background:linear-gradient(135deg,#667eea,#764ba2);">
          <div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;">
            <div style="font-size:56px;margin-bottom:12px;">🎬</div>
            <h1 style="margin:0;font-size:32px;color:#fff;font-weight:700;letter-spacing:-0.5px;">Reelsy</h1>
          </div>
        </td></tr>
        <tr><td style="padding:48px 40px;">
          <p style="margin:0 0 8px;font-size:14px;color:#667eea;font-weight:600;letter-spacing:.5px;text-transform:uppercase;">VERIFICATION CODE</p>
          <h2 style="margin:0 0 24px;font-size:24px;color:#1a1a1a;font-weight:600;">Your Reelsy Code</h2>
          <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">Enter the code below. Valid for <strong>10 minutes</strong>.</p>
          <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px;border-radius:12px;text-align:center;margin-bottom:32px;">
            <p style="margin:0 0 16px;font-size:11px;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:2px;font-weight:700;">Your Code</p>
            <div style="font-size:48px;letter-spacing:6px;color:#fff;font-weight:800;font-family:'Courier New',monospace;background:rgba(0,0,0,.1);padding:20px;border-radius:8px;">${code}</div>
          </div>
          <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">If you didn't request this code, ignore this email.</p>
        </td></tr>
        <tr><td style="padding:28px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999;">© 2026 Reelsy Inc. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  await sendEmailViaBrevo(email, `Your Reelsy Code: ${code}`, htmlContent);
  updateRateLimit(email);
}

export function verifyOTP(email: string, code: string): boolean {
  const normalizedEmail = email.toLowerCase();
  const record = otpStore.get(normalizedEmail);
  if (!record) return false;
  if (Date.now() > record.expiresAt) { otpStore.delete(normalizedEmail); return false; }
  if (record.code === code.toUpperCase()) { otpStore.delete(normalizedEmail); return true; }
  return false;
}

// ── Magic link tokens — persisted in MongoDB so they survive restarts & serverless cold starts ──

/** Lazy-load MongoDB collection to avoid circular imports at module load time. */
async function getMagicLinksCol() {
  const { getDb } = await import('./mongodb');
  const db = await getDb();
  const col = db.collection('magic_links');
  // TTL index: MongoDB auto-deletes docs when expiresAt is reached
  col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
  return col;
}

/**
 * Generate a magic link token and persist it to MongoDB.
 * Tokens expire after 30 minutes.
 */
export async function generateMagicLinkToken(email: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const col = await getMagicLinksCol();
  await col.insertOne({
    email: email.toLowerCase(),
    token,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    used: false,
    createdAt: new Date(),
  });
  return token;
}

/**
 * Verify a magic link token.
 * Marks the token as used on success — single-use only.
 */
export async function verifyMagicLinkToken(token: string): Promise<{ valid: boolean; email?: string }> {
  try {
    const col = await getMagicLinksCol();
    const record = await col.findOne({ token });
    if (!record) return { valid: false };
    if (record.used) return { valid: false };
    if (new Date() > record.expiresAt) {
      await col.deleteOne({ token });
      return { valid: false };
    }
    await col.updateOne({ token }, { $set: { used: true } });
    return { valid: true, email: record.email as string };
  } catch (err) {
    console.error('verifyMagicLinkToken error:', err);
    return { valid: false };
  }
}
