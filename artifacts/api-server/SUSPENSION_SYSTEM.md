# Account Suspension System - Environment Variables

## Required Environment Variables for Brevo Email Integration

```env
# Brevo API Configuration
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=noreply@reelsy.com
BREVO_ADMIN_EMAIL=uraincle@gmail.com

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=reelsy
```

## Suspension System Overview

The account suspension system includes:

### 1. **Automatic Suspension via Strike System**
- Users receive strikes for suspicious activities
- 3 strikes = automatic account suspension
- Strike types:
  - `yahoo_email`: Using Yahoo email domain
  - `temporary_email_provider`: Using temporary email services
  - Other suspicious patterns

### 2. **Backend Endpoints**

#### Check Suspension Status
```
GET /api/auth/check-suspension/:username
Response:
{
  "isSuspended": boolean,
  "suspensionReason": string,
  "suspensionDetails": string,
  "suspendedAt": ISO8601 timestamp
}
```

#### Submit Suspension Review
```
POST /api/auth/suspension-review
Body:
{
  "username": string,
  "email": string,
  "telemetry": {
    // Browser and system telemetry data
  }
}
Response:
{
  "message": "Review request submitted...",
  "submittedAt": ISO8601 timestamp
}
```

### 3. **Database Schema**

ReelsyUser MongoDB document now includes:
```typescript
{
  isSuspended?: boolean;
  suspensionReason?: string;
  suspensionDetails?: string;
  suspendedAt?: Date;
  strikeCount?: number;
  strikes?: Array<{
    type: string;        // e.g., 'yahoo_email', 'suspicious_domain'
    timestamp: Date;
    details: string;
  }>;
}
```

### 4. **Frontend Components**

- **AccountSuspended.tsx**: Displays suspension notice with:
  - "Learn More" button to view suspension details
  - "Request Review" button to submit telemetry and appeal
  - Collects comprehensive device/browser telemetry
  - Sends data to admin email (uraincle@gmail.com)

- **App.tsx**: Checks suspension status on login and routes to AccountSuspended screen if needed

### 5. **Telemetry Collection**

When user clicks "Request Review", the system collects:
- Timestamp and timezone
- Device: platform, screen resolution, memory, cores
- Browser: user agent, connection type, language
- Network: online status
- Account: tier, creation info
- Additional custom fields as needed

This data is sent to the admin email for investigation.

### 6. **Email Notification to Admin**

When a suspension review is submitted, admin receives email with:
- User: username, email, account ID
- Suspension: reason and details
- Full telemetry data dump
- Timestamp of review request
- Strike history

## Setup Instructions

1. **Get Brevo API Key**
   - Sign up at https://www.brevo.com
   - Create API key from dashboard
   - Add to `.env` file as `BREVO_API_KEY`

2. **Configure Sender Email**
   - Verify email sender (noreply@reelsy.com) in Brevo
   - Add to `BREVO_SENDER_EMAIL` env variable

3. **Set Admin Email**
   - Current: uraincle@gmail.com
   - Can be changed in `BREVO_ADMIN_EMAIL` env variable
   - Also referenced in `suspension.ts` sendSuspensionReviewEmail function

4. **Restart API Server**
   - Ensure .env variables are loaded
   - Restart api-server for changes to take effect

## Testing

### Test Suspension Detection
1. Register with email: `testuser@yahoo.com`
2. Check MongoDB for strikeCount = 1
3. Add 2 more strikes manually to test auto-ban

### Test Review Submission
1. Login as suspended account
2. Click "Request Review"
3. Check admin email for review request with telemetry

### Test Email Sending
```bash
curl -X POST http://localhost:3001/api/auth/suspension-review \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "telemetry": {"platform": "test"}
  }'
```

## Security Considerations

- Telemetry data should be PII-reduced in production
- Consider rate limiting on review submissions
- Store review submissions in database for audit trail
- Implement admin dashboard to review suspension appeals
- Add IP tracking to detect repeat offenders
- Consider automated analysis of collected telemetry

## Future Enhancements

- [ ] Admin dashboard for reviewing suspension appeals
- [ ] Automated ML classification of suspicious patterns
- [ ] Integration with fraud detection APIs
- [ ] Temporary suspension (24-48 hours) before permanent ban
- [ ] Appeal workflow with manual review
- [ ] Suspension history tracking per user
- [ ] Geographic IP blocking integration
- [ ] Device fingerprinting for fraud detection
