import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
)

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)]
)

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ]
)

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ]
)

export const friendLink = pgTable(
  "friend_link",
  {
    id: text("id").primaryKey(),
    pairKey: text("pair_key").notNull().unique(),
    userAId: text("user_a_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userBId: text("user_b_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("friend_link_pair_key_uidx").on(table.pairKey),
    index("friend_link_user_a_idx").on(table.userAId),
    index("friend_link_user_b_idx").on(table.userBId),
  ]
)

export const groupSettings = pgTable("group_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  defaultCurrency: text("default_currency").default("INR").notNull(),
  simplifyDebts: boolean("simplify_debts").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const expense = pgTable(
  "expense",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    friendLinkId: text("friend_link_id").references(() => friendLink.id, {
      onDelete: "cascade",
    }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    paidByUserId: text("paid_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    currency: text("currency").default("INR").notNull(),
    totalAmountMinor: integer("total_amount_minor").notNull(),
    splitMethod: text("split_method").notNull(),
    splitMeta: text("split_meta"),
    incurredAt: timestamp("incurred_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("expense_organization_idx").on(table.organizationId),
    index("expense_friend_link_idx").on(table.friendLinkId),
    index("expense_incurred_at_idx").on(table.incurredAt),
    index("expense_paid_by_idx").on(table.paidByUserId),
  ]
)

export const expenseParticipant = pgTable(
  "expense_participant",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expense.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    paidAmountMinor: integer("paid_amount_minor").default(0).notNull(),
    owedAmountMinor: integer("owed_amount_minor").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("expense_participant_expense_user_uidx").on(
      table.expenseId,
      table.userId
    ),
    index("expense_participant_expense_idx").on(table.expenseId),
    index("expense_participant_user_idx").on(table.userId),
  ]
)

export const settlement = pgTable(
  "settlement",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    friendLinkId: text("friend_link_id").references(() => friendLink.id, {
      onDelete: "cascade",
    }),
    payerUserId: text("payer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    payeeUserId: text("payee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currency: text("currency").default("INR").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    note: text("note"),
    settledAt: timestamp("settled_at").defaultNow().notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("settlement_organization_idx").on(table.organizationId),
    index("settlement_friend_link_idx").on(table.friendLinkId),
    index("settlement_payer_idx").on(table.payerUserId),
    index("settlement_payee_idx").on(table.payeeUserId),
    index("settlement_settled_at_idx").on(table.settledAt),
  ]
)

export const settlementAllocation = pgTable(
  "settlement_allocation",
  {
    id: text("id").primaryKey(),
    settlementId: text("settlement_id")
      .notNull()
      .references(() => settlement.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    friendLinkId: text("friend_link_id").references(() => friendLink.id, {
      onDelete: "cascade",
    }),
    payerUserId: text("payer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    payeeUserId: text("payee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountMinor: integer("amount_minor").notNull(),
    allocationOrder: integer("allocation_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("settlement_allocation_settlement_idx").on(table.settlementId),
    index("settlement_allocation_organization_idx").on(table.organizationId),
    index("settlement_allocation_friend_link_idx").on(table.friendLinkId),
    index("settlement_allocation_payer_idx").on(table.payerUserId),
    index("settlement_allocation_payee_idx").on(table.payeeUserId),
  ]
)

export const activityLog = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    friendLinkId: text("friend_link_id").references(() => friendLink.id, {
      onDelete: "cascade",
    }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_log_org_idx").on(table.organizationId),
    index("activity_log_friend_idx").on(table.friendLinkId),
    index("activity_log_actor_idx").on(table.actorUserId),
    index("activity_log_created_at_idx").on(table.createdAt),
  ]
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  friendLinksAsUserA: many(friendLink, { relationName: "friend_link_user_a" }),
  friendLinksAsUserB: many(friendLink, { relationName: "friend_link_user_b" }),
  createdFriendLinks: many(friendLink, { relationName: "friend_link_creator" }),
  expensesPaid: many(expense, { relationName: "expense_paid_by" }),
  expensesCreated: many(expense, { relationName: "expense_created_by" }),
  expenseParticipants: many(expenseParticipant),
  settlementsPaid: many(settlement, { relationName: "settlement_payer" }),
  settlementsReceived: many(settlement, { relationName: "settlement_payee" }),
  settlementsCreated: many(settlement, {
    relationName: "settlement_created_by",
  }),
  settlementAllocationsPaid: many(settlementAllocation, {
    relationName: "settlement_allocation_payer",
  }),
  settlementAllocationsReceived: many(settlementAllocation, {
    relationName: "settlement_allocation_payee",
  }),
  activityLogs: many(activityLog),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many, one }) => ({
  members: many(member),
  invitations: many(invitation),
  expenses: many(expense),
  settlements: many(settlement),
  settlementAllocations: many(settlementAllocation),
  activities: many(activityLog),
  settings: one(groupSettings),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}))

export const friendLinkRelations = relations(friendLink, ({ one, many }) => ({
  userA: one(user, {
    fields: [friendLink.userAId],
    references: [user.id],
    relationName: "friend_link_user_a",
  }),
  userB: one(user, {
    fields: [friendLink.userBId],
    references: [user.id],
    relationName: "friend_link_user_b",
  }),
  createdBy: one(user, {
    fields: [friendLink.createdByUserId],
    references: [user.id],
    relationName: "friend_link_creator",
  }),
  expenses: many(expense),
  settlements: many(settlement),
  settlementAllocations: many(settlementAllocation),
  activities: many(activityLog),
}))

export const groupSettingsRelations = relations(groupSettings, ({ one }) => ({
  organization: one(organization, {
    fields: [groupSettings.organizationId],
    references: [organization.id],
  }),
}))

export const expenseRelations = relations(expense, ({ one, many }) => ({
  organization: one(organization, {
    fields: [expense.organizationId],
    references: [organization.id],
  }),
  friendLink: one(friendLink, {
    fields: [expense.friendLinkId],
    references: [friendLink.id],
  }),
  createdBy: one(user, {
    fields: [expense.createdByUserId],
    references: [user.id],
    relationName: "expense_created_by",
  }),
  paidBy: one(user, {
    fields: [expense.paidByUserId],
    references: [user.id],
    relationName: "expense_paid_by",
  }),
  participants: many(expenseParticipant),
}))

export const expenseParticipantRelations = relations(
  expenseParticipant,
  ({ one }) => ({
    expense: one(expense, {
      fields: [expenseParticipant.expenseId],
      references: [expense.id],
    }),
    user: one(user, {
      fields: [expenseParticipant.userId],
      references: [user.id],
    }),
  })
)

export const settlementRelations = relations(settlement, ({ one, many }) => ({
  organization: one(organization, {
    fields: [settlement.organizationId],
    references: [organization.id],
  }),
  friendLink: one(friendLink, {
    fields: [settlement.friendLinkId],
    references: [friendLink.id],
  }),
  payer: one(user, {
    fields: [settlement.payerUserId],
    references: [user.id],
    relationName: "settlement_payer",
  }),
  payee: one(user, {
    fields: [settlement.payeeUserId],
    references: [user.id],
    relationName: "settlement_payee",
  }),
  createdBy: one(user, {
    fields: [settlement.createdByUserId],
    references: [user.id],
    relationName: "settlement_created_by",
  }),
  allocations: many(settlementAllocation),
}))

export const settlementAllocationRelations = relations(
  settlementAllocation,
  ({ one }) => ({
    settlement: one(settlement, {
      fields: [settlementAllocation.settlementId],
      references: [settlement.id],
    }),
    organization: one(organization, {
      fields: [settlementAllocation.organizationId],
      references: [organization.id],
    }),
    friendLink: one(friendLink, {
      fields: [settlementAllocation.friendLinkId],
      references: [friendLink.id],
    }),
    payer: one(user, {
      fields: [settlementAllocation.payerUserId],
      references: [user.id],
      relationName: "settlement_allocation_payer",
    }),
    payee: one(user, {
      fields: [settlementAllocation.payeeUserId],
      references: [user.id],
      relationName: "settlement_allocation_payee",
    }),
  })
)

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  organization: one(organization, {
    fields: [activityLog.organizationId],
    references: [organization.id],
  }),
  friendLink: one(friendLink, {
    fields: [activityLog.friendLinkId],
    references: [friendLink.id],
  }),
  actor: one(user, {
    fields: [activityLog.actorUserId],
    references: [user.id],
  }),
}))
