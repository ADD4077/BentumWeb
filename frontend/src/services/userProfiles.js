import { API_ENDPOINTS } from '../config/api.js';

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

const profileCache = new Map();
const inflightProfiles = new Map();

function getCacheKey(kind, value) {
  return `${kind}:${value}`;
}

function getCachedProfile(cacheKey) {
  const cached = profileCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.createdAt > PROFILE_CACHE_TTL_MS) {
    profileCache.delete(cacheKey);
    return null;
  }

  return cached.user;
}

export function clearCachedUserProfile(key) {
  if (key) {
    profileCache.delete(getCacheKey('code', key));
    profileCache.delete(getCacheKey('admin', key));
    inflightProfiles.delete(getCacheKey('code', key));
    inflightProfiles.delete(getCacheKey('admin', key));
    return;
  }

  profileCache.clear();
  inflightProfiles.clear();
}

async function fetchProfile(cacheKey, url) {
  const cached = getCachedProfile(cacheKey);
  if (cached !== null) {
    return cached;
  }

  if (inflightProfiles.has(cacheKey)) {
    return inflightProfiles.get(cacheKey);
  }

  const request = (async () => {
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data?.success ? (data.user || null) : null;

    profileCache.set(cacheKey, {
      user,
      createdAt: Date.now(),
    });

    return user;
  })();

  inflightProfiles.set(cacheKey, request);

  try {
    return await request;
  } finally {
    inflightProfiles.delete(cacheKey);
  }
}

export async function fetchUserProfileByCode(studentCode) {
  if (!studentCode) {
    return null;
  }

  return fetchProfile(getCacheKey('code', studentCode), API_ENDPOINTS.USER_BY_CODE(studentCode));
}

export async function fetchAdminUserProfile(userId) {
  if (!userId) {
    return null;
  }

  return fetchProfile(getCacheKey('admin', userId), API_ENDPOINTS.ADMIN_USER_PROFILE(userId));
}
