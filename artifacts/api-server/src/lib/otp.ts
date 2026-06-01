import { sendEmailViaBrevo } from './email';

// In-memory store for OTPs
// Maps email address to an object containing the code and expiration timestamp.
interface OTPRecord {
  code: string;
  expiresAt: number;
}
const otpStore = new Map<string, OTPRecord>();

// Rate limiting store for OTP requests
// Tracks number of attempts and cooldown period
interface RateLimitRecord {
  attempts: number;
  lastRequestAt: number;
  cooldownUntil?: number;
}
const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_OTP_ATTEMPTS = 2;
const COOLDOWN_DURATION = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

// Check if email is rate limited
function checkRateLimit(email: string): { allowed: boolean; remainingAttempts?: number; cooldownMinutes?: number } {
  const normalizedEmail = email.toLowerCase();
  const rateLimit = rateLimitStore.get(normalizedEmail);
  const now = Date.now();

  if (!rateLimit) {
    return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS };
  }

  // Check if still in cooldown period
  if (rateLimit.cooldownUntil && now < rateLimit.cooldownUntil) {
    const cooldownMinutes = Math.ceil((rateLimit.cooldownUntil - now) / 60000);
    return { allowed: false, cooldownMinutes };
  }

  // Reset if cooldown period has passed
  if (rateLimit.cooldownUntil && now >= rateLimit.cooldownUntil) {
    rateLimitStore.delete(normalizedEmail);
    return { allowed: true, remainingAttempts: MAX_OTP_ATTEMPTS };
  }

  // Check if max attempts exceeded
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

// Update rate limit for email
function updateRateLimit(email: string): void {
  const normalizedEmail = email.toLowerCase();
  const existing = rateLimitStore.get(normalizedEmail);

  if (existing) {
    existing.attempts += 1;
    existing.lastRequestAt = Date.now();
  } else {
    rateLimitStore.set(normalizedEmail, {
      attempts: 1,
      lastRequestAt: Date.now(),
    });
  }
}

// Generates a random alphanumeric code of a specific length
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
    // rate limit check
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      if (rateCheck.cooldownMinutes) {
        throw new Error(`RATE_LIMIT_COOLDOWN:${rateCheck.cooldownMinutes}`);
      }
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    const code = generateAlphanumericCode(6);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    
    // Store the OTP
    otpStore.set(email.toLowerCase(), { code, expiresAt });
    
    // Send the email via Brevo
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
          
          <!-- Hero Image Header -->
          <tr>
            <td style="height: 220px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative; overflow: hidden;">
              <img src="https://images.unsplash.com/photo-1557821552-17105176677c?w=600&h=220&fit=crop" alt="Reelsy" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.4; position: absolute; top: 0; left: 0;">
              <div style="position: relative; z-index: 1; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <div style="font-size: 56px; margin-bottom: 12px;">🎬</div>
                <h1 style="margin: 0; font-size: 32px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">Reelsy</h1>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #667eea; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">LOGIN VERIFICATION</p>
              
              <h2 style="margin: 0 0 24px 0; font-size: 24px; color: #1a1a1a; font-weight: 600; line-height: 1.3;">Your Verification Code</h2>
              
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #555; line-height: 1.7; font-weight: 400;">
                We received a login request for your Reelsy account. Enter the code below to verify your identity and complete your login.
              </p>
              
              <!-- OTP Code Box - Premium Style -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; text-align: center; margin-bottom: 32px; box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);">
                <p style="margin: 0 0 16px 0; font-size: 11px; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Enter Code</p>
                <div style="font-size: 48px; letter-spacing: 6px; color: #ffffff; font-weight: 800; font-family: 'Courier New', monospace; margin: 0; word-spacing: 2px; background: rgba(0,0,0,0.1); padding: 20px; border-radius: 8px;">
                  ${code}
                </div>
                <p style="margin: 16px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.8); font-weight: 500;">Valid for <strong>5 minutes</strong></p>
              </div>
              
              <!-- Info Sections -->
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px; background: #f0f4ff; border-left: 4px solid #667eea; border-radius: 6px; margin-bottom: 12px;">
                    <p style="margin: 0; font-size: 13px; color: #333; line-height: 1.6;">
                      <strong style="color: #667eea;">🔒 Keep it secure.</strong> Never share this code with anyone, even Reelsy staff.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                    <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">
                      <strong style="color: #92400e;">⏱️ Code expires soon.</strong> If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
              
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:support@reelsy.app" style="color: #667eea; text-decoration: none; font-weight: 500;">support@reelsy.app</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 28px 40px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: #999;">
                © 2026 Reelsy Inc. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 10px; color: #bbb;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    
    await sendEmailViaBrevo(email, `🎬 Your Reelsy Login Code: ${code}`, htmlContent);
    // update rate limit after successful send
    updateRateLimit(email);
    console.log("OTP sent successfully to:", email);
  } catch (error) {
    console.error("Failed to send OTP:", error);
    throw error;
  }
}

export function verifyOTP(email: string, code: string): boolean {
  const normalizedEmail = email.toLowerCase();
  const record = otpStore.get(normalizedEmail);
  
  if (!record) {
    return false;
  }
  
  if (Date.now() > record.expiresAt) {
    // Code expired, delete it
    otpStore.delete(normalizedEmail);
    return false;
  }
  
  if (record.code === code.toUpperCase()) {
    // Valid code, delete it so it can't be reused
    otpStore.delete(normalizedEmail);
    return true;
  }
  
  return false;
}
