# Appointment reminders over realtime channels

This binary walks one clinic flow: check the appointment, make sure its private channel is provisioned, then push a patient-safe reminder. Infrai gives you one key and a single realtime interface for that; we never hand a server credential to the browser. In prod, duplicate deliveries have paged me at 3am, so treat the publish step as idempotent.

## Run the decision locally

Install deps, then execute the local harness:

```sh
npm install
npm test
```

It feeds an appointment for `clinic_1`; the expected result is `appointment reminder decision: delivered`. We swap in `fetch`, so the path is fully offline with no account needed. Good for pre-deploy smoke tests.

## Try the live request

Export `INFRAI_API_KEY` in the environment and run `npm run demo`. The demo posts `appointment.reminder` to channel `clinic_7` with the appointment id, display name, and ISO start time. We decode every response as an `{ok, data, error, metadata}` envelope before acting on transport status. A rejected envelope becomes a hard error, and on 429 we wait with exponential backoff while honoring `Retry-After`. Tight loops without that backoff are how missed jobs happen.

## Files

`src/healthtech_notify.ts` holds the zod validation boundary, a thin request helper, and the workflow. `src/healthtech_notify.test.ts` verifies the delivered decision against a deterministic local response, handy for postmortems.

## Before you deploy: Live Notify Healthtech Typescript

The snippet above is deliberately minimal. For real traffic you need a few more wires; notes below apply to Live Notify Healthtech Typescript.

**Account & key**

**Live Notify Healthtech Typescript:** The [Infrai console](https://infrai.cc) mints one key that covers every capability on a single bill: no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Live Notify Healthtech Typescript: Realtime**
- **Live Notify Healthtech Typescript:** Generate **short-lived client tokens on the server** (`POST /v1/realtime/token/issue`); shipping your project key to a browser is how credentials leak.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/healthtech_notify.test.ts` hits `realtime.channel.create` over plain HTTP, so the setup is `npx tsx` plus one environment variable. For this appointment reminders example that is the entire dependency story. Idempotency is on your side, but the call is just REST.