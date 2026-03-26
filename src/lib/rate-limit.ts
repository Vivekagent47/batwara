type RateLimitBucket = {
  hits: Array<number>
}

const buckets = globalThis as typeof globalThis & {
  __batwaraRateLimitBuckets?: Map<string, RateLimitBucket>
}

const rateLimitBuckets =
  buckets.__batwaraRateLimitBuckets ?? new Map<string, RateLimitBucket>()

if (!buckets.__batwaraRateLimitBuckets) {
  buckets.__batwaraRateLimitBuckets = rateLimitBuckets
}

type RateLimitInput = {
  key: string
  windowMs: number
  max: number
}

export function enforceRateLimit({ key, windowMs, max }: RateLimitInput) {
  const now = Date.now()
  const bucket = rateLimitBuckets.get(key) ?? { hits: [] }
  const cutoff = now - windowMs
  bucket.hits = bucket.hits.filter((value) => value >= cutoff)

  if (bucket.hits.length >= max) {
    throw new Error("Too many requests. Please wait a moment and retry.")
  }

  bucket.hits.push(now)
  rateLimitBuckets.set(key, bucket)
}
