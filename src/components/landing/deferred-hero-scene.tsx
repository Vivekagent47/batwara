import {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react"

import { HeroSceneFallback } from "@/components/landing/hero-scene-fallback"
import { appEnv } from "@/lib/env"

const LazyHeroScene = lazy(() =>
  import("@/components/landing/hero-scene").then((mod) => ({
    default: mod.HeroScene,
  }))
)

type ConnectionLike = EventTarget & {
  saveData?: boolean
}

type NavigatorWithConnection = Navigator & {
  connection?: ConnectionLike
  mozConnection?: ConnectionLike
  webkitConnection?: ConnectionLike
}

export function DeferredHeroScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [prefersSaveData, setPrefersSaveData] = useState(false)

  useEffect(() => {
    if (!appEnv.enableHeroScene) {
      return
    }

    const element = containerRef.current
    if (!element) {
      return
    }

    const mobileQuery = window.matchMedia("(max-width: 768px)")
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const connection =
      (navigator as NavigatorWithConnection).connection ??
      (navigator as NavigatorWithConnection).mozConnection ??
      (navigator as NavigatorWithConnection).webkitConnection

    const syncMobileState = () => {
      setIsMobile(mobileQuery.matches)
    }
    const syncReducedMotionState = () => {
      setPrefersReducedMotion(reducedMotionQuery.matches)
    }
    const syncSaveDataState = () => {
      setPrefersSaveData(Boolean(connection?.saveData))
    }

    syncMobileState()
    syncReducedMotionState()
    syncSaveDataState()

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined
    let didScheduleLoad = false

    const loadScene = () => {
      startTransition(() => {
        setShouldLoad(true)
      })
    }

    const scheduleLoad = () => {
      if (didScheduleLoad) {
        return
      }

      didScheduleLoad = true

      if (reducedMotionQuery.matches || connection?.saveData) {
        setShouldLoad(false)
        return
      }

      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(loadScene, { timeout: 1200 })
        return
      }

      timeoutId = setTimeout(loadScene, 300)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) {
          return
        }

        const entry = entries[0]
        if (!entry.isIntersecting) {
          return
        }

        observer.disconnect()
        scheduleLoad()
      },
      { rootMargin: "220px 0px" }
    )

    observer.observe(element)

    mobileQuery.addEventListener("change", syncMobileState)
    reducedMotionQuery.addEventListener("change", syncReducedMotionState)
    connection?.addEventListener("change", syncSaveDataState)

    return () => {
      observer.disconnect()
      mobileQuery.removeEventListener("change", syncMobileState)
      reducedMotionQuery.removeEventListener("change", syncReducedMotionState)
      connection?.removeEventListener("change", syncSaveDataState)

      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId)
      }

      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  if (!appEnv.enableHeroScene) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <HeroSceneFallback />
      </div>
    )
  }

  if (prefersReducedMotion || prefersSaveData) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <HeroSceneFallback />
      </div>
    )
  }

  if (isMobile && !appEnv.enableHeroSceneOnMobile) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <HeroSceneFallback />
      </div>
    )
  }

  if (!shouldLoad) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <HeroSceneFallback />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Suspense fallback={<HeroSceneFallback />}>
        <LazyHeroScene />
      </Suspense>
    </div>
  )
}
