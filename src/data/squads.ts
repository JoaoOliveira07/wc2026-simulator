export interface SquadPlayer {
  number: number;
  pos: string;
  name: string;
  club: {
    name: string;
    country: string;
  };
  date_of_birth: string;
}

export interface TeamSquad {
  name: string;
  fifa_code: string;
  group: string;
  players: SquadPlayer[];
}

export interface SquadsData {
  name: string;
  squads: TeamSquad[];
}

export async function fetchSquads(): Promise<SquadsData> {
  const res = await fetch(
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.squads.json',
  );
  if (!res.ok) throw new Error('Failed to fetch squads');
  return res.json() as Promise<SquadsData>;
}

export function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}
