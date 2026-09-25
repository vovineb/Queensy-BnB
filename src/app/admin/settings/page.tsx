import { getSettings } from "@/server/services/settings";
import { emailConfigured } from "@/server/services/mailer";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";
import { Alert } from "@/components/ui/feedback";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" description="Contact details, homepage copy and booking rules. Changes go live immediately." />
      <Alert tone={emailConfigured() ? "success" : "warning"} className="mb-6 max-w-3xl" title={emailConfigured() ? "Email delivery is configured" : "Email delivery is not configured"}>
        {emailConfigured() ? "Booking and account emails are being sent." : "Ask your developer to set SMTP_URL on the server so confirmations and password resets are emailed."}
      </Alert>
      <SettingsForm values={settings} />
    </>
  );
}
