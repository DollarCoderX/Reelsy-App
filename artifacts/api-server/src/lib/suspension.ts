import { Collection } from 'mongodb';
import { ReelsyUser } from './mongodb';

const SUSPICIOUS_EMAIL_PATTERNS = [
  'yahoo', 'ymail', 'rocketmail', 'webmail', // Yahoo domains
];

const NEW_EMAIL_DOMAINS = [
  'tempmail', 'guerrillamail', '10minutemail', 'mailinator', '1secmail', 'fakeinbox',
  'throwaway', 'temp-mail', 'maildrop', 'spamgourmet', 'mailnesia', 'sharklasers',
];

/**
 * Check if email is suspicious (yahoo, temporary, or newly created)
 */
export function isSuspiciousEmail(email: string): { suspicious: boolean; reason?: string } {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  
  // Check for known temporary email providers
  for (const tempDomain of NEW_EMAIL_DOMAINS) {
    if (domain.includes(tempDomain)) {
      return { suspicious: true, reason: 'temporary_email_provider' };
    }
  }
  
  // Check for yahoo (allowed but monitored)
  for (const suspiciousDomain of SUSPICIOUS_EMAIL_PATTERNS) {
    if (domain.includes(suspiciousDomain)) {
      return { suspicious: true, reason: 'yahoo_or_suspicious_domain' };
    }
  }
  
  return { suspicious: false };
}

/**
 * Add a strike to user account and check if suspension needed (3 strikes = ban)
 */
export async function addStrike(
  usersCollection: Collection<ReelsyUser>,
  username: string,
  strikeType: string,
  details: string
): Promise<{ newStrikeCount: number; suspended: boolean }> {
  const user = await usersCollection.findOne({ username });
  if (!user) {
    return { newStrikeCount: 0, suspended: false };
  }

  const currentStrikeCount = user.strikeCount || 0;
  const newStrikeCount = currentStrikeCount + 1;

  const strikeLog = user.strikes || [];
  strikeLog.push({
    type: strikeType,
    timestamp: new Date(),
    details,
  });

  let suspensionReason = '';
  let shouldSuspend = false;

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

    const reviewEmail = 'uraincle@gmail.com';

    const emailBody = `
<h2>Account Suspension Review Request</h2>
<p><strong>User:</strong> ${username} (${toEmail})</p>
<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>

<h3>System Telemetry Data:</h3>
<pre>${JSON.stringify(telemetryData, null, 2)}</pre>

<p>This user has requested a review of their account suspension. Please investigate the circumstances and decide on appropriate action.</p>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: 'noreply@reelsy.com', name: 'Reelsy Security' },
        to: [{ email: reviewEmail, name: 'Uraincle' }],
        subject: `[REVIEW] Account Suspension Appeal - ${username}`,
        htmlContent: emailBody,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Brevo email error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending suspension review email:', error);
    return false;
  }
}
