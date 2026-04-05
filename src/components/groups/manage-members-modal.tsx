import type { GroupMemberFriendCandidate } from "@/hooks/use-group-member-management"
import { GroupMemberManagementPanel } from "@/components/groups/group-member-management-panel"
import { useIsMobile } from "@/hooks/use-mobile"
import { useGroupMemberManagement } from "@/hooks/use-group-member-management"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

type ManageMembersModalProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  groupId: string
  groupName: string
  canManageMembers: boolean
  viewerRole: string
  friendCandidates: Array<GroupMemberFriendCandidate>
}

export function ManageMembersModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  canManageMembers,
  viewerRole,
  friendCandidates,
}: ManageMembersModalProps) {
  const isMobile = useIsMobile()
  const memberManagement = useGroupMemberManagement({
    enabled: open,
    groupId,
    groupName,
    friendCandidates,
    isMobile,
  })

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92svh] rounded-t-3xl border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.95))]">
          <DrawerHeader className="items-start px-4 pb-2 text-left">
            <DrawerTitle className="text-xl">Manage members</DrawerTitle>
            <DrawerDescription>
              Invite, remove, and track pending members for {groupName}.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            <GroupMemberManagementPanel
              variant="modal"
              viewerRole={viewerRole}
              canManageMembers={canManageMembers}
              isMobile={isMobile}
              controller={memberManagement}
            />
          </div>
          <DrawerFooter className="border-t border-border/70 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)]">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl gap-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.94))] p-0 shadow-[0_24px_56px_rgba(24,30,23,0.18)]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-2xl">Manage members</DialogTitle>
          <DialogDescription>
            Invite, remove, and track pending members for {groupName}.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-4">
          <GroupMemberManagementPanel
            variant="modal"
            viewerRole={viewerRole}
            canManageMembers={canManageMembers}
            isMobile={isMobile}
            controller={memberManagement}
          />
        </div>
        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
