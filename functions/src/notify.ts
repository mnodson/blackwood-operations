import type Stripe from 'stripe';
import type { PlanId, SignupRequest } from './signup.js';
import { US_STATES } from './states.js';

const PROJECT_ID = 'blackwood-operations';
const STORAGE_BUCKET = 'blackwood-operations.firebasestorage.app';

const PLAN_NAMES: Record<PlanId, string> = {
  essential: 'Essential',
  practice: 'Practice',
  group: 'Group'
};

/** Brand colours, matching the tokens in src/styles.scss. */
const BRAND = {
  dark: '#0f1419',
  accent: '#1d748e',
  text: '#1a1a1a',
  muted: '#5a5a5a',
  border: '#e5e3df',
  cream: '#f5f3ef',
  page: '#faf9f7'
} as const;

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

/** The addressing and content of one email; the sender is added by the caller. */
export interface OrderEmail {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}

export type OrderOutcome = 'paid' | 'failed';

/** Everything known about an order when the Stripe webhook reports on it. */
export interface OrderDetails {
  signupId: string;
  signup: SignupRequest;
  session: Stripe.Checkout.Session;
  /** Direct download link for the uploaded notice, when there is one. */
  noticeDownloadUrl: string | null;
}

const INTRO: Record<OrderOutcome, string> = {
  paid: 'A new compliance order has been paid. Delivery is due within five business days.',
  failed:
    'A payment failed after checkout, so this order has not been paid. The customer was told ' +
    'we would reach out — please contact them to help complete it.'
};

/** The internal email sent to the team when an order is paid or its payment fails. */
export function teamOrderEmail(
  outcome: OrderOutcome,
  to: string,
  { signupId, signup, session, noticeDownloadUrl }: OrderDetails
): OrderEmail {
  const plan = PLAN_NAMES[signup.plan];
  const stripeBase = `https://dashboard.stripe.com${session.livemode ? '' : '/test'}`;
  const paymentLink =
    typeof session.subscription === 'string'
      ? `${stripeBase}/subscriptions/${session.subscription}`
      : typeof session.payment_intent === 'string'
        ? `${stripeBase}/payments/${session.payment_intent}`
        : `${stripeBase}/checkout/sessions/${session.id}`;
  const signupLink =
    `https://console.firebase.google.com/project/${PROJECT_ID}` +
    `/firestore/databases/-default-/data/~2Fsignups~2F${signupId}`;
  const noticeFileName = fileNameOf(signup);
  // Console folder link only as a fallback if a download link could not be made.
  const noticeConsoleLink = signup.noticeUploadPath && !noticeDownloadUrl
    ? `https://console.firebase.google.com/project/${PROJECT_ID}/storage/${STORAGE_BUCKET}` +
      `/files/~2F${signup.noticeUploadPath.split('/').slice(0, -1).map(encodeURIComponent).join('~2F')}`
    : null;

  const practiceType = signup.practice.typeOther
    ? `${signup.practice.type} (${signup.practice.typeOther})`
    : signup.practice.type;
  const billing = session.customer_details;

  const rows: [string, string][] = [
    ['Order reference', signupId],
    ['Plan', plan],
    ['Monitoring', signup.monitoring ? 'Yes — monthly' : 'No'],
    [outcome === 'paid' ? 'Paid' : 'Amount due', formatAmount(session.amount_total, session.currency)],
    ['Practice', signup.practice.name],
    ['Practice type', practiceType],
    ['Number of locations', String(signup.practice.locationCount)],
    ['States', signup.practice.states.map(code => US_STATES[code] ?? code).join(', ')],
    ['Has a current notice', signup.practice.hasNotice],
    ['Contact', signup.contact.name],
    ['Email', signup.contact.email],
    ['Phone', signup.contact.phone],
    ['Billing name', billing?.name ?? 'Not provided'],
    ['Billing address', formatAddress(billing?.address) ?? 'Not provided'],
    ['Uploaded notice', noticeFileName ?? 'None']
  ];

  const links: [string, string | null][] = [
    ['Payment in Stripe', paymentLink],
    ['Signup record', signupLink],
    ['Uploaded notice (Firebase console)', noticeConsoleLink]
  ];

  const order = `${signup.practice.name} — ${plan}` + (signup.monitoring ? ' + monitoring' : '');
  const subject = outcome === 'paid' ? `New order: ${order}` : `Payment failed: ${order}`;

  const text = [
    INTRO[outcome],
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    ...(noticeDownloadUrl ? [`Download uploaded notice: ${noticeDownloadUrl}`, ''] : []),
    ...links.filter(hasUrl).map(([label, url]) => `${label}: ${url}`)
  ].join('\n');

  const html = layout({
    preheader: INTRO[outcome],
    heading: outcome === 'paid' ? 'New order received' : 'Payment failed',
    body: [
      paragraph(INTRO[outcome]),
      detailsTable(rows),
      noticeDownloadUrl
        ? button(noticeDownloadUrl, `Download uploaded notice (${noticeFileName ?? 'file'})`)
        : '',
      paragraph(
        links
          .filter(hasUrl)
          .map(([label, url]) => `<a href="${escape(url)}" style="color:${BRAND.accent}">${escape(label)}</a>`)
          .join(' &middot; '),
        { raw: true }
      )
    ].join('\n')
  });

  return { to, replyTo: signup.contact.email, subject, text, html };
}

/** The confirmation sent to the customer once their order is paid. */
export function customerConfirmationEmail(
  replyTo: string,
  { signupId, signup, session }: OrderDetails
): OrderEmail {
  const plan = PLAN_NAMES[signup.plan];
  const firstName = signup.contact.name.split(/\s+/)[0];
  const noticeFileName = fileNameOf(signup);
  const paid = formatAmount(session.amount_total, session.currency);

  const rows: [string, string][] = [
    ['Order reference', signupId],
    ['Practice', signup.practice.name],
    ['Plan', `${plan} — one-time notice update`],
    ...(signup.monitoring ? [['Monitoring', 'Billed monthly, cancel anytime'] as [string, string]] : []),
    ['Paid today', paid]
  ];

  const steps: [string, string][] = [
    [
      'We start on your notice',
      'We review what you told us and draft a corrected Notice of Privacy Practices for your ' +
        'practice and states.'
    ],
    [
      'Delivered within five business days',
      signup.monitoring
        ? 'Your notice arrives in every format you need, and we keep it current from there.'
        : 'Your notice arrives in every format you need, and it is yours to keep.'
    ],
    [
      'Your receipt',
      signup.monitoring
        ? 'Stripe emails your receipt separately. Monitoring is billed monthly and you can cancel anytime.'
        : 'Stripe emails your receipt separately. This was a one-time payment — nothing recurring.'
    ]
  ];

  const intro =
    `Thank you for your order. Your payment went through, and we have started on the ` +
    `Notice of Privacy Practices for ${signup.practice.name}.`;
  const received = noticeFileName
    ? `We received your current notice (${noticeFileName}) and will work from it.`
    : null;
  const questions = `Questions? Just reply to this email or write to ${replyTo}.`;

  const subject = `Your order is confirmed — ${plan} notice update`;

  const text = [
    `Hi ${firstName},`,
    '',
    intro,
    ...(received ? ['', received] : []),
    '',
    'YOUR ORDER',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'WHAT HAPPENS NEXT',
    ...steps.map(([title, body], i) => `${i + 1}. ${title} — ${body}`),
    '',
    questions,
    '',
    '— The Blackwood Operations team'
  ].join('\n');

  const html = layout({
    preheader: `Order confirmed for ${signup.practice.name}. Delivery within five business days.`,
    heading: 'Your order is confirmed',
    body: [
      paragraph(`Hi ${firstName},`),
      paragraph(intro),
      received ? paragraph(received) : '',
      subheading('Your order'),
      detailsTable(rows),
      subheading('What happens next'),
      stepsList(steps),
      paragraph(
        `Questions? Just reply to this email or write to ` +
          `<a href="mailto:${escape(replyTo)}" style="color:${BRAND.accent}">${escape(replyTo)}</a>.`,
        { raw: true }
      ),
      paragraph('— The Blackwood Operations team')
    ].join('\n')
  });

  return { to: signup.contact.email, replyTo, subject, text, html };
}

/** Table-based wrapper with inline styles, which is what email clients render reliably. */
function layout({ preheader, heading, body }: { preheader: string; heading: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:4px">
<tr><td style="background:${BRAND.dark};padding:20px 28px;border-radius:4px 4px 0 0;font-family:${FONT};font-size:16px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff">Blackwood Operations</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;color:${BRAND.text}">${escape(heading)}</h1>
${body}
</td></tr>
<tr><td style="background:${BRAND.cream};padding:16px 28px;border-radius:0 0 4px 4px;font-family:${FONT};font-size:12px;line-height:1.5;color:${BRAND.muted}">Blackwood Operations &middot; <a href="mailto:admin@blackwoodops.com" style="color:${BRAND.muted}">admin@blackwoodops.com</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function paragraph(content: string, { raw = false } = {}): string {
  return (
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${BRAND.text}">` +
    `${raw ? content : escape(content)}</p>`
  );
}

function subheading(content: string): string {
  return (
    `<h2 style="margin:24px 0 8px;font-family:${FONT};font-size:13px;font-weight:600;` +
    `letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.muted}">${escape(content)}</h2>`
  );
}

function detailsTable(rows: [string, string][]): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top" style="padding:8px 16px 8px 0;border-bottom:1px solid ${BRAND.border};` +
        `font-family:${FONT};font-size:14px;font-weight:500;color:${BRAND.muted};white-space:nowrap">${escape(label)}</th>` +
        `<td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};font-family:${FONT};font-size:14px;` +
        `color:${BRAND.text}">${escape(value)}</td></tr>`
    )
    .join('\n');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse">\n${cells}\n</table>`;
}

function stepsList(steps: [string, string][]): string {
  const items = steps
    .map(
      ([title, body], i) =>
        `<tr><td valign="top" style="padding:8px 12px 8px 0;font-family:${FONT};font-size:14px;font-weight:600;color:${BRAND.accent}">${i + 1}</td>` +
        `<td style="padding:8px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${BRAND.text}">` +
        `<strong>${escape(title)}</strong><br><span style="color:${BRAND.muted}">${escape(body)}</span></td></tr>`
    )
    .join('\n');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">\n${items}\n</table>`;
}

function button(href: string, label: string): string {
  return (
    `<p style="margin:16px 0 24px"><a href="${escape(href)}" style="display:inline-block;padding:12px 20px;` +
    `background:${BRAND.accent};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;` +
    `text-decoration:none;border-radius:3px">${escape(label)}</a></p>`
  );
}

function fileNameOf(signup: SignupRequest): string | null {
  return signup.noticeUploadPath?.split('/').pop() ?? null;
}

function hasUrl(link: [string, string | null]): link is [string, string] {
  return link[1] !== null;
}

function formatAddress(address: Stripe.Address | null | undefined): string | null {
  if (!address) {
    return null;
  }
  const cityLine = [address.city, [address.state, address.postal_code].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const parts = [address.line1, address.line2, cityLine, address.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) {
    return 'Unknown';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency ?? 'usd').toUpperCase()
  }).format(amount / 100);
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
