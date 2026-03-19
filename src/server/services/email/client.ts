import { Resend } from "resend";
import { logger } from "@/server/lib/logger";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_ADDRESS = "Pixie Social <noreply@pixiesocial.com>";

// ─── Email Templates ─────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const resend = getResend();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Welcome to Pixie Social!",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            Welcome to Pixie Social, ${escapeHtml(name)}!
          </h1>
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 16px;">
            You're all set to start managing your social media with AI. Here's what to do next:
          </p>
          <ol style="font-size: 15px; color: #555; line-height: 1.8; padding-left: 20px; margin-bottom: 24px;">
            <li><strong>Create a brand</strong> — set up your brand identity and voice profile</li>
            <li><strong>Connect LinkedIn</strong> — link your account to start publishing</li>
            <li><strong>Generate content</strong> — let AI create your first post</li>
          </ol>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/overview" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Go to Dashboard
          </a>
          <p style="font-size: 13px; color: #999; margin-top: 32px;">
            — The Pixie Social Team
          </p>
        </div>
      `,
    });
    logger.info("Welcome email sent", { to });
  } catch (error) {
    logger.error("Failed to send welcome email", { to, error: String(error) });
  }
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  const resend = getResend();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Payment failed — action required",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 16px;">
            Payment Failed
          </h1>
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 16px;">
            Hi ${escapeHtml(name)}, we were unable to process your latest payment for Pixie Social.
          </p>
          <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
            Please update your payment method to keep your subscription active. If payment isn't received within 7 days, your account will be downgraded to the Free plan.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            Update Payment Method
          </a>
          <p style="font-size: 13px; color: #999; margin-top: 32px;">
            If you believe this is an error, please contact support.
          </p>
        </div>
      `,
    });
    logger.info("Payment failed email sent", { to });
  } catch (error) {
    logger.error("Failed to send payment failed email", { to, error: String(error) });
  }
}

export async function sendWeeklyDigestEmail(
  to: string,
  name: string,
  stats: {
    postsPublished: number;
    totalImpressions: number;
    engagementRate: string;
    followerGrowth: number;
    pendingReview: number;
    topPost?: string;
  }
) {
  const resend = getResend();

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Your weekly social media report — ${stats.postsPublished} posts published`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111; margin-bottom: 8px;">
            Weekly Report
          </h1>
          <p style="font-size: 13px; color: #999; margin-bottom: 24px;">
            Hi ${escapeHtml(name)}, here's how your social media performed this week.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 16px; background: #f9fafb; border-radius: 8px 0 0 0; text-align: center; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 700; color: #111;">${stats.postsPublished}</div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">Posts Published</div>
              </td>
              <td style="padding: 16px; background: #f9fafb; border-radius: 0 8px 0 0; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #111;">${stats.totalImpressions.toLocaleString()}</div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">Impressions</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px; background: #f9fafb; border-radius: 0 0 0 8px; text-align: center; border-right: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 700; color: #111;">${stats.engagementRate}%</div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">Engagement Rate</div>
              </td>
              <td style="padding: 16px; background: #f9fafb; border-radius: 0 0 8px 0; text-align: center; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 24px; font-weight: 700; color: ${stats.followerGrowth >= 0 ? "#16a34a" : "#dc2626"};">
                  ${stats.followerGrowth >= 0 ? "+" : ""}${stats.followerGrowth}
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">Follower Growth</div>
              </td>
            </tr>
          </table>

          ${stats.topPost ? `
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="font-size: 12px; font-weight: 600; color: #999; margin-bottom: 8px;">TOP PERFORMING POST</p>
              <p style="font-size: 14px; color: #333; line-height: 1.5;">${escapeHtml(stats.topPost.slice(0, 200))}${stats.topPost.length > 200 ? "..." : ""}</p>
            </div>
          ` : ""}

          ${stats.pendingReview > 0 ? `
            <p style="font-size: 14px; color: #555; margin-bottom: 24px;">
              You have <strong>${stats.pendingReview}</strong> item${stats.pendingReview > 1 ? "s" : ""} awaiting review.
            </p>
          ` : ""}

          <a href="${process.env.NEXT_PUBLIC_APP_URL}/overview" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            View Full Dashboard
          </a>
          <p style="font-size: 13px; color: #999; margin-top: 32px;">
            — The Pixie Social Team
          </p>
        </div>
      `,
    });
    logger.info("Weekly digest email sent", { to });
  } catch (error) {
    logger.error("Failed to send weekly digest email", { to, error: String(error) });
  }
}

// ─── Helpers ─────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
