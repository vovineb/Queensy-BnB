import { requireUserPage } from "@/server/auth/guards";
import { ProfileForm, PasswordForm } from "@/components/account/profile-forms";
import { Card } from "@/components/ui/feedback";

export const metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const user = await requireUserPage("/account/profile");
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-h1 font-bold">Profile & security</h1>
      <Card as="section">
        <h2 className="text-h3 font-semibold">Personal details</h2>
        <ProfileForm name={user.name} email={user.email} phone={user.phone} />
      </Card>
      <Card as="section">
        <h2 className="text-h3 font-semibold">Change password</h2>
        <PasswordForm />
      </Card>
    </div>
  );
}
