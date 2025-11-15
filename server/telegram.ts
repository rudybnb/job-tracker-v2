/**
 * Telegram Bot Service
 * Handles sending messages to contractors via Telegram
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface ContractorInvite {
  contractorName: string;
  telegramId: string;
  formUrl: string;
}

/**
 * Send contractor registration form invitation via Telegram
 */
export async function sendContractorInvite(invite: ContractorInvite): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] Bot token not configured');
    return false;
  }

  const message = `
📋 <b>Contractor Onboarding - ER Build &amp; Design</b>

Hello ${invite.contractorName}!

You've been invited to join our construction team. Please complete your contractor registration form:

🔗 <b>Form Link:</b> ${invite.formUrl}

📝 <b>What you'll need:</b>
• Personal details &amp; contact information
• Passport photo and right to work documents
• CIS number and tax details
• CSCS card information (if available)
• Bank details for payments
• Emergency contact details
• Your primary trade and tool availability

⏰ <b>Please complete within 24 hours</b>

❓ <b>Need help?</b> Reply to this message

<i>This is an automated message from the ER Build &amp; Design contractor management system.</i>
  `.trim();

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: invite.telegramId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send message:', error);
      return false;
    }

    const result = await response.json();
    console.log('[Telegram] Message sent successfully:', result.result.message_id);
    return true;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

/**
 * Send custom message to a Telegram user
 */
export async function sendCustomMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] Bot token not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

/**
 * Verify bot token is valid
 */
export async function verifyBotToken(): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`);
    if (!response.ok) {
      return false;
    }
    const result = await response.json();
    return result.ok === true;
  } catch (error) {
    return false;
  }
}
