import type { Friend, Quest, UserState } from "@/types";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type QuestVibe = Quest["vibe"];

export type TasteVector = {
  hasHistory: boolean;
  vibes: Record<QuestVibe, number>;
  weirdness: number;
  durationMin: number;
  groupSize: Record<Quest["groupSize"], number>;
};

export type ScoreOptions = {
  location?: Coordinates;
  vibe?: QuestVibe;
  friends?: Friend[];
};

export type ScoredQuest = {
  quest: Quest;
  score: number;
  distanceKm: number | null;
};

const VIBES: QuestVibe[] = ["active", "chill", "photo", "food", "weird"];
const GROUP_SIZES: Quest["groupSize"][] = ["solo", "pair", "group"];

const emptyTaste = (): TasteVector => ({
  hasHistory: false,
  vibes: { active: 0, chill: 0, photo: 0, food: 0, weird: 0 },
  weirdness: 3,
  durationMin: 60,
  groupSize: { solo: 0, pair: 0, group: 0 },
});

export function buildTasteVector(
  ranked: string[],
  quests: Quest[],
): TasteVector {
  const byId = new Map(quests.map((quest) => [quest.id, quest]));
  const history = ranked
    .map((id) => byId.get(id))
    .filter((quest): quest is Quest => Boolean(quest));

  if (history.length === 0) return emptyTaste();

  const taste = emptyTaste();
  taste.hasHistory = true;
  let totalWeight = 0;
  let weirdness = 0;
  let duration = 0;

  history.forEach((quest, index) => {
    const weight = (history.length - index) / history.length;
    totalWeight += weight;
    taste.vibes[quest.vibe] += weight;
    taste.groupSize[quest.groupSize] += weight;
    weirdness += quest.weirdness * weight;
    duration += quest.durationMin * weight;
  });

  for (const vibe of VIBES) taste.vibes[vibe] /= totalWeight;
  for (const size of GROUP_SIZES) taste.groupSize[size] /= totalWeight;
  taste.weirdness = weirdness / totalWeight;
  taste.durationMin = duration / totalWeight;

  return taste;
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function friendBoost(questId: string, friends: Friend[]): number {
  if (friends.length === 0) return 0;

  const scores = friends.map((friend) => {
    const index = friend.ranked.indexOf(questId);
    return index === -1 ? 0 : 1 - index / Math.max(friend.ranked.length, 1);
  });

  return scores.reduce((sum, score) => sum + score, 0) / friends.length;
}

export function scoreQuests(
  quests: Quest[],
  userState: UserState,
  options: ScoreOptions = {},
): ScoredQuest[] {
  const seen = new Set([
    ...Object.keys(userState.swipes),
    ...userState.completed,
    ...userState.ranked,
  ]);
  const unseen = quests.filter((quest) => !seen.has(quest.id));
  const taste = buildTasteVector(userState.ranked, quests);
  const friends = options.friends ?? [];

  return unseen
    .filter((quest) => !options.vibe || quest.vibe === options.vibe)
    .map((quest) => {
      const distance = options.location
        ? distanceKm(options.location, quest.location)
        : null;

      if (!taste.hasHistory) {
        return {
          quest,
          distanceKm: distance,
          score: quest.weirdness * 2 - Math.min(distance ?? 0, 20),
        };
      }

      const vibeSimilarity = taste.vibes[quest.vibe];
      const weirdnessSimilarity = 1 - Math.abs(quest.weirdness - taste.weirdness) / 4;
      const durationSimilarity =
        1 - Math.min(Math.abs(quest.durationMin - taste.durationMin) / 105, 1);
      const groupSimilarity = taste.groupSize[quest.groupSize];
      const proximity = distance === null ? 0.5 : 1 / (1 + distance / 3);
      const social = friendBoost(quest.id, friends);

      return {
        quest,
        distanceKm: distance,
        score:
          vibeSimilarity * 4 +
          weirdnessSimilarity * 1.5 +
          durationSimilarity +
          groupSimilarity +
          proximity * 2 +
          social * 1.25,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
        a.quest.id.localeCompare(b.quest.id),
    );
}
