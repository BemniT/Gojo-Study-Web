/**
 * Module-scope in-memory cache for Dashboard resources (employees, posts,
 * attendance summary, calendar, chat activity). The keys are defined in
 * dashboardConstants.js; this file owns the get/set/timeout semantics.
 *
 * Promise dedupe: when a loader is already in flight for a key, callers
 * await the same promise instead of triggering a parallel fetch.
 */
const DASHBOARD_RESOURCE_CACHE = new Map();

export function getCachedDashboardResource(cacheKey, loader, ttlMs = 60 * 1000) {
  const now = Date.now();
  const existing = DASHBOARD_RESOURCE_CACHE.get(cacheKey);

  if (existing?.promise) return existing.promise;

  if (existing && Object.prototype.hasOwnProperty.call(existing, 'data') && (now - existing.timestamp) < ttlMs) {
    return Promise.resolve(existing.data);
  }

  const promise = loader()
    .then((data) => {
      DASHBOARD_RESOURCE_CACHE.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    })
    .catch((error) => {
      DASHBOARD_RESOURCE_CACHE.delete(cacheKey);
      throw error;
    });

  DASHBOARD_RESOURCE_CACHE.set(cacheKey, { promise, timestamp: now });
  return promise;
}

export function setCachedDashboardResource(cacheKey, data) {
  DASHBOARD_RESOURCE_CACHE.set(cacheKey, { data, timestamp: Date.now() });
}

export function deleteCachedDashboardResource(cacheKey) {
  DASHBOARD_RESOURCE_CACHE.delete(cacheKey);
}
