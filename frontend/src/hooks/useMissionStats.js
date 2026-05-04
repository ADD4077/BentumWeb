import { useEffect, useState } from 'react';

import { API_ENDPOINTS } from '../config/api.js';

const DEFAULT_MISSION_STATS = {
  totalUsers: 1000,
  facultiesCount: 10,
  uptime: '99.9%',
};

export function useMissionStats() {
  const [missionStats, setMissionStats] = useState(DEFAULT_MISSION_STATS);
  const [isMissionLoading, setIsMissionLoading] = useState(false);

  useEffect(() => {
    const loadMissionStats = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.PUBLIC_STATS, {
          credentials: 'include',
        });

        if (!response.ok) {
          setMissionStats(DEFAULT_MISSION_STATS);
          return;
        }

        const data = await response.json();
        if (data.success && data.stats) {
          setMissionStats({
            totalUsers: data.stats.totalUsers || DEFAULT_MISSION_STATS.totalUsers,
            facultiesCount: data.stats.facultiesCount || DEFAULT_MISSION_STATS.facultiesCount,
            uptime: DEFAULT_MISSION_STATS.uptime,
          });
          return;
        }

        setMissionStats(DEFAULT_MISSION_STATS);
      } catch {
        setMissionStats(DEFAULT_MISSION_STATS);
      } finally {
        setIsMissionLoading(false);
      }
    };

    loadMissionStats();
  }, []);

  return {
    missionStats,
    isMissionLoading,
  };
}
