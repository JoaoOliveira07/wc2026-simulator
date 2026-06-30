import type { GroupsData, WorldCupData } from '../types';

const BASE = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026';

export async function fetchGroups(): Promise<GroupsData> {
  const res = await fetch(`${BASE}/worldcup.groups.json`);
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

export async function fetchMatches(): Promise<WorldCupData> {
  const res = await fetch(`${BASE}/worldcup.json`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}
