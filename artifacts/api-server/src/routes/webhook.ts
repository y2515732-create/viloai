import { Router } from "express";
import Stripe from "stripe";
import twilio from "twilio";
import axios from "axios";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
});

type SimpleLog = {
  info: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
};

router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    res.status(400).send("Webhook secret not configured");
    return;
  }

  // Fix #1 (confirmed): express.raw() is applied before express.json() in
  // app.ts, so req.body is always the raw Buffer here — signature valid.
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Webhook signature verification failed");
    res.status(400).send(`Webhook Error: ${msg}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Fix #3: Use metadata.userEmail as the authoritative source (always set
    // by our checkout route). Fall back to session.customer_email only if
    // metadata is somehow missing.
    const userEmail = session.metadata?.userEmail || session.customer_email || "";
    const userName = session.metadata?.userName ?? "";
    const userPhone = session.metadata?.userPhone ?? "";
    const sessionId = session.id;

    if (!userEmail) {
      req.log.error({ sessionId }, "No email found on session — skipping provisioning");
      res.status(200).send("OK");
      return;
    }

    // Fix #2: Idempotency — check if this Stripe session has already been
    // processed. Stripe retries webhooks on non-2xx or timeouts, which
    // would otherwise buy a second Twilio number for the same customer.
    const [existing] = await db
      .select({ id: usersTable.id, status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.stripeSessionId, sessionId))
      .limit(1);

    if (existing) {
      req.log.info({ sessionId, status: existing.status }, "Session already processed — skipping");
      res.status(200).send("OK");
      return;
    }

    req.log.info({ userEmail, userName, sessionId }, "New paying customer — provisioning");

    // Insert with stripeSessionId as the idempotency key. The UNIQUE
    // constraint on stripe_session_id means a concurrent duplicate webhook
    // will fail the insert and also skip provisioning safely.
    const inserted = await db
      .insert(usersTable)
      .values({ name: userName, email: userEmail, phone: userPhone || null, stripeSessionId: sessionId, status: "pending" })
      .onConflictDoNothing()
      .returning({ id: usersTable.id });

    if (!inserted.length) {
      req.log.info({ sessionId }, "Concurrent duplicate insert detected — skipping");
      res.status(200).send("OK");
      return;
    }

    const log = req.log as SimpleLog;
    provisionViloNumber(log, userEmail, userName, userPhone).catch(
      (err) => req.log.error({ err, userEmail }, "Provisioning error"),
    );
  }

  res.status(200).send("OK");
});

async function provisionViloNumber(
  log: SimpleLog,
  userEmail: string,
  userName: string,
  userPhone: string,
) {
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  // 1. Buy a Twilio number
  const available = await twilioClient.availablePhoneNumbers("US").local.list({ limit: 3 });
  if (!available.length) throw new Error("No US local numbers available");

  const purchased = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: available[0].phoneNumber,
  });
  const viloNumber = purchased.phoneNumber;

  log.info({ viloNumber }, "Bought Twilio number");

  // 2. Import the number into ElevenLabs Conversational AI.
  //    Endpoint: POST /v1/convai/phone-numbers
  //    Docs: https://elevenlabs.io/docs/conversational-ai/phone-calls
  const elevenHeaders = {
    "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
    "Content-Type": "application/json",
  };

  const importRes = await axios.post<{ phone_number_id: string }>(
    "https://api.elevenlabs.io/v1/convai/phone-numbers",
    {
      provider: "twilio",
      phone_number: viloNumber,
      label: `Vilo-${userName}`,
      sid: process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
    },
    { headers: elevenHeaders },
  );

  const phoneNumberId = importRes.data?.phone_number_id;
  if (!phoneNumberId) throw new Error("ElevenLabs did not return a phone_number_id");

  log.info({ phoneNumberId }, "Imported number into ElevenLabs");

  // Fix #5: Assign the agent to the phone number.
  //    Endpoint: PATCH /v1/convai/phone-numbers/{phone_number_id}
  //    Without this step the number is imported but calls never route to
  //    an agent — they just ring out.
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`,
      { agent_id: agentId },
      { headers: elevenHeaders },
    );
    log.info({ phoneNumberId, agentId }, "Agent assigned to phone number");
  } else {
    log.error({}, "ELEVENLABS_AGENT_ID not set — number imported but no agent assigned. Calls will not route.");
  }

  // 3. Persist everything and mark active
  await db
    .update(usersTable)
    .set({
      viloNumber,
      twilioSid: purchased.sid,
      elevenLabsPhoneId: phoneNumberId,
      status: "active",
    })
    .where(eq(usersTable.email, userEmail));

  // 4. Send welcome SMS
  if (userPhone && process.env.TWILIO_MAIN_NUMBER) {
    await twilioClient.messages.create({
      body: `Welcome to Vilo AI, ${userName}! Your personal number ${viloNumber} is now LIVE. Call it anytime.`,
      from: process.env.TWILIO_MAIN_NUMBER,
      to: userPhone,
    });
  }

  log.info({ userEmail, viloNumber }, "Vilo AI fully provisioned");
}

export default router;
