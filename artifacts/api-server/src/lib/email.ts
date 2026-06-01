export async function sendEmailViaBrevo(email: string, subject: string, htmlContent: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }

  const payload = {
    sender: { name: 'Reelsy', email: 'uraincle@gmail.com' },
    to: [{ email }],
    subject,
    htmlContent,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`Brevo response: ${response.status}`, responseText);

  if (!response.ok) {
    throw new Error(`Brevo API error: ${response.status} - ${responseText}`);
  }
}
