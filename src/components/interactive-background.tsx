import { useEffect, useRef } from "react"
import type { CSSProperties } from "react"

type Point = {
  x: number
  y: number
}

export function InteractiveBackground() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = rootRef.current

    if (!element) {
      return
    }

    let frame = 0
    let isTouching = false

    const target: Point = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.28,
    }
    const current: Point = { ...target }

    const paint = () => {
      current.x += (target.x - current.x) * 0.12
      current.y += (target.y - current.y) * 0.12

      const x = `${(current.x / window.innerWidth) * 100}%`
      const y = `${(current.y / window.innerHeight) * 100}%`

      element.style.setProperty("--batwara-pointer-x", x)
      element.style.setProperty("--batwara-pointer-y", y)

      const driftX = `${50 + ((current.x / window.innerWidth) * 2 - 1) * 8}%`
      const driftY = `${38 + ((current.y / window.innerHeight) * 2 - 1) * 8}%`

      element.style.setProperty("--batwara-drift-x", driftX)
      element.style.setProperty("--batwara-drift-y", driftY)

      frame = window.requestAnimationFrame(paint)
    }

    const updateTarget = (x: number, y: number) => {
      target.x = x
      target.y = y
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (isTouching) {
        return
      }

      updateTarget(event.clientX, event.clientY)
    }

    const handleTouchStart = () => {
      isTouching = true
    }

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      updateTarget(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = () => {
      isTouching = false
      updateTarget(window.innerWidth * 0.5, window.innerHeight * 0.28)
    }

    const handleResize = () => {
      updateTarget(window.innerWidth * 0.5, window.innerHeight * 0.28)
    }

    frame = window.requestAnimationFrame(paint)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("touchstart", handleTouchStart, { passive: true })
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("touchend", handleTouchEnd, { passive: true })
    window.addEventListener("resize", handleResize)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        {
          "--batwara-pointer-x": "50%",
          "--batwara-pointer-y": "28%",
          "--batwara-drift-x": "50%",
          "--batwara-drift-y": "38%",
        } as CSSProperties
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--batwara-pointer-x)_var(--batwara-pointer-y),rgba(26,107,60,0.16),transparent_20%),radial-gradient(circle_at_calc(100%_-_var(--batwara-pointer-x))_calc(100%_-_var(--batwara-pointer-y)),rgba(201,142,45,0.1),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_42%)] transition-opacity duration-300" />

      <div className="animate-batwara-ambient absolute top-[8%] left-[8%] h-72 w-72 rounded-full bg-[rgba(26,107,60,0.07)] blur-3xl" />
      <div className="animate-batwara-ambient-delayed absolute right-[10%] bottom-[12%] h-80 w-80 rounded-full bg-[rgba(191,90,54,0.08)] blur-3xl" />
      <div
        className="absolute h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(109,115,135,0.12),transparent_62%)] blur-3xl transition-transform duration-200"
        style={{
          left: "var(--batwara-drift-x)",
          top: "var(--batwara-drift-y)",
        }}
      />
      <div className="paper-grid absolute inset-0 opacity-[0.07]" />
    </div>
  )
}
