import { Collection } from 'mongodb';
import { ReelsyUser } from './mongodb';

// Only flag actual temporary/disposable email services - NOT Yahoo or other mainstream providers
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail', 'guerrillamail', '10minutemail', 'mailinator', '1secmail', 'fakeinbox',
  'throwaway', 'temp-mail', 'maildrop', 'spamgourmet', 'mailnesia', 'sharklasers',
  'trashmail', 'yopmail', 'getairmail', 'throwawaymail', 'dispostable', 'spamgourmet',
  'mintemail', 'tempr', 'discard',
];

/**
 * Check if email uses a known disposable/temporary provider
 * Yahoo, Gmail, Outlook etc are all legitimate and should NOT trigger strikes
 */
export function isSuspiciousEmail(email: string): { suspicious: boolean; reason?: string } {
  const domain = email.split('@')[1]?.toLowerCase() || '';

  for (const tempDomain of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.includes(tempDomain)) {
      return { suspicious: true, reason: 'temporary_email_provider' };
    }
  }

  return { suspicious: false };
}

/**
 * Add a strike to user account and check if suspension needed (3 strikes = suspend)
 */
export async function addStrike(
  usersCollection: Collection<ReelsyUser>,
  username: string,
  strikeType: string,
  details: string
): Promise<{ newStrikeCount: number; suspended: boolean }> {
  const user = await usersCollection.findOne({ username });
  if (!user) return { newStrikeCount: 0, suspended: false };

  const currentStrikeCount = user.strikeCount || 0;
  const newStrikeCount = currentStrikeCount + 1;

  const strikeLog = user.strikes || [];
  strikeLog.push({ type: strikeType, timestamp: new Date(), details });

  let shouldSuspend = false;
  let suspensionReason = '';

  if (newStrikeCount >= 3) {
    shouldSuspend = true;
    suspensionReason = `Account suspended after ${newStrikeCount} security violations: ${details}`;
  }

  const updateData: any = {
    strikeCount: newStrikeCount,
    strikes: strikeLog,
    updatedAt: new Date(),
  };

  if (shouldSuspend) {
    updateData.isSuspended = true;
    updateData.suspensionReason = suspensionReason;
    updateData.suspendedAt = new Date();
    updateData.suspensionDetails =
      `Your account was suspended due to multiple security violations. ` +
      `We detected suspicious activity including: ${details}. ` +
      `Please review and appeal if you believe this is in error.`;
  }

  await usersCollection.updateOne({ username }, { $set: updateData });
  return { newStrikeCount, suspended: shouldSuspend };
}

/**
 * Send suspension review email via Brevo
 */
export async function sendSuspensionReviewEmail(
  toEmail: string,
  username: string,
  telemetryData: Record<string, any>
): Promise<boolean> {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured');
      return false;
    }

    const reviewEmail = 'praisejiro43210@gmail.com';
    const emailBody = `
<h2>Account Suspension Review Request</h2>
<p><strong>User:</strong> ${username} (${toEmail})</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
<h3>System Telemetry Data:</h3>
<pre>${JSON.stringify(telemetryData, null, 2)}</pre>
<p>This user has requested a review of their account suspension.</p>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { email: 'noreply@reelsy.com', name: 'Reelsy Security' },
        to: [{ email: reviewEmail, name: 'Uraincle' }],
        subject: `[REVIEW] Account Suspension Appeal - ${username}`,
        htmlContent: emailBody,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending suspension review email:', error);
    return false;
  }
}
