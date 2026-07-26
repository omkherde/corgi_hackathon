export type Quest = {
  id: string;
  title: string;
  body: string;
  vibe: "active" | "chill" | "photo" | "food" | "weird";
  location: {
    name: string;
    neighborhood: string;
    address?: string;
    lat: number;
    lng: number;
  };
  durationMin: number;
  bestTime: string[];
  groupSize: "solo" | "pair" | "group";
  weirdness: 1 | 2 | 3 | 4 | 5;
};

export type UserState = {
  ranked: string[];
  swipes: Record<string, "yes" | "no">;
  completed: string[];
};

export type Friend = {
  name: string;
  avatar: string;
  ranked: string[];
};
