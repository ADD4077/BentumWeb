import { API_ENDPOINTS } from '../config/api.js';

export async function fetchDevTeamMembers() {
  const response = await fetch(API_ENDPOINTS.DEV_TEAM, {
    credentials: 'include',
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data?.success ? (data.team_members || []) : [];
}
