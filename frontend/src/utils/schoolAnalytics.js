import api from '../api/axiosConfig';

const getSchoolIdentity = (user) => {
  const schoolId = user?.school_id;
  const schoolName = user?.name || user?.school_name;

  if (!schoolId || !schoolName) {
    return null;
  }

  return {
    school_id: schoolId,
    school_name: schoolName
  };
};

export const trackSchoolActivity = async (user, activityType, details = {}) => {
  const identity = getSchoolIdentity(user);
  if (!identity || !activityType) {
    return;
  }

  try {
    await api.post('/school/analytics/track', {
      ...identity,
      activity_type: activityType,
      details
    });
  } catch (error) {
    console.error('School analytics tracking failed:', error);
  }
};

export const trackSchoolSearch = async (user, payload = {}) => {
  const identity = getSchoolIdentity(user);
  const query = payload.query?.trim();

  if (!identity || !query || query.length < 2) {
    return;
  }

  try {
    await api.post('/school/analytics/search', {
      ...identity,
      query,
      results_count: Number(payload.resultsCount) || 0,
      category: payload.category || null,
      sub_category: payload.subCategory || null,
      filters: payload.filters || {}
    });
  } catch (error) {
    console.error('School search tracking failed:', error);
  }
};
