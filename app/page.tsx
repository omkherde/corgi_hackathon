"use client";

import { useEffect, useMemo, useState } from "react";

import quests from "@/data/quests.json";
import { scoreQuests, type Coordinates, type QuestVibe } from "@/lib/scoring";
import { loadUserState, saveUserState } from "@/lib/storage";
import type { Quest, UserState } from "@/types";

const SF_FALLBACK: Coordinates = { lat: 37.7749, lng: -122.4194 };
const ALL_QUESTS = quests as Quest[];
const VIBES: Array<{ value: QuestVibe | null; label: string; emoji: string }> = [
  { value: null, label: "For you", emoji: "✦" },
  { value: "active", label: "Active", emoji: "↗" },
  { value: "chill", label: "Chill", emoji: "☁" },
  { value: "photo", label: "Photo", emoji: "◉" },
  { value: "food", label: "Food", emoji: "◇" },
  { value: "weird", label: "Weird", emoji: "?" },
];

const EMPTY_STATE: UserState = { ranked: [], swipes: {}, completed: [] };

type Tab = "explore" | "ranked";
type CompareState = { quest: Quest; lo: number; hi: number };

export default function Home() {
  const [user, setUser] = useState<UserState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("explore");
  const [vibe, setVibe] = useState<QuestVibe | null>(null);
  const [location, setLocation] = useState<Coordinates>(SF_FALLBACK);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [personalizedCopy, setPersonalizedCopy] = useState({
    questId: "",
    copy: "",
  });
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(loadUserState());
      setReady(true);
    });
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setLocation({ lat: coords.latitude, lng: coords.longitude }),
      () => setLocation(SF_FALLBACK),
      { timeout: 4000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    if (ready) saveUserState(user);
  }, [ready, user]);

  const byId = useMemo(
    () => new Map(ALL_QUESTS.map((quest) => [quest.id, quest])),
    [],
  );
  const rankedQuests = useMemo(
    () =>
      user.ranked
        .map((id) => byId.get(id))
        .filter((quest): quest is Quest => Boolean(quest)),
    [byId, user.ranked],
  );
  const deck = useMemo(
    () => scoreQuests(ALL_QUESTS, user, { location, vibe: vibe ?? undefined }),
    [location, user, vibe],
  );
  const current = deck[0]?.quest;
  const comparisonQuest = compare
    ? byId.get(user.ranked[Math.floor((compare.lo + compare.hi) / 2)])
    : undefined;

  useEffect(() => {
    if (!current || rankedQuests.length < 3) return;

    const controller = new AbortController();
    void fetch("/api/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quest: current, rankedQuests }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { copy?: string }) =>
        setPersonalizedCopy({ questId: current.id, copy: data.copy ?? "" }),
      )
      .catch(() => undefined);

    return () => controller.abort();
  }, [current, rankedQuests]);

  function swipe(direction: "yes" | "no") {
    if (!current) return;
    setUser((state) => ({
      ...state,
      swipes: { ...state.swipes, [current.id]: direction },
    }));
  }

  function completeQuest(quest: Quest) {
    if (user.completed.includes(quest.id)) return;
    if (user.ranked.length === 0) {
      setUser((state) => ({
        ...state,
        completed: [...state.completed, quest.id],
        ranked: [quest.id],
      }));
      showNotice("First quest ranked. Your taste profile is alive.");
      return;
    }
    setCompare({ quest, lo: 0, hi: user.ranked.length });
  }

  function answerComparison(prefersNew: boolean) {
    if (!compare) return;
    const mid = Math.floor((compare.lo + compare.hi) / 2);
    const lo = prefersNew ? compare.lo : mid + 1;
    const hi = prefersNew ? mid : compare.hi;

    if (lo < hi) {
      setCompare({ ...compare, lo, hi });
      return;
    }

    setUser((state) => ({
      ...state,
      completed: [...state.completed, compare.quest.id],
      ranked: [
        ...state.ranked.slice(0, lo),
        compare.quest.id,
        ...state.ranked.slice(lo),
      ],
    }));
    setCompare(null);
    showNotice(`Ranked #${lo + 1}.`);
  }

  async function sendQuest() {
    if (!current || sending) return;
    const savedRecipient = window.localStorage.getItem("detour:recipient") ?? "";
    const recipient =
      savedRecipient ||
      window.prompt(
        "Who should get this quest? Enter an iMessage phone number with country code.",
        "+1",
      )?.trim();
    if (!recipient) return;
    window.localStorage.setItem("detour:recipient", recipient);

    setSending(true);
    try {
      const response = await fetch("/api/send-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest: current, recipient }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not send");
      swipe("yes");
      showNotice("Quest sent to the group.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  if (!ready) return <main className="loading-shell">Finding your detour…</main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SAN FRANCISCO · NEAR YOU</p>
          <h1>detour<span>.</span></h1>
        </div>
        <button className="avatar" onClick={() => setTab("ranked")} aria-label="Open ranked list">
          OK
        </button>
      </header>

      <nav className="tabs" aria-label="Main navigation">
        <button className={tab === "explore" ? "active" : ""} onClick={() => setTab("explore")}>
          Explore
        </button>
        <button className={tab === "ranked" ? "active" : ""} onClick={() => setTab("ranked")}>
          My ranking <span>{user.ranked.length}</span>
        </button>
      </nav>

      {tab === "explore" ? (
        <>
          <section className="vibes" aria-label="Filter by vibe">
            {VIBES.map((item) => (
              <button
                key={item.label}
                className={vibe === item.value ? "selected" : ""}
                onClick={() => setVibe(item.value)}
              >
                <span>{item.emoji}</span>{item.label}
              </button>
            ))}
          </section>

          {current ? (
            <section className={`quest-card vibe-${current.vibe}`}>
              <div className="card-topline">
                <span className="vibe-pill">{current.vibe}</span>
                <span>{deck[0].distanceKm?.toFixed(1)} km · {current.durationMin} min</span>
              </div>
              <div className="card-copy">
                {personalizedCopy.questId === current.id && personalizedCopy.copy && (
                  <p className="personalized">{personalizedCopy.copy}</p>
                )}
                <h2>{current.title}</h2>
                <p className="quest-body">{current.body}</p>
              </div>
              <div className="location-row">
                <span className="pin">⌖</span>
                <div>
                  <strong>{current.location.name}</strong>
                  <small>{current.location.neighborhood} · best {current.bestTime[0].replaceAll("_", " ")}</small>
                </div>
              </div>
            </section>
          ) : (
            <section className="empty-card">
              <span>✓</span>
              <h2>You found the edge of the map.</h2>
              <p>Try another vibe or reset your local state for a fresh deck.</p>
              <button onClick={() => setUser(EMPTY_STATE)}>Reset deck</button>
            </section>
          )}

          {current && (
            <section className="actions">
              <button className="round secondary" onClick={() => swipe("no")} aria-label="Skip quest">×</button>
              <button className="send-button" onClick={sendQuest} disabled={sending}>
                <span>{sending ? "Sending…" : "Send to the group"}</span>
                <b>↗</b>
              </button>
              <button className="round primary" onClick={() => completeQuest(current)} aria-label="Mark quest complete">✓</button>
            </section>
          )}

          <p className="action-hint">× skip · ↗ share · ✓ did it</p>
        </>
      ) : (
        <section className="ranked-view">
          <div className="ranked-heading">
            <div>
              <p className="eyebrow">YOUR TASTE, NOT THE CROWD&apos;S</p>
              <h2>Your detours</h2>
            </div>
            <span>{rankedQuests.length} done</span>
          </div>

          {rankedQuests.length ? (
            <ol className="ranking-list">
              {rankedQuests.map((quest, index) => (
                <li key={quest.id}>
                  <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{quest.title}</strong>
                    <small>{quest.location.neighborhood} · {quest.vibe}</small>
                  </div>
                  <span className="weirdness">{"●".repeat(quest.weirdness)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-ranking">
              <p>Complete your first quest to start a ranking.</p>
              <button onClick={() => setTab("explore")}>Find one</button>
            </div>
          )}

          <aside className="friend-note">
            <span>MF</span>
            <p><strong>Maya ranked “The fog exchange” #1.</strong><br />Your quiet-weird overlap is getting suspicious.</p>
          </aside>
        </section>
      )}

      {compare && comparisonQuest && (
        <div className="comparison-overlay" role="dialog" aria-modal="true" aria-label="Rank completed quest">
          <div className="comparison-panel">
            <p className="eyebrow">ONE QUESTION. NO STARS.</p>
            <h2>Which was better?</h2>
            <button className="compare-card new" onClick={() => answerComparison(true)}>
              <span>NEW</span>
              <strong>{compare.quest.title}</strong>
              <small>{compare.quest.location.neighborhood}</small>
            </button>
            <div className="or">OR</div>
            <button className="compare-card" onClick={() => answerComparison(false)}>
              <span>RANKED</span>
              <strong>{comparisonQuest.title}</strong>
              <small>{comparisonQuest.location.neighborhood}</small>
            </button>
          </div>
        </div>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  );
}
