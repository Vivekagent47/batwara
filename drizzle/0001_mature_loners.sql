CREATE TABLE "activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"friend_link_id" text,
	"actor_user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"friend_link_id" text,
	"created_by_user_id" text NOT NULL,
	"paid_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"currency" text DEFAULT 'INR' NOT NULL,
	"total_amount_minor" integer NOT NULL,
	"split_method" text NOT NULL,
	"split_meta" text,
	"incurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"user_id" text NOT NULL,
	"paid_amount_minor" integer DEFAULT 0 NOT NULL,
	"owed_amount_minor" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_link" (
	"id" text PRIMARY KEY NOT NULL,
	"pair_key" text NOT NULL,
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "friend_link_pair_key_unique" UNIQUE("pair_key")
);
--> statement-breakpoint
CREATE TABLE "group_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"default_currency" text DEFAULT 'INR' NOT NULL,
	"simplify_debts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"friend_link_id" text,
	"payer_user_id" text NOT NULL,
	"payee_user_id" text NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"amount_minor" integer NOT NULL,
	"note" text,
	"settled_at" timestamp DEFAULT now() NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_friend_link_id_friend_link_id_fk" FOREIGN KEY ("friend_link_id") REFERENCES "public"."friend_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_friend_link_id_friend_link_id_fk" FOREIGN KEY ("friend_link_id") REFERENCES "public"."friend_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_paid_by_user_id_user_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participant" ADD CONSTRAINT "expense_participant_expense_id_expense_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_participant" ADD CONSTRAINT "expense_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_link" ADD CONSTRAINT "friend_link_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_link" ADD CONSTRAINT "friend_link_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_link" ADD CONSTRAINT "friend_link_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_settings" ADD CONSTRAINT "group_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_friend_link_id_friend_link_id_fk" FOREIGN KEY ("friend_link_id") REFERENCES "public"."friend_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_payer_user_id_user_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_payee_user_id_user_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_org_idx" ON "activity_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "activity_log_friend_idx" ON "activity_log" USING btree ("friend_link_id");--> statement-breakpoint
CREATE INDEX "activity_log_actor_idx" ON "activity_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expense_organization_idx" ON "expense" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "expense_friend_link_idx" ON "expense" USING btree ("friend_link_id");--> statement-breakpoint
CREATE INDEX "expense_incurred_at_idx" ON "expense" USING btree ("incurred_at");--> statement-breakpoint
CREATE INDEX "expense_paid_by_idx" ON "expense" USING btree ("paid_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_participant_expense_user_uidx" ON "expense_participant" USING btree ("expense_id","user_id");--> statement-breakpoint
CREATE INDEX "expense_participant_expense_idx" ON "expense_participant" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_participant_user_idx" ON "expense_participant" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_link_pair_key_uidx" ON "friend_link" USING btree ("pair_key");--> statement-breakpoint
CREATE INDEX "friend_link_user_a_idx" ON "friend_link" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX "friend_link_user_b_idx" ON "friend_link" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX "settlement_organization_idx" ON "settlement" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "settlement_friend_link_idx" ON "settlement" USING btree ("friend_link_id");--> statement-breakpoint
CREATE INDEX "settlement_payer_idx" ON "settlement" USING btree ("payer_user_id");--> statement-breakpoint
CREATE INDEX "settlement_payee_idx" ON "settlement" USING btree ("payee_user_id");--> statement-breakpoint
CREATE INDEX "settlement_settled_at_idx" ON "settlement" USING btree ("settled_at");