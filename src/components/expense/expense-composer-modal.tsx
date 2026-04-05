import type { ReactNode } from "react"

import { useIsMobile } from "@/hooks/use-mobile"
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

type ExpenseComposerModalProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
}

export function ExpenseComposerModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ExpenseComposerModalProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90svh] rounded-t-3xl border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.95))]">
          <DrawerHeader className="items-start px-4 pb-2 text-left">
            <DrawerTitle className="text-xl">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
            {children}
          </div>
          <DrawerFooter className="border-t border-border/70 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)]">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 rounded-3xl border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,236,0.94))] p-0 shadow-[0_24px_56px_rgba(24,30,23,0.18)]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="max-h-[62vh] overflow-y-auto px-6 py-4">{children}</div>
        <DialogFooter className="border-t border-border/70 px-6 py-4">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
