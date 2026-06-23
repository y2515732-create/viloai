CREATE TABLE "vilo_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"vilo_number" text,
	"twilio_sid" text,
	"eleven_labs_phone_id" text,
	"stripe_session_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vilo_users_email_unique" UNIQUE("email"),
	CONSTRAINT "vilo_users_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
