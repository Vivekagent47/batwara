// Shared dashboard server types and constants used across read/write modules.
export type LedgerContextType = "group" | "friend"
export type ExpenseSplitMethod = "equal" | "exact" | "percentage" | "shares"

export type LedgerUser = {
  id: string
  name: string
  email: string
}

export type SplitInputLine = {
  userId: string
  value?: number
}

export type TransferSuggestion = {
  payerUserId: string
  payeeUserId: string
  amountMinor: number
}

export type PairwiseBalanceSummary = {
  direction: "pay" | "collect"
  amountMinor: number
}

export type PairwiseSuggestion = TransferSuggestion & {
  counterparty: {
    id: string
    name: string
  }
  direction: "pay" | "collect"
}

export type ActivityItem = {
  id: string
  action: string
  summary: string
  entityType: string
  entityId: string
  createdAt: Date
  actor: {
    id: string
    name: string
  }
  expenseImpact: PairwiseBalanceSummary | null
}

export type GroupInfo = {
  id: string
  name: string
  slug: string
  role: string
  memberCount: number
  simplifyDebts: boolean
  defaultCurrency: string
  netMinor: number
}

export type FriendInfo = {
  id: string
  otherUser: {
    id: string
    name: string
    email: string
  }
  status: string
}

export type FriendPairExpenseItem = {
  id: string
  title: string
  totalAmountMinor: number
  incurredAt: Date
  paidByUserId: string
  paidByName: string
  organizationId: string | null
  organizationName: string | null
  contextType: "group" | "direct"
  contextName: string
  pairImpact: PairwiseBalanceSummary
}

export type ContextMember = {
  id: string
  name: string
  email: string
}

export type SettlementCounterparty = {
  id: string
  name: string
  email: string
  isFriend: boolean
  sharedGroupCount: number
  friendLinkId: string | null
}

export type PendingInvitationItem = {
  id: string
  organizationName: string
  invitedEmail: string
  role: string
  createdAt: Date
  expiresAt: Date
}

export type UserLookup = Map<string, LedgerUser>

export const GROUP_EXPENSE_PAGE_SIZE = 15
export const FRIEND_EXPENSE_PAGE_SIZE = 20
