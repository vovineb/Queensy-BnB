# Sign-in, sign-up and admin access

Queensy BnB has its own accounts. There's no Firebase, Google or third-party
auth service to configure: accounts and sessions live in the app's database.

## What works with no extra setup

- **Sign up** at `/signup`: name, email, phone (any country), password (10+
  characters), and consent choices.
- **Sign in** at `/login`. After signing in, admins go to `/admin` and guests to
  `/account`.
- Sessions last 30 days and renew while in use. Changing or resetting a password
  signs out every other device.

## What needs email (SMTP)

These features send an email, so they only work once SMTP is set up:

- **Forgot password** (`/forgot-password`)
- **Email confirmation** after sign-up. Confirming links a guest's earlier
  bookings to their account.
- Booking confirmations and updates

Without SMTP, the site still works, but these emails are skipped, and the admin
dashboard shows a warning.

### Set up email with Gmail (free)

1. Sign in to the Gmail account that should send the emails.
2. Turn on 2-Step Verification: <https://myaccount.google.com/signinoptions/twosv>.
3. Create an app password: <https://myaccount.google.com/apppasswords>. Name it
   "Queensy BnB" and copy the 16-character password. Remove the spaces.
4. In Vercel, open the project, then **Settings → Environment Variables**, and
   add these for Production and Preview:

   | Name | Value |
   |---|---|
   | `SMTP_URL` | `smtps://YOUR_GMAIL%40gmail.com:APP_PASSWORD@smtp.gmail.com:465` (write the `@` in the email as `%40`) |
   | `EMAIL_FROM` | `Queensy BnB <YOUR_GMAIL@gmail.com>` |

5. Redeploy: **Deployments → ⋯ → Redeploy**.
6. Test it: request a password reset for your own account.

Gmail allows about 500 emails a day, which is plenty for a guest house. For
more, use Brevo, Resend or Mailgun. They all provide an SMTP URL in the same
format.

## Admin access

- `OWNER_EMAIL` names the site owner. Only the owner can grant or remove admin
  access. Other admins can't demote or deactivate the owner.
- To add a staff member:
  1. They sign up at `/signup` like a guest.
  2. The owner opens **Admin → Users**, finds them and clicks **Make admin**.
  3. They sign in again and can use `/admin`.
- To remove access, the owner clicks **Remove admin access** on the person's
  profile. They're signed out straight away.
- In an emergency, for example if the owner is locked out, a developer can run
  `npm run admin:create -- --email someone@example.com` against the production
  database.
