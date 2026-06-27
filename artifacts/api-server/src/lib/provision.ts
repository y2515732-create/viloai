import Telnyx from "telnyx";
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
  const telnyxClient = new (Telnyx as any)(process.env.TELNYX_API_KEY!);

  // 1. Mark user as active in DB
  await db
    .update(usersTable)
    .set({ status: "active" })
    .where(eq(usersTable.email, userEmail));

  log.info({ userEmail }, "User marked active");

  // 2. Make outbound call to user via Telnyx
  if (userPhone && process.env.TELNYX_PHONE_NUMBER) {
    const call = await telnyxClient.calls.create({
      connection_id: process.env.TELNYX_APP_ID!,
      to: userPhone,
      from: process.env.TELNYX_PHONE_NUMBER!,
      webhook_url: `${process.env.VILO_AGENT_URL}/incoming-call`,
    });
    log.info({ callId: call.data?.call_leg_id, userPhone }, "Outbound call initiated");
  } else {
    log.error({}, "No phone number or Telnyx number configured");
  }

  log.info({ userEmail }, "Vilo outbound call completed");
}
