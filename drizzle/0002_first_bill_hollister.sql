CREATE TABLE "settlement_allocation" (
	"id" text PRIMARY KEY NOT NULL,
	"settlement_id" text NOT NULL,
	"organization_id" text,
	"friend_link_id" text,
	"payer_user_id" text NOT NULL,
	"payee_user_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"allocation_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_settlement_id_settlement_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_friend_link_id_friend_link_id_fk" FOREIGN KEY ("friend_link_id") REFERENCES "public"."friend_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_payer_user_id_user_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_allocation" ADD CONSTRAINT "settlement_allocation_payee_user_id_user_id_fk" FOREIGN KEY ("payee_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "settlement_allocation_settlement_idx" ON "settlement_allocation" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_organization_idx" ON "settlement_allocation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_friend_link_idx" ON "settlement_allocation" USING btree ("friend_link_id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_payer_idx" ON "settlement_allocation" USING btree ("payer_user_id");--> statement-breakpoint
CREATE INDEX "settlement_allocation_payee_idx" ON "settlement_allocation" USING btree ("payee_user_id");