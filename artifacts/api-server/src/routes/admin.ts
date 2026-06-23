import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { provisionViloNumber } from "../lib/provision";

const router = Router();

function requireAdminPassword(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(503).json({ error: "Admin access not configured" });
    return;
  }

  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (token !== adminPassword) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

router.get("/admin/users", requireAdminPassword, async (req, res) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? null,
        viloNumber: u.viloNumber ?? null,
        twilioSid: u.twilioSid ?? null,
        elevenLabsPhoneId: u.elevenLabsPhoneId ?? null,
        stripeSessionId: u.stripeSessionId ?? null,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      })),
      total: users.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list admin users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/users/:id/retry", requireAdminPassword, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.status !== "failed") {
      res.status(400).json({ error: `Cannot retry — user status is "${user.status}", expected "failed"` });
      return;
    }

    // Reset to pending and clear stale provisioning fields
    await db
      .update(usersTable)
      .set({
        status: "pending",
        viloNumber: null,
        twilioSid: null,
        elevenLabsPhoneId: null,
      })
      .where(eq(usersTable.id, id));

    req.log.info({ userId: id, email: user.email }, "Retrying provisioning");

    const log = req.log as { info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void };

    // Fire-and-forget — return immediately so the client isn't left hanging
    provisionViloNumber(log, user.email, user.name, user.phone ?? "").catch(async (err) => {
      req.log.error({ err, userId: id }, "Retry provisioning failed");
      await db.update(usersTable).set({ status: "failed" }).where(eq(usersTable.id, id));
    });

    res.json({ success: true, message: "Provisioning restarted — status will update to active within ~30 seconds." });
  } catch (err) {
    req.log.error({ err }, "Failed to retry provisioning");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
