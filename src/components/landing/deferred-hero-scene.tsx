import { Suspense, lazy, startTransition, useEffect, useState } from "react"

import { HeroSceneFallback } from "@/components/landing/hero-scene-fallback"
import { appEnv } from "@/lib/env"

const LazyHeroScene = lazy(() =>
  import("@/components/landing/hero-scene").then((mod) => ({
    default: mod.HeroScene,
  }))
)

export function DeferredHeroScene() {
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (!appEnv.enableHeroScene) {
      return
    }

    const mobileQuery = window.matchMedia("(max-width: 768px)")
    const syncMobileState = () => {
      setIsMobile(mobileQuery.matches)
    }

    syncMobileState()

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined

    const loadScene = () => {
      startTransition(() => {
        setShouldLoad(true)
      })
    }

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(loadScene, { timeout: 1200 })
    } else {
      timeoutId = setTimeout(loadScene, 300)
    }

    mobileQuery.addEventListener("change", syncMobileState)

    return () => {
      mobileQuery.removeEventListener("change", syncMobileState)

      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId)
      }

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  if (!appEnv.enableHeroScene) {
    return <HeroSceneFallback />
  }

  if (isMobile && !appEnv.enableHeroSceneOnMobile) {
    return <HeroSceneFallback />
  }

  if (!shouldLoad) {
    return <HeroSceneFallback />
  }

  return (
    <Suspense fallback={<HeroSceneFallback />}>
      <LazyHeroScene />
    </Suspense>
  )
}
