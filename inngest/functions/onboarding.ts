import { inngest } from "../client";
import { db } from "@/server/db/client";
import { users, organizations, orgMembers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail } from "@/server/services/email/client";

export const onboardingWorkflow = inngest.createFunction(
  { id: "onboarding-workflow", name: "New User Onboarding" },
  { event: "user/signed.up" },
  async ({ event, step }) => {
    const userId = event.data.userId as string;
    const email = event.data.email as string;
    const name = event.data.name as string;

    // Step 1: Create default organization for the user
    const org = await step.run("create-default-org", async () => {
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: `${name}'s Organization`,
          ownerId: userId,
        })
        .returning();

      // Add user as owner
      await db.insert(orgMembers).values({
        orgId: newOrg.id,
        userId,
        role: "owner",
      });

      return { orgId: newOrg.id };
    });

    // Step 2: Send welcome email
    await step.run("send-welcome-email", async () => {
      await sendWelcomeEmail(email, name);
    });

    // Step 3: Mark onboarding as complete
    await step.run("mark-onboarding-started", async () => {
      // User still needs to complete setup, but org is created
    });

    // Step 4: Wait for first platform connection (up to 7 days)
    const platformConnected = await step.waitForEvent(
      "wait-for-platform-connection",
      {
        event: "platform/connected",
        match: "data.userId",
        timeout: "7d",
      }
    );

    if (!platformConnected) {
      // Step 5a: Send reminder email if no platform connected
      await step.run("send-reminder-email", async () => {
        await sendReminderEmail(email, name);
      });
    }
  }
);

async function sendReminderEmail(to: string, name: string) {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Pixie Social <noreply@pixiesocial.com>",
    to,
    subject: "Don't forget to connect your first platform!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111;">Hey ${name}!</h1>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          You signed up for Pixie Social but haven't connected a platform yet.
          Connect LinkedIn to start generating AI-powered content and growing your audience.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; margin-top: 16px;">
          Connect a Platform
        </a>
      </div>
    `,
  });
}
