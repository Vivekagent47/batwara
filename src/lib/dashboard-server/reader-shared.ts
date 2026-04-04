// Shared reader-side helpers for building small view models.
import type { FriendInfo } from "./types"

export function createFriendCandidateList(friends: Array<FriendInfo>) {
  const friendCandidateMap = new Map<
    string,
    {
      id: string
      name: string
      email: string
    }
  >()

  for (const friend of friends) {
    if (!friendCandidateMap.has(friend.otherUser.id)) {
      friendCandidateMap.set(friend.otherUser.id, {
        id: friend.otherUser.id,
        name: friend.otherUser.name,
        email: friend.otherUser.email,
      })
    }
  }

  return Array.from(friendCandidateMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}
