import * as React from "react"

const MOBILE_BREAKPOINT = 768
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (callback: (event: MediaQueryListEvent) => void) => void
  removeListener?: (callback: (event: MediaQueryListEvent) => void) => void
}
let mediaQueryList: MediaQueryList | null = null
let mediaQueryListener: ((event: MediaQueryListEvent) => void) | null = null
let isMediaQueryListenerAttached = false
let currentMatch = false
const subscribers = new Set<() => void>()

function getMediaQueryList() {
  if (typeof window === "undefined") {
    return null
  }

  if (!mediaQueryList) {
    mediaQueryList = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    )
  }

  currentMatch = mediaQueryList.matches
  return mediaQueryList
}

function notifySubscribers() {
  for (const subscriber of subscribers) {
    subscriber()
  }
}

function attachMediaQueryListener() {
  if (isMediaQueryListenerAttached) {
    return
  }

  const mql = getMediaQueryList()
  if (!mql) {
    return
  }

  mediaQueryListener = () => {
    const nextMatch = mql.matches
    if (nextMatch === currentMatch) {
      return
    }

    currentMatch = nextMatch
    notifySubscribers()
  }

  if ("addEventListener" in mql) {
    mql.addEventListener("change", mediaQueryListener)
  } else {
    const legacyMql = mql as LegacyMediaQueryList
    legacyMql.addListener(mediaQueryListener)
  }

  isMediaQueryListenerAttached = true
}

function detachMediaQueryListener() {
  const mql = mediaQueryList
  if (!isMediaQueryListenerAttached || !mql || !mediaQueryListener) {
    return
  }

  if ("removeEventListener" in mql) {
    mql.removeEventListener("change", mediaQueryListener)
  } else {
    const legacyMql = mql as LegacyMediaQueryList
    legacyMql.removeListener(mediaQueryListener)
  }

  isMediaQueryListenerAttached = false
  mediaQueryListener = null
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  attachMediaQueryListener()

  return () => {
    subscribers.delete(callback)
    if (subscribers.size === 0) {
      detachMediaQueryListener()
    }
  }
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => {
      const mql = getMediaQueryList()
      return mql ? mql.matches : false
    },
    () => false
  )
}
