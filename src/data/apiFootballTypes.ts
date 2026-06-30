export interface AFPlayer {
  id: number;
  name: string;
  age: number;
  number: number | null;
  position: string; // "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
  photo: string;
}

export interface AFCoach {
  id: number;
  name: string;
  nationality: string;
  photo: string;
}

export interface AFLineup {
  formation: string; // e.g. "4-3-3"
  startXI: Array<{
    player: { id: number; name: string; number: number; pos: string; grid: string | null };
  }>;
  substitutes: Array<{
    player: { id: number; name: string; number: number; pos: string; grid: string | null };
  }>;
}
