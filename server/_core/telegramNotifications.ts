/**
 * Telegram Notifications System
 * Send proactive alerts to contractors via Telegram bot
 */
import { ENV } from "./env";

export type NotificationType = 
  | "job_assigned"
  | "payment_processed"
  | "milestone_completed"
  | "work_session_reminder"
  | "admin_announcement"
  | "progress_report_reminder";

export type TelegramNotification = {
  chatId: string;
  message: string;
  type: NotificationType;
  parseMode?: "Markdown" | "HTML";
};

export type NotificationResult = {
  success: boolean;
  messageId?: number;
  error?: string;
};

/**
 * Send a notification to a contractor via Telegram
 */
export async function sendTelegramNotification(
  notification: TelegramNotification
): Promise<NotificationResult> {
  try {
    const botToken = ENV.telegramBotToken;

    if (!botToken) {
      return {
        success: false,
        error: "Telegram bot token not configured",
      };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: notification.chatId,
        text: notification.message,
        parse_mode: notification.parseMode || "Markdown",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Telegram API error: ${response.status} - ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Notification templates for different event types
 */
export const notificationTemplates = {
  jobAssigned: (jobTitle: string, location: string) => ({
    type: "job_assigned" as NotificationType,
    message: `🎯 *New Job Assigned!*\n\n📋 Job: ${jobTitle}\n📍 Location: ${location}\n\nYou can now start submitting progress reports for this job. Send a voice message or use /myjobs to view details.`,
  }),

  paymentProcessed: (amount: string, period: string) => ({
    type: "payment_processed" as NotificationType,
    message: `💰 *Payment Processed*\n\n✅ Amount: ${amount}\n📅 Period: ${period}\n\nYour payment has been processed successfully. Use /payments to view your payment history.`,
  }),

  milestoneCompleted: (milestone: string, jobTitle: string) => ({
    type: "milestone_completed" as NotificationType,
    message: `✨ *Milestone Completed!*\n\n🏆 ${milestone}\n📋 Job: ${jobTitle}\n\nGreat work! Keep up the excellent progress.`,
  }),

  workSessionReminder: (jobTitle: string) => ({
    type: "work_session_reminder" as NotificationType,
    message: `⏰ *Work Session Reminder*\n\n📋 Job: ${jobTitle}\n\nDon't forget to clock in when you start work today. Use the mobile app to track your hours.`,
  }),

  adminAnnouncement: (title: string, message: string) => ({
    type: "admin_announcement" as NotificationType,
    message: `📢 *Announcement: ${title}*\n\n${message}`,
  }),

  progressReportReminder: (jobTitle: string, daysSinceLastReport: number) => ({
    type: "progress_report_reminder" as NotificationType,
    message: `📝 *Progress Report Reminder*\n\n📋 Job: ${jobTitle}\n⏱️ Last report: ${daysSinceLastReport} days ago\n\nPlease send a voice message with your progress update.`,
  }),

  welcomeMessage: (contractorName: string) => ({
    type: "admin_announcement" as NotificationType,
    message: `👋 *Welcome to Job Tracker, ${contractorName}!*\n\nYou're now registered and ready to go.\n\n*Available Commands:*\n/myinfo - View your profile\n/myjobs - See assigned jobs\n/payments - Check payment history\n/help - Get help\n\n*Features:*\n🎤 Send voice messages for progress reports (any language)\n📸 Send photos to document your work\n🌍 Automatic translation to English\n💰 Track earnings in real-time`,
  }),
};

/**
 * Batch send notifications to multiple contractors
 */
export async function sendBatchNotifications(
  notifications: Array<{ chatId: string; notification: ReturnType<typeof notificationTemplates[keyof typeof notificationTemplates]> }>
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const { chatId, notification } of notifications) {
    const result = await sendTelegramNotification({
      chatId,
      message: notification.message,
      type: notification.type,
      parseMode: "Markdown",
    });

    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Helper to format currency for notifications
 */
export function formatCurrency(amountInPence: number): string {
  return `£${(amountInPence / 100).toFixed(2)}`;
}

/**
 * Helper to format date for notifications
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
