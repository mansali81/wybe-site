# Payments & Booking Setup

This document is for **you (Mansoor)** — the site itself is a static
HTML deploy on Vercel, so nothing sensitive (no Stripe secret keys, no
webhooks, no OAuth) lives in the repo. Everything is configured in
**Stripe Dashboard** and **Google Workspace Calendar** and stitched
together with public Payment Links.

The site references every Payment Link in **one place**: a giant HTML
comment near the top of the Services section in `index.html` labelled
`STRIPE PAYMENT LINK MAPPING`. Search the codebase for `REPLACE_` to
find every anchor that needs the real URL pasted in.

---

## The flow at a glance

```
[Services section on wybe.fit]
          │
          │  visitor clicks "Purchase & Book →" on a tier card
          ▼
[Stripe Payment Link — hosted checkout page]
          │
          │  visitor pays with card / Apple Pay / Google Pay / Link
          ▼
[Post-payment redirect (configured in Stripe)]
          │
          │  → your Google Workspace Calendar Appointment Schedule
          ▼
[Google Calendar booking page]
          │
          │  visitor picks a slot
          ▼
[Google Calendar sends you a booking notification (email/push)]
```

**No card fields ever touch wybe.fit.** Stripe hosts the payment page;
Google Calendar hosts the booking page. Both are HTTPS, both are
maintained by their vendors.

---

## Payment Link mapping (the 11 URLs you need to create)

| # | Service | Tier | Price (USD) | Placeholder anchor in `index.html` |
|---|---------|------|-------------|------------------------------------|
| 1 | Fitness Consultation | Online · Single | **$69** | `REPLACE_fitness_online_single_69` |
| 2 | Fitness Consultation | Live UAE · Single | **$159** | `REPLACE_fitness_live_single_159` |
| 3 | Fitness Consultation | Bundle Online · 2-session | **$169** | `REPLACE_fitness_bundle_online_169` |
| 4 | Fitness Consultation | Bundle Live UAE · 2-session | **$269** | `REPLACE_fitness_bundle_live_269` |
| 5 | Nutrition Consultation | Single Session | **$119** | `REPLACE_nutrition_single_119` |
| 6 | Nutrition Consultation | Extended Block | **$229** | `REPLACE_nutrition_extended_229` |
| 7 | Nutrition Consultation | Monthly Programme | **$349 / month** | `REPLACE_nutrition_monthly_349` |
| 8 | Digital Plan | Beginner · solo | **$39** | `REPLACE_plan_beginner_solo_39` |
| 9 | Digital Plan | Beginner · combo | **$88** | `REPLACE_plan_beginner_combo_88` |
| 10 | Digital Plan | Intermediate · solo | **$69** | `REPLACE_plan_intermediate_solo_69` |
| 11 | Digital Plan | Intermediate · combo | **$118** | `REPLACE_plan_intermediate_combo_118` |
| 12 | Digital Plan | Advanced · solo | **$119** | `REPLACE_plan_advanced_solo_119` |
| 13 | Digital Plan | Advanced · combo | **$168** | `REPLACE_plan_advanced_combo_168` |

> **Where to paste:** in `index.html`, every anchor is
> `<a href="https://buy.stripe.com/REPLACE_…" …>`. Replace the whole
> `href` value with the live URL from Stripe. Fitness / Nutrition
> anchors live inside their respective `#panel-fitness` /
> `#panel-nutrition` tier cards. Digital-plan URLs live in the
> `PLAN_LINKS` object inside the `#plan-quiz` handler script (grep
> `PLAN_LINKS` — it's one JavaScript object literal).

---

## Step 1 — create the Stripe Payment Links

1. Log in at <https://dashboard.stripe.com/payments/payment-links>.
2. Click **New payment link**.
3. **Product**: create one product per tier (e.g. "WYBE — Fitness
   Consultation Online Single"). Amount = the tier's USD price.
   Currency = USD. Type = **One-time** for consultations and the
   digital plan; **Recurring monthly** for the Nutrition Monthly
   Programme.
4. **Payment methods**: accept Card + Apple Pay + Google Pay + Link
   (Stripe's default set is fine for the UAE + international audience).
5. **Collect customer info**: turn on **Email**, **Name**, and
   optionally **Phone**. Add a custom field for **"City / Country"**
   on the two Live UAE tiers so you know who's booking in-person.
6. Under **After payment → Confirmation page**, choose
   **Don't show confirmation page; redirect customers to your
   website** and paste your Google Calendar booking URL
   (see Step 2). Enable **Attach client_reference_id / session id to
   the URL** so bookings can be reconciled with a payment.
7. Save. Stripe gives you a public URL that looks like
   `https://buy.stripe.com/eVaXXXXXXXXXXXXX`.
8. Paste that URL into the matching `REPLACE_…` slot in
   `index.html` (one per anchor).

Repeat for all 13 tiers.

---

## Step 2 — the Google Calendar Appointment Schedule

Google Workspace's **Appointment Schedules** feature (formerly
**Appointment Slots**) is the recommended booking surface — it lives
in `google.com/calendar`, uses your Workspace calendar directly, and
sends you a native booking notification the moment a slot is picked.

1. Open Google Calendar → **Create → Appointment Schedule**.
2. Give it a title ("WYBE Consultations" or one per service).
3. Set:
   - **Availability window** (working hours per day of the week).
   - **Duration**: 60 min for a Single, 120 min for Extended Block,
     etc. — match the tier length.
   - **Buffer** before/after (Stripe never blocks slots).
   - **Location**: Google Meet for online tiers; enter the studio
     address for UAE Live.
4. Under **Booking page**, copy the public booking URL. It looks
   like `https://calendar.app.google/…` and is the URL you paste
   into every Stripe **Confirmation page → Redirect** field in
   Step 1.6.
5. Under **Booking form**, enable **Email me when a booking is
   made**. This is your notification — you'll get the customer's
   name, email, chosen time and any notes in your Gmail inbox
   (and a native calendar event on your primary calendar).

Repeat if you want distinct booking pages per service (recommended:
one Appointment Schedule per tier length so the buffer/duration is
right; one URL per tier).

---

## Step 3 — pick a gating model

A Payment Link **hosted redirect** goes to whatever URL you set
after payment. If someone knows the Google Calendar URL directly,
they could book without paying. Two ways to handle this:

### Option A — Simple (recommended for low volume, do this first)

- Paste the Google Calendar URL into the Stripe Payment Link
  **Confirmation → Redirect** field.
- **Keep the calendar URL unlisted.** Don't publish it on the site,
  in social bios, or in your email signature. The only surface that
  hands out this URL is Stripe's post-payment redirect.
- If someone finds the URL by other means and books without paying,
  you'll see it as a lone calendar entry with no matching Stripe
  charge — you can cancel and reach out.
- **Zero moving parts.** No servers, no functions, no webhooks. This
  is what to ship first.

### Option B — Robust (only if abuse becomes a real problem)

Add a Stripe webhook that emails the customer a **one-time booking
URL** after payment succeeds. Requires a tiny serverless function
(Vercel Function or Google Cloud Function — the wybe.fit repo is
static, so this goes elsewhere).

Sketch of the flow:

1. Stripe fires `checkout.session.completed` → your webhook.
2. Function generates a short-lived signed token (e.g. HMAC of
   `{session_id, ts, tier}` with expiry = 72 h).
3. Function sends the customer an email (via Google Workspace SMTP
   or SendGrid or Postmark) with a URL like
   `https://wybe.fit/book?t=<signed_token>`.
4. That page (a new tiny function or static + JS) verifies the token,
   then redirects to the real Google Calendar URL. Only valid tokens
   let through.

Stub (paste the following into a `api/booking.js` file when you're
ready to build Option B):

```js
// api/booking.js — Vercel Function stub. NOT wired into the static site.
// Deploy this separately from wybe.fit when you're ready to gate the
// calendar URL behind a paid Stripe session.
export default async function handler(req, res) {
  // 1. Validate `t` query param is a fresh, HMAC-signed token from Stripe.
  // 2. Look up the session ID (from token) via Stripe SDK to confirm paid.
  // 3. Redirect to the appropriate Google Calendar Appointment URL.
  //
  // See https://stripe.com/docs/webhooks and
  //     https://vercel.com/docs/functions
  return res.status(501).json({ error: 'not-implemented' });
}
```

Only build this if you're seeing real abuse. For a private-client
brand at low volume, Option A + unlisted URLs is plenty.

---

## Step 4 — reconcile bookings with payments

Whichever option you pick, Stripe attaches a `session_id` and (if
enabled) a `client_reference_id` to the redirect URL. Both are
visible in the Stripe dashboard under **Payments → All payments**
and can be cross-checked against the calendar booking's timestamp
and customer email:

- Payment received in Stripe → email to customer → they redirect to
  Calendar and book a slot within ~15 minutes → you get the Calendar
  booking notification.
- If a payment lands with no matching calendar booking within
  24 hours, follow up manually.
- If a calendar booking lands with no matching payment (Option A
  only), it's either a mistake or an attempted freebie — cancel and
  reach out to clarify.

Consider adding a rule to your inbox that tags Stripe
`payment_intent.succeeded` emails and Google Calendar booking
notifications with the same colour, or forward both into a
dedicated "Bookings" label so the daily reconciliation takes
30 seconds.

---

## Step 5 — the fallback enquiry link

Under every tier card the site shows **"Questions before you pay?
Send an enquiry"** — this jumps to the `#contact` form (Web3Forms,
already wired). Hesitant buyers can ask questions before committing;
you reply from your inbox as usual. This path bypasses Stripe
entirely, so you can also use it to send a manual invoice / bespoke
quote (e.g. custom 3-session bundle, mid-cycle pause on the Monthly
Programme).

---

## Testing checklist before flipping to live

- [ ] Every `REPLACE_…` placeholder in `index.html` is a real
      Stripe URL. Grep: `grep -r 'REPLACE_' index.html` should
      return **zero** lines that aren't inside a comment.
- [ ] Each Payment Link's price matches the tier card price
      (visitor never sees a mismatch at checkout).
- [ ] The **Confirmation page → Redirect** on every Payment Link
      points at the right Google Calendar booking page (a Nutrition
      payment should not land on the Fitness calendar).
- [ ] Making a test payment with Stripe's test card
      (`4242 4242 4242 4242`, any future date, any CVC) redirects
      you to the calendar, and picking a slot fires both a Stripe
      `payment_intent.succeeded` and a Google Calendar booking
      notification into your inbox.
- [ ] `#panel-personal-training` shows **no public price** and the
      **Apply for a place** form submits a Web3Forms envelope — no
      Stripe.
- [ ] The `#contact` enquiry form still works from the "Send an
      enquiry" fallback link.

Ship Option A first. If bookings-without-payments start showing up,
build Option B.
