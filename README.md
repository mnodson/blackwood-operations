# Client

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Deploying the prototype (Firebase Hosting)

The app is a static SPA, so Firebase Hosting serves `dist/client/browser` directly with a
catch-all rewrite to `index.html` (deep links like `/compliance/signup` work).

One-time setup:

```bash
npx firebase login
npx firebase projects:create blackwood-operations   # or use an existing project
```

Then set the project id in `.firebaserc` if it differs from `blackwood-operations`.

Share a build with someone:

```bash
npm run deploy:preview   # temporary URL, expires in 30 days — best for review
npm run deploy           # live site at https://<project-id>.web.app
```

`npm run serve:hosting` builds and runs the hosting emulator on http://localhost:5000 to check
the deployed behaviour locally.

## Backend: Stripe Checkout + Firebase

The compliance signup form (`/compliance/signup`) hands off to two Cloud Functions in
`functions/`:

| Function                | Trigger                 | What it does                                                                                                                       |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `createCheckoutSession` | callable, from the form | Validates the answers, writes `signups/{id}` to Firestore, opens a Stripe Checkout Session and returns its URL. The update alone uses payment mode; with monitoring it uses subscription mode, charging the one-time update on the first invoice. |
| `stripeWebhook`         | HTTPS, called by Stripe | Verifies the signature, sets `signups/{id}.status` to `paid`, and keeps `monitoringStatus` in step with any monitoring subscription (`none`, `pending`, `active`, `past_due`, `canceled`). On payment (or a failed delayed payment) it also writes an email to the `mail` collection, including a direct download link for any uploaded notice. |
| `getCheckoutSummary`    | callable, success page  | Confirms the returned `session_id` with Stripe and returns the plan, monitoring flag and amount paid for the order confirmation. |

Card details never touch our code — the visitor pays on Stripe's hosted page and returns to
`/compliance/signup/success`. The optional notice upload goes straight to Cloud Storage under
`notice-uploads/<random id>/` (write-only from the browser; see `storage.rules`).

### One-time setup

1. **Firebase**: the project must be on the Blaze plan for Cloud Functions. Enable Firestore
   and Storage in the console, then `npm install --prefix functions`.
2. **Stripe products**: for each plan create a one-time price for the document update
   (Essential $395, Practice $995, Group $2,795) and a recurring monthly price for monitoring
   (Essential $39, Practice $99, Group $299). Copy the six `price_…` ids into `functions/.env`
   (start from `functions/.env.example`). Set `APP_ORIGIN` to the site URL.
3. **Secrets** (never in `.env`):

   ```bash
   npx firebase functions:secrets:set STRIPE_SECRET_KEY      # sk_live_… / rk_live_… (restricted: Checkout Sessions write)
   npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET  # whsec_… from step 5
   npx firebase functions:secrets:set RESEND_API_KEY         # re_… from step 6
   ```

4. Deploy: `npm run deploy` (hosting, functions, Firestore and Storage rules together).
5. **Webhook**: in the Stripe dashboard add an endpoint pointing at
   `https://us-central1-blackwood-operations.cloudfunctions.net/stripeWebhook` subscribed to
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `customer.subscription.updated`,
   `customer.subscription.deleted` and `invoice.payment_failed`. Paste its signing secret into
   `STRIPE_WEBHOOK_SECRET` (step 3) and redeploy functions.

6. **Order emails** are sent with [Resend](https://resend.com). In Resend → Domains, add and
   verify `blackwoodops.com` (DNS records), then create an API key with sending access and
   store it as `RESEND_API_KEY` (step 3). When an order is paid, the team gets an email at
   `ORDER_NOTIFY_EMAIL` with the customer's details and a download link for any uploaded
   notice, and the customer gets a confirmation from `ORDER_FROM_EMAIL` with replies going to
   `ORDER_REPLY_TO_EMAIL`. All three default to `admin@blackwoodops.com` (see
   `functions/.env.example`); failed payments email the team only.
7. **Customer portal**: in Stripe → Settings → Billing → Customer portal, allow cancelling
   subscriptions and updating payment methods, then paste the portal's login link into
   `BILLING_PORTAL_URL` in `src/app/shared/billing.ts`. Portal links stay hidden until it is set.

### Local development

`ng serve` talks to the deployed functions by default. To use the local emulators instead,
set `USE_EMULATORS = true` in `src/app/shared/checkout.ts`. The Firestore and Storage
emulators need a Java runtime on the PATH.

```bash
cp functions/.env.example functions/.env.local            # test price ids, APP_ORIGIN=http://localhost:4200
printf 'STRIPE_SECRET_KEY=sk_test_…\nSTRIPE_WEBHOOK_SECRET=whsec_…\n' > functions/.secret.local
npm run emulators                                          # functions on :5001, firestore :8080, storage :9199
stripe listen --forward-to localhost:5001/blackwood-operations/us-central1/stripeWebhook
```

`stripe listen` prints the `whsec_…` to use in `.secret.local`. Use card `4242 4242 4242 4242`
on the Checkout page in test mode.
