import "server-only";

// ---------------------------------------------------------------------------
// Payment integration boundary.
//
// Payments are NOT processed online yet. Today admins record payments received
// offline (M-Pesa till/paybill, bank transfer, cash) via the "manual" provider,
// which writes to the `payments` ledger (see bookings.recordManualPayment).
//
// To add an online provider (e.g. M-Pesa Daraja STK push, Stripe, Flutterwave,
// Pesapal), implement PaymentProvider and register it below:
//   1. initiate(): create a provider-side payment for a booking in
//      PENDING/AWAITING_PAYMENT and return what the UI needs (redirect URL,
//      STK prompt reference...). Insert a Payment row with status PENDING.
//   2. Expose a webhook route (app/api/payments/[provider]/route.ts) that calls
//      handleWebhook(); verify the provider signature there.
//   3. On success, mark the Payment SUCCEEDED and transition the booking to
//      PAID using transitionBooking(). The booking state machine, availability
//      holds and notifications already handle the rest.
// ---------------------------------------------------------------------------

export type PaymentInitiation =
  | { kind: "redirect"; url: string; paymentId: string }
  | { kind: "prompt"; message: string; paymentId: string };

export type WebhookResult = { paymentId: string; status: "SUCCEEDED" | "FAILED" | "REFUNDED"; providerRef: string } | null;

export interface PaymentProvider {
  id: string;
  displayName: string;
  /** Currencies this provider can charge in (ISO-4217). */
  currencies: string[];
  initiate(booking: { id: string; reference: string; total: number; currency: string; guestEmail: string; guestPhone: string | null }): Promise<PaymentInitiation>;
  handleWebhook(request: Request): Promise<WebhookResult>;
}

const providers: PaymentProvider[] = [];

export function onlinePaymentProviders(currency: string): PaymentProvider[] {
  return providers.filter((p) => p.currencies.includes(currency));
}

export const MANUAL_PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card (in person)" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;
