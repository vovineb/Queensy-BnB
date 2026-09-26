"use client";

import { useActionState } from "react";
import { updateMarketingAction } from "@/server/actions/account";
import { Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormStatus, initialActionState } from "@/components/forms/form-status";

export function MarketingForm({ email, sms, whatsapp }: { email: boolean; sms: boolean; whatsapp: boolean }) {
  const [state, action] = useActionState(updateMarketingAction, initialActionState);
  return (
    <form action={action} className="mt-5 space-y-4">
      <FormStatus state={state} />
      <Checkbox name="email" defaultChecked={email} label="Email" description="Occasional offers, new stays and seasonal news." />
      <Checkbox name="sms" defaultChecked={sms} label="SMS" description="Time-sensitive offers only." />
      <Checkbox name="whatsapp" defaultChecked={whatsapp} label="WhatsApp" description="Offers and updates via WhatsApp." />
      <SubmitButton variant="dark">Save preferences</SubmitButton>
    </form>
  );
}
