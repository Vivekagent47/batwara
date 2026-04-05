import { BookOpenTextIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { siteConfig } from "@/lib/site-config"
import { cn } from "@/lib/utils"

type BrandMarkSize = "sm" | "md" | "lg"

type BrandMarkProps = {
  className?: string
  iconContainerClassName?: string
  iconClassName?: string
  labelClassName?: string
  showLabel?: boolean
  size?: BrandMarkSize
  strokeWidth?: number
}

const brandSizes: Record<
  BrandMarkSize,
  {
    iconContainer: string
    icon: string
    label: string
  }
> = {
  sm: {
    iconContainer: "h-8 w-8",
    icon: "size-3.5",
    label: "text-lg",
  },
  md: {
    iconContainer: "h-9 w-9",
    icon: "size-4",
    label: "text-xl",
  },
  lg: {
    iconContainer: "h-11 w-11",
    icon: "size-5",
    label: "text-2xl",
  },
}

export function BrandMark({
  className,
  iconContainerClassName,
  iconClassName,
  labelClassName,
  showLabel = true,
  size = "md",
  strokeWidth = 1.7,
}: BrandMarkProps) {
  const classes = brandSizes[size]

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(26,107,60,0.18)]",
          classes.iconContainer,
          iconContainerClassName
        )}
      >
        <HugeiconsIcon
          icon={BookOpenTextIcon}
          className={cn(classes.icon, iconClassName)}
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />
      </span>
      {showLabel ? (
        <span
          className={cn(
            "font-heading tracking-normal text-foreground normal-case",
            classes.label,
            labelClassName
          )}
        >
          {siteConfig.name}
        </span>
      ) : null}
    </span>
  )
}
