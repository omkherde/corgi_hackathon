import type { UserState } from "@/types";

const STORAGE_KEY = "detour:user-state:v1";
const EMPTY_STATE: UserState = { ranked: [], swipes: {}, completed: [] };

export function loadUserState(): UserState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "");
    if (
      !parsed ||
      !Array.isArray(parsed.ranked) ||
      !Array.isArray(parsed.completed) ||
      typeof parsed.swipes !== "object"
    ) {
      return EMPTY_STATE;
    }
    return parsed as UserState;
  } catch {
    return EMPTY_STATE;
  }
}

export function saveUserState(state: UserState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
