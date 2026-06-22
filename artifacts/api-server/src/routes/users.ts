import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router = Router();

router.get("/users/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const [user] = await db
      .select({
        status: usersTable.status,
        viloNumber: usersTable.viloNumber,
      })
      .from(usersTable)
      .where(eq(usersTable.stripeSessionId, sessionId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json({
      status: user.status,
      viloNumber: user.viloNumber ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get provisioning status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
