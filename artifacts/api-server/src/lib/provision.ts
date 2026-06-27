import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type ProvisionLog = {
  info: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
};

export async function provisionViloNumber(
  log: ProvisionLog,
  userEmail: string,
  userName: string,
  userPhone: string,
) {
  await db
    .update(usersTable)
    .set({ status: "active" })
    .where(eq(usersTable.email, userEmail));

  log.info({ userEmail }, "User marked active");

  if (userPhone && process.env.TELNYX_PHONE_NUMBER) {
    const response = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connection_id: process.env.TELNYX_APP_ID,
        to: userPhone,
        from: process.env.TELNYX_PHONE_NUMBER,
        webhook_url: `${process.env.VILO_AGENT_URL}/incoming-call`,
      }),
    });
    const data = await response.json();
    log.info({ callId: data?.data?.call_leg_id, userPhone }, "Outbound call initiated");
  } else {
    log.error({}, "No phone number or Telnyx number configured");
  }

  log.info({ userEmail }, "Vilo outbound call completed");
}
