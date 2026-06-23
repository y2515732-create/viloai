import twilio from "twilio";
import axios from "axios";
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

  // 2. Import the number into ElevenLabs Conversational AI
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

  // 3. Assign the agent to the phone number
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (agentId) {
    await axios.patch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`,
      { agent_id: agentId },
      { headers: elevenHeaders },
    );
    log.info({ phoneNumberId, agentId }, "Agent assigned to phone number");
  } else {
    log.error({}, "ELEVENLABS_AGENT_ID not set — number imported but no agent assigned");
  }

  // 4. Persist and mark active
  await db
    .update(usersTable)
    .set({
      viloNumber,
      twilioSid: purchased.sid,
      elevenLabsPhoneId: phoneNumberId,
      status: "active",
    })
    .where(eq(usersTable.email, userEmail));

  // 5. Send welcome SMS
  if (userPhone && process.env.TWILIO_MAIN_NUMBER) {
    await twilioClient.messages.create({
      body: `Welcome to Vilo AI, ${userName}! Your personal number ${viloNumber} is now LIVE. Call it anytime.`,
      from: process.env.TWILIO_MAIN_NUMBER,
      to: userPhone,
    });
  }

  log.info({ userEmail, viloNumber }, "Vilo AI fully provisioned");
}
