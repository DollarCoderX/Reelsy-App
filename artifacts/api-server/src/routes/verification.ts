import { Router, Request, Response } from 'express';
import { sendEmailViaBrevo } from '../lib/email';

const router = Router();

interface VerificationRequest {
  businessName: string;
  businessEmail: string;
  address: string;
  city: string;
  country: string;
  userEmail: string;
}

// Pre-validate business details before AI analysis
function preValidateBusinessData(data: VerificationRequest): { valid: boolean; reason?: string } {
  // Check for generic/free email domains (usually indicates spam or unestablished business)
  const genericDomains = ['yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com', 'aol.com', 'protonmail.com', 'test.com', 'example.com'];
  const emailDomain = data.businessEmail.toLowerCase().split('@')[1];
  if (genericDomains.includes(emailDomain)) {
    return {
      valid: false,
      reason: "Generic email domain detected. Business email should use a dedicated business domain or Gmail."
    };
  }

  // Check address is not empty
  if (!data.address?.trim()) {
    return {
      valid: false,
      reason: "Address cannot be empty."
    };
  }

  // Check business name length and format
  if (data.businessName.trim().length < 3 || data.businessName.length > 100) {
    return {
      valid: false,
      reason: "Business name appears invalid. Please provide a valid business name."
    };
  }

  // Check for obviously fake patterns
  const fakePhrases = ['test', 'fake', 'demo', 'sample', 'xxx', 'asdf', 'qwerty', 'abc123'];
  const nameLower = data.businessName.toLowerCase();
  if (fakePhrases.some(phrase => nameLower.includes(phrase))) {
    return {
      valid: false,
      reason: "Business name does not appear legitimate. Please provide your actual business name."
    };
  }

  return { valid: true };
}

// Analyze business verification with Pollinations AI
async function analyzeBusinessWithAI(data: VerificationRequest): Promise<{ approved: boolean; reason: string }> {
  try {
    // Pre-validate first
    const preValidation = preValidateBusinessData(data);
    if (!preValidation.valid) {
      return {
        approved: false,
        reason: preValidation.reason || "Business information does not meet verification requirements."
      };
    }

    const prompt = `You are a business verification AI for Reelsy. Your job is to identify obvious FRAUD and red flags, not to verify if you know the business.

ONLY REJECT if:
- Clear signs of fraud or scam
- Inappropriate/harmful business types
- Fake or obviously fake business names (test, demo, xxx, etc.)
- Suspicious patterns (like "123 Main St" as address)

APPROVE if:
- Business name seems real and legitimate
- Address seems plausible
- No obvious red flags

Many legitimate businesses are new or unknown - that's OK. Don't reject just because you haven't heard of them.

BUSINESS DATA:
- Name: ${data.businessName}
- Email: ${data.businessEmail}
- Address: ${data.address}, ${data.city}, ${data.country}

Respond with ONLY this JSON structure, no other text:
{"approved":true,"reason":"reason here"}`;

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
      { signal: controller.signal }
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      // Handle rate limiting gracefully
      if (response.status === 429) {
        console.warn('API rate limited, returning rejection');
        return {
          approved: false,
          reason: "Verification service is temporarily busy. Please try again in a few moments."
        };
      }
      throw new Error(`API returned status ${response.status}`);
    }

    const text = await response.text();
    
    // Check if response is HTML (error page)
    if (text.trim().startsWith('<') || text.includes('DOCTYPE')) {
      throw new Error('API returned HTML instead of JSON');
    }

    // Parse JSON response
    let result;
    try {
      // Clean up potential formatting issues
      const cleanText = text.trim().replace(/^["']|["']$/g, '');
      result = JSON.parse(cleanText);
    } catch (e) {
      console.error('JSON parse failed:', e, 'Text:', text.substring(0, 200));
      // Fallback: use simple approval logic
      const hasNegativeWords = text.toLowerCase().includes('disapprove') || 
                               text.toLowerCase().includes('deny') || 
                               text.toLowerCase().includes('reject');
      result = {
        approved: !hasNegativeWords,
        reason: hasNegativeWords ? "Insufficient evidence of a legitimate, established business." : "Business appears legitimate"
      };
    }

    return {
      approved: result.approved === true || result.approved === 'true',
      reason: (result.reason || "Verification decision made").substring(0, 200)
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      approved: false,
      reason: "Verification service temporarily unavailable. Please try again later."
    };
  }
}

// Main verification endpoint
router.post('/verify-business', async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      businessEmail,
      address,
      city,
      country,
      userEmail
    } = req.body;

    // Validate required fields
    if (!businessName?.trim() || !address?.trim() || !city?.trim() || !country?.trim()) {
      return res.status(400).json({
        error: 'All fields are required',
        approved: false
      });
    }

    // Analyze with AI
    const verificationResult = await analyzeBusinessWithAI(
      {
        businessName,
        businessEmail: businessEmail || userEmail,
        address,
        city,
        country,
        userEmail
      }
    );

    // Return result
    return res.status(200).json({
      approved: verificationResult.approved,
      reason: verificationResult.reason,
      message: verificationResult.approved
        ? 'Your business has been verified!'
        : 'Your verification request was not approved.'
    });
  } catch (error) {
    req.log.error(error, 'Error processing verification');
    return res.status(500).json({
      error: 'Verification failed. Please try again.',
      approved: false
    });
  }
});

// Send verification email via Brevo
router.post('/send-verification-email', async (req: Request, res: Response) => {
  try {
    const { email, approved, reason } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const subject = approved 
      ? '✓ Your Reelsy Business is Verified!' 
      : 'Reelsy Verification Update';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', 'Roboto', sans-serif; background-color: #f8f9fa;">
  <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 540px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Hero Header -->
          <tr>
            <td style="height: 180px; background: linear-gradient(135deg, ${approved ? '#10b981' : '#ef4444'} 0%, ${approved ? '#059669' : '#dc2626'} 100%); position: relative; overflow: hidden;">
              <div style="position: relative; z-index: 1; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                <div style="font-size: 56px; margin-bottom: 12px;">
                  ${approved ? '✓' : '⚠️'}
                </div>
                <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px;">
                  ${approved ? 'Verified!' : 'Verification Update'}
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              <h2 style="margin: 0 0 24px 0; font-size: 22px; color: #1a1a1a; font-weight: 600; line-height: 1.3;">
                ${approved ? 'Welcome to Reelsy Verified Creators!' : 'Your Verification Request'}
              </h2>
              
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #555; line-height: 1.7; font-weight: 400;">
                ${reason}
              </p>

              ${approved ? `
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #cffafe 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #0284c7;">
                <p style="margin: 0; font-size: 14px; color: #0c4a6e; font-weight: 600;">Your business now has a Verified badge!</p>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #075985; line-height: 1.6;">
                  Your verified badge will appear next to your @username on all posts and profile. This helps your audience trust that your business is legitimate and approved by Reelsy.
                </p>
              </div>
              ` : `
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">What happens next?</p>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #b45309; line-height: 1.6;">
                  ${reason.includes('email') ? '• Use a dedicated business email domain<br/>' : ''}
                  ${reason.includes('address') ? '• Provide complete street address details<br/>' : ''}
                  ${reason.includes('established') ? '• Verify your business appears established and legitimate<br/>' : ''}
                  Please review the details above and reapply with corrected information. Questions? Contact support@reelsy.app
                </p>
              </div>
              `}
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
              
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:support@reelsy.app" style="color: #2563eb; text-decoration: none; font-weight: 500;">support@reelsy.app</a>
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

    await sendEmailViaBrevo(email, subject, htmlContent);

    return res.status(200).json({ 
      message: 'Verification email sent successfully',
      success: true 
    });
  } catch (error) {
    req.log.error(error, 'Error sending verification email');
    return res.status(500).json({ 
      error: 'Failed to send email',
      success: false 
    });
  }
});

export default router;
