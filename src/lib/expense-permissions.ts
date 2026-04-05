export function canManageExpense(
  currentUserId: string,
  createdByUserId: string
) {
  return currentUserId === createdByUserId
}
