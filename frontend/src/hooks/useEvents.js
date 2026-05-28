import { useCallback, useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api.js';
import { buildCsrfHeaders } from '../utils/http.js';

const DEFAULT_PAGE_SIZE = 6;

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });
  const payload = await parseJsonSafe(response);
  return {
    ok: response.ok,
    status: response.status,
    ...(payload || {}),
  };
}

async function requestJsonWithCsrf(url, options = {}, extraHeaders = {}) {
  const headers = await buildCsrfHeaders(extraHeaders);
  return requestJson(url, {
    ...options,
    headers,
  });
}

export function useEvents(activeTab) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const url = `${API_ENDPOINTS.EVENTS}?page=${encodeURIComponent(nextPage)}&page_size=${encodeURIComponent(DEFAULT_PAGE_SIZE)}`;
      const payload = await requestJson(url, { method: 'GET' });

      if (!payload.ok || !payload.success) {
        throw new Error(payload.detail || 'Не удалось загрузить мероприятия');
      }

      setItems(payload.items || []);
      setTotal(payload.total || 0);
      setPage(payload.page || nextPage);
      setPageSize(payload.page_size || DEFAULT_PAGE_SIZE);
      setHasMore(Boolean(payload.has_more));
      setCanManage(Boolean(payload.can_manage));
      return payload;
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (activeTab === 'events') {
      loadEvents(1).catch(() => null);
    }
  }, [activeTab, loadEvents]);

  const refreshCurrentPage = useCallback(async () => {
    return loadEvents(page);
  }, [loadEvents, page]);

  const createEvent = useCallback(async (formData) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENTS, {
      method: 'POST',
      body: formData,
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось создать мероприятие');
    }

    await loadEvents(1);
    return payload.item;
  }, [loadEvents]);

  const updateEvent = useCallback(async (eventId, formData) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENT_ITEM(eventId), {
      method: 'PATCH',
      body: formData,
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось обновить мероприятие');
    }

    await refreshCurrentPage();
    return payload.item;
  }, [refreshCurrentPage]);

  const deleteEvent = useCallback(async (eventId) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENT_ITEM(eventId), {
      method: 'DELETE',
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось удалить мероприятие');
    }

    const nextPage = page > 1 && items.length === 1 ? page - 1 : page;
    await loadEvents(nextPage);
    return payload;
  }, [items.length, loadEvents, page]);

  const toggleParticipation = useCallback(async (eventId) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENT_PARTICIPATION(eventId), {
      method: 'POST',
      body: JSON.stringify({}),
    }, {
      'Content-Type': 'application/json',
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось обновить участие');
    }

    setItems((current) => current.map((item) => {
      if (item.id !== eventId) {
        return item;
      }
      const nextParticipantCount = payload.participant_count ?? item.participant_count;
      return {
        ...item,
        user_joined: Boolean(payload.joined),
        participant_count: nextParticipantCount,
        participant_ratio: payload.participant_ratio || `${nextParticipantCount}/${item.max_participants}`,
        can_join: Boolean(payload.joined) || (item.status === 'active' && nextParticipantCount < item.max_participants),
      };
    }));

    return payload;
  }, []);

  const completeEvent = useCallback(async (eventId) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENT_COMPLETE(eventId), {
      method: 'POST',
      body: JSON.stringify({}),
    }, {
      'Content-Type': 'application/json',
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось завершить мероприятие');
    }

    const nextPage = page > 1 && items.length === 1 ? page - 1 : page;
    await loadEvents(nextPage);
    return payload;
  }, [items.length, loadEvents, page]);

  const loadParticipants = useCallback(async (eventId) => {
    const payload = await requestJson(API_ENDPOINTS.EVENT_PARTICIPANTS(eventId), {
      method: 'GET',
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось загрузить участников');
    }

    return payload.participants || [];
  }, []);

  const removeParticipant = useCallback(async (eventId, participationId) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENT_PARTICIPANT_ITEM(eventId, participationId), {
      method: 'DELETE',
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось удалить участника');
    }

    setItems((current) => current.map((item) => {
      if (item.id !== eventId) {
        return item;
      }
      const nextParticipantCount = payload.participant_count ?? item.participant_count;
      return {
        ...item,
        participant_count: nextParticipantCount,
        participant_ratio: payload.participant_ratio || `${nextParticipantCount}/${item.max_participants}`,
        can_join: item.status === 'active' && nextParticipantCount < item.max_participants,
      };
    }));

    return payload;
  }, []);

  const saveAttendance = useCallback(async (eventId, attendedParticipantIds) => {
    const payload = await requestJsonWithCsrf(API_ENDPOINTS.EVENT_ATTENDANCE(eventId), {
      method: 'POST',
      body: JSON.stringify({
        attended_participant_ids: attendedParticipantIds,
      }),
    }, {
      'Content-Type': 'application/json',
    });

    if (!payload.ok || !payload.success) {
      throw new Error(payload.detail || 'Не удалось сохранить отметки участников');
    }

    return payload;
  }, []);

  return {
    items,
    page,
    pageSize,
    total,
    hasMore,
    canManage,
    loading,
    setPage,
    loadEvents,
    refreshCurrentPage,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleParticipation,
    completeEvent,
    loadParticipants,
    removeParticipant,
    saveAttendance,
  };
}

export default useEvents;
