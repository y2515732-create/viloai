import { Router } from "express";
import Stripe from "stripe";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { provisionViloNumber } from "../lib/provision";

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

    const userEmail = session.metadata?.userEmail || session.customer_email || "";
    const userName = session.metadata?.userName ?? "";
    const userPhone = session.metadata?.userPhone ?? "";
    const sessionId = session.id;

    if (!userEmail) {
      req.log.error({ sessionId }, "No email found on session — skipping provisioning");
      res.status(200).send("OK");
      return;
    }

    // Idempotency — skip if this session was already processed
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

export default router;
