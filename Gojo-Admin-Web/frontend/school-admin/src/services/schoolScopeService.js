import axios from "axios";

const SCHOOL_SCOPE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const schoolScopeCache = new Map();
const schoolScopePromiseCache = new Map();

const uniqueNonEmptyValues = (values) => {
  const seen = new Set();
  const normalizedValues = [];

  values.forEach((value) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    normalizedValues.push(normalizedValue);
  });

  return normalizedValues;
};

export function getSchoolScopeAliasCodes(values) {
  return uniqueNonEmptyValues(
    values.flatMap((value) => {
      const normalizedValue = String(value || "").trim();
      if (!normalizedValue) {
        return [];
      }

      const segments = normalizedValue.split("-").filter(Boolean);
      const lastSegment = segments.length > 1 ? segments[segments.length - 1] : "";
      return uniqueNonEmptyValues([normalizedValue, lastSegment]);
    })
  );
}

const getSchoolScopeStorageKey = (seedCode) =>
  `dashboard_school_scope_cache_${String(seedCode || "").trim().toLowerCase()}`;

const readCachedSchoolScopeCandidates = (seedCodes) => {
  const now = Date.now();

  return uniqueNonEmptyValues(
    getSchoolScopeAliasCodes(seedCodes).flatMap((seedCode) => {
      try {
        const rawCache = localStorage.getItem(getSchoolScopeStorageKey(seedCode));
        if (!rawCache) {
          return [];
        }

        const parsedCache = JSON.parse(rawCache);
        if (
          !parsedCache ||
          !Array.isArray(parsedCache.candidates) ||
          Number(parsedCache.expiresAt || 0) <= now
        ) {
          localStorage.removeItem(getSchoolScopeStorageKey(seedCode));
          return [];
        }

        return parsedCache.candidates;
      } catch (error) {
        return [];
      }
    })
  );
};

const writeCachedSchoolScopeCandidates = (seedCodes, candidates) => {
  const payload = JSON.stringify({
    candidates: uniqueNonEmptyValues(candidates),
    expiresAt: Date.now() + SCHOOL_SCOPE_CACHE_TTL_MS,
  });

  getSchoolScopeAliasCodes([...seedCodes, ...candidates]).forEach((seedCode) => {
    try {
      localStorage.setItem(getSchoolScopeStorageKey(seedCode), payload);
    } catch (error) {
      // Ignore localStorage write issues.
    }
  });
};

export function pickPreferredSchoolScopeCode(candidateCodes) {
  const normalizedCandidates = uniqueNonEmptyValues(candidateCodes);
  return (
    normalizedCandidates.find((candidateCode) => String(candidateCode || "").toUpperCase().startsWith("ET-")) ||
    normalizedCandidates.find((candidateCode) => String(candidateCode || "").includes("-")) ||
    normalizedCandidates[0] ||
    ""
  );
}

export async function resolveSchoolScopeCandidates(seedCodes, { apiBase, dbUrl }) {
  const normalizedSeedCodes = getSchoolScopeAliasCodes(Array.isArray(seedCodes) ? seedCodes : []);
  const cacheKey = normalizedSeedCodes.join("|") || "__default__";
  const cachedCandidates = schoolScopeCache.get(cacheKey);
  if (cachedCandidates) {
    return cachedCandidates;
  }

  const persistedCandidates = readCachedSchoolScopeCandidates(normalizedSeedCodes);
  if (persistedCandidates.length > 0) {
    schoolScopeCache.set(cacheKey, persistedCandidates);
    return persistedCandidates;
  }

  const fullSchoolCodeCandidates = normalizedSeedCodes.filter((value) => String(value || "").includes("-"));
  if (fullSchoolCodeCandidates.length > 0) {
    const directCandidates = getSchoolScopeAliasCodes(fullSchoolCodeCandidates);
    schoolScopeCache.set(cacheKey, directCandidates);
    writeCachedSchoolScopeCandidates(normalizedSeedCodes, directCandidates);
    return directCandidates;
  }

  const pendingLookup = schoolScopePromiseCache.get(cacheKey);
  if (pendingLookup) {
    return pendingLookup;
  }

  const lookupPromise = (async () => {
    const resolvedCandidates = [...normalizedSeedCodes];
    const seedSet = new Set(normalizedSeedCodes.map((value) => value.toLowerCase()));

    if (apiBase) {
      try {
        const schoolsRes = await axios.get(`${apiBase}/schools`, { timeout: 3500 });
        const schools = Array.isArray(schoolsRes.data?.schools) ? schoolsRes.data.schools : [];

        schools.forEach((school) => {
          const code = String(school?.code || "").trim();
          const shortName = String(school?.shortName || "").trim();

          if (
            (code && seedSet.has(code.toLowerCase())) ||
            (shortName && seedSet.has(shortName.toLowerCase()))
          ) {
            resolvedCandidates.push(code, shortName);
          }
        });
      } catch (error) {
        // Ignore school-option lookup failures and continue with stored values.
      }
    }

    if (dbUrl) {
      try {
        const schoolIndexRes = await axios.get(`${dbUrl}/Platform1/Schools.json`, {
          params: { shallow: true },
          timeout: 3500,
        });
        const schoolKeys = Object.keys(schoolIndexRes.data || {});
        const normalizedSeedValues = Array.from(seedSet);

        schoolKeys.forEach((schoolKey) => {
          const normalizedKey = String(schoolKey || "").trim().toLowerCase();
          if (!normalizedKey) {
            return;
          }

          const matchesSeed = normalizedSeedValues.some(
            (seedValue) =>
              normalizedKey === seedValue ||
              normalizedKey.endsWith(`-${seedValue}`) ||
              normalizedKey.startsWith(`${seedValue}-`) ||
              normalizedKey.includes(`-${seedValue}-`)
          );

          if (matchesSeed) {
            resolvedCandidates.push(schoolKey);
          }
        });

        if (schoolKeys.length > 0 && schoolKeys.length <= 60) {
          const schoolInfoResponses = await Promise.all(
            schoolKeys.map((schoolKey) =>
              axios
                .get(`${dbUrl}/Platform1/Schools/${encodeURIComponent(schoolKey)}/schoolInfo.json`, {
                  timeout: 3500,
                })
                .then((response) => ({ schoolKey, schoolInfo: response.data }))
                .catch(() => ({ schoolKey, schoolInfo: null }))
            )
          );

          schoolInfoResponses.forEach(({ schoolKey, schoolInfo }) => {
            const aliases = uniqueNonEmptyValues([
              schoolKey,
              schoolInfo?.schoolCode,
              schoolInfo?.shortName,
            ]);

            if (
              aliases.some((alias) => seedSet.has(String(alias || "").trim().toLowerCase()))
            ) {
              resolvedCandidates.push(...aliases);
            }
          });
        }
      } catch (error) {
        // Ignore direct Firebase school-index lookup failures and continue with stored values.
      }
    }

    const finalCandidates = uniqueNonEmptyValues(resolvedCandidates);
    schoolScopeCache.set(cacheKey, finalCandidates);
    writeCachedSchoolScopeCandidates(normalizedSeedCodes, finalCandidates);
    return finalCandidates;
  })();

  schoolScopePromiseCache.set(cacheKey, lookupPromise);

  try {
    return await lookupPromise;
  } finally {
    schoolScopePromiseCache.delete(cacheKey);
  }
}