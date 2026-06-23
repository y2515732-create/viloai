import { Router } from "express";
import Stripe from "stripe";
import rateLimit from "express-rate-limit";
import { CreateCheckoutBody } from "@workspace/api-zod";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-05-27.dahlia",
});

// Fix #4: Rate limit — max 5 checkout attempts per IP per 15 minutes.
// Each successful attempt can trigger a real Twilio number purchase.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please try again later." },
});

router.post("/checkout", checkoutLimiter, async (req, res) => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "userName and userEmail are required" });
    return;
  }

  const { userName, userEmail, userPhone } = parsed.data;

  try {
    // APP_URL is set on Render (and any non-Replit host).
    // REPLIT_DOMAINS is set in Replit dev/production.
    // Fall back to the request origin for local development.
    const origin =
      process.env.APP_URL ||
      (process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : (req.headers.origin ?? "http://localhost:3000"));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Vilo AI - Personal Voice Agent" },
            unit_amount: 398,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      // Fix #3: Always collect email via Stripe's built-in collector AND
      // store it in metadata so the webhook never has to rely solely on
      // session.customer_email (which can be null).
      customer_email: userEmail,
      metadata: {
        userName,
        userEmail,                    // redundant with customer_email but guaranteed non-null
        userPhone: userPhone ?? "",
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    req.log.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
