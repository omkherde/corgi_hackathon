"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import quests from "@/data/quests.json";
import { scoreQuests, type Coordinates } from "@/lib/scoring";
import { loadUserState, saveUserState } from "@/lib/storage";
import type { Quest, UserState } from "@/types";

const SF_FALLBACK: Coordinates = { lat: 37.7749, lng: -122.4194 };
const ALL_QUESTS = quests as Quest[];
const EMPTY_STATE: UserState = { ranked: [], swipes: {}, completed: [] };
const SWIPE_THRESHOLD = 90;

type Tab = "discover" | "ranking";
type CompareState = { quest: Quest; lo: number; hi: number };
type RankResult = { quest: Quest; rank: number };

export default function Home() {
  const [user, setUser] = useState<UserState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("discover");
  const [location, setLocation] = useState<Coordinates>(SF_FALLBACK);
  const [usingFallback, setUsingFallback] = useState(true);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [rankResult, setRankResult] = useState<RankResult | null>(null);
  const [personalizedCopy, setPersonalizedCopy] = useState({ questId: "", copy: "" });
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerStart = useRef(0);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(loadUserState());
      setRecipient(window.localStorage.getItem("detour:recipient") ?? "");
      setReady(true);
    });
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setUsingFallback(false);
      },
      () => {
        setLocation(SF_FALLBACK);
        setUsingFallback(true);
      },
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
    () => scoreQuests(ALL_QUESTS, user, { location }),
    [location, user],
  );
  const current = deck[0]?.quest;
  const nextQuest = deck[1]?.quest;
  const comparisonIndex = compare
    ? Math.floor((compare.lo + compare.hi) / 2)
    : -1;
  const comparisonQuest =
    comparisonIndex >= 0 ? byId.get(user.ranked[comparisonIndex]) : undefined;
  const displayBody =
    personalizedCopy.questId === current?.id && personalizedCopy.copy
      ? personalizedCopy.copy
      : current?.body;

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

  function commitSwipe(direction: "yes" | "no") {
    if (!current) return;
    setUser((state) => ({
      ...state,
      swipes: { ...state.swipes, [current.id]: direction },
    }));
    setDragX(0);
  }

  function swipeWithAnimation(direction: "yes" | "no") {
    if (!current || Math.abs(dragX) > SWIPE_THRESHOLD) return;
    setDragging(false);
    setDragX(direction === "yes" ? window.innerWidth : -window.innerWidth);
    window.setTimeout(() => commitSwipe(direction), 180);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    pointerStart.current = event.clientX - dragX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!dragging) return;
    setDragX(event.clientX - pointerStart.current);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      setDragX(window.innerWidth);
      window.setTimeout(() => commitSwipe("yes"), 180);
    } else if (dragX < -SWIPE_THRESHOLD) {
      setDragX(-window.innerWidth);
      window.setTimeout(() => commitSwipe("no"), 180);
    } else {
      setDragX(0);
    }
  }

  function completeQuest(quest: Quest) {
    if (user.completed.includes(quest.id)) {
      const rank = user.ranked.indexOf(quest.id) + 1;
      setRankResult({ quest, rank });
      return;
    }
    if (user.ranked.length === 0) {
      setUser((state) => ({
        ...state,
        completed: [...state.completed, quest.id],
        ranked: [quest.id],
      }));
      setRankResult({ quest, rank: 1 });
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
    setRankResult({ quest: compare.quest, rank: lo + 1 });
    setCompare(null);
  }

  function openShare() {
    if (!current) return;
    setShareOpen(true);
  }

  async function sendQuest() {
    if (!current || sending || !recipient.trim()) return;
    const normalizedRecipient = recipient.trim();
    window.localStorage.setItem("detour:recipient", normalizedRecipient);
    setSending(true);
    try {
      const response = await fetch("/api/send-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest: current, recipient: normalizedRecipient }),
      });
      const data = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) throw new Error(data.detail || data.error || "Could not send");
      setShareOpen(false);
      commitSwipe("yes");
      showNotice("Quest sent in iMessage.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3600);
  }

  if (!ready) return <main className="loading-shell">Finding your detour…</main>;

  return (
    <main className="product-shell">
      <header className="global-header">
        <button className="brand" onClick={() => setTab("discover")}>
          detour<span>.</span>
        </button>
        <div className="header-location">
          <span className="status-dot" />
          <div>
            <strong>{usingFallback ? "San Francisco" : "Current location"}</strong>
            <small>{usingFallback ? "Location fallback" : "Live location"}</small>
          </div>
        </div>
        <nav className="desktop-nav" aria-label="Primary">
          <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}>
            Discover
          </button>
          <button className={tab === "ranking" ? "active" : ""} onClick={() => setTab("ranking")}>
            Ranking <span>{rankedQuests.length}</span>
          </button>
        </nav>
        <button className="profile-button" onClick={() => setTab("ranking")}>OK</button>
      </header>

      <div className="desktop-grid">
        <aside className="context-panel">
          <p className="section-label">Your signal</p>
          <h1>Plans worth leaving the house for.</h1>
          <p className="context-copy">
            Specific local side quests, ordered by your actual taste—not anonymous ratings.
          </p>
          <dl className="profile-stats">
            <div><dt>{user.completed.length}</dt><dd>completed</dd></div>
            <div><dt>{Object.keys(user.swipes).length}</dt><dd>swiped</dd></div>
            <div><dt>{rankedQuests.length ? rankedQuests[0].vibe : "—"}</dt><dd>top signal</dd></div>
          </dl>
          <div className="swipe-guide">
            <p><span>←</span><strong>Pass</strong></p>
            <p><strong>Save</strong><span>→</span></p>
          </div>
        </aside>

        <section className={`discover-panel ${tab === "ranking" ? "mobile-hidden" : ""}`}>
          <div className="panel-heading">
            <div>
              <p className="section-label">Recommended for you</p>
              <h2>Pick your detour</h2>
            </div>
            <span className="deck-count">{deck.length} nearby</span>
          </div>

          <div className="deck-stage">
            {nextQuest && <div className="quest-card card-behind" aria-hidden="true" />}
            {current ? (
              <article
                className={`quest-card card-active ${dragging ? "dragging" : ""}`}
                style={{
                  transform: `translateX(${dragX}px) rotate(${dragX / 28}deg)`,
                  opacity: Math.max(0.25, 1 - Math.abs(dragX) / 520),
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div className={`swipe-stamp pass ${dragX < -35 ? "visible" : ""}`}>PASS</div>
                <div className={`swipe-stamp save ${dragX > 35 ? "visible" : ""}`}>SAVE</div>
                <div className="card-topline">
                  <span className="vibe-label">{current.vibe}</span>
                  <span>{deck[0].distanceKm?.toFixed(1)} km · {current.durationMin} min</span>
                </div>
                <div className="card-copy">
                  <h2>{current.title}</h2>
                  <p>{displayBody}</p>
                </div>
                <footer className="card-location">
                  <div className="location-icon">⌖</div>
                  <div>
                    <strong>{current.location.name}</strong>
                    <small>
                      {current.location.neighborhood} · {current.bestTime[0].replaceAll("_", " ")}
                    </small>
                  </div>
                  <span className="weird-level">W{current.weirdness}</span>
                </footer>
              </article>
            ) : (
              <div className="empty-deck">
                <span>✓</span>
                <h2>You reached the edge of the map.</h2>
                <button onClick={() => setUser(EMPTY_STATE)}>Reset deck</button>
              </div>
            )}
          </div>

          {current && (
            <div className="card-actions">
              <button className="action-circle pass-action" onClick={() => swipeWithAnimation("no")} aria-label="Pass">
                ×
              </button>
              <button className="share-action" onClick={openShare}>
                <span>Send to iMessage</span><b>↗</b>
              </button>
              <button className="action-circle complete-action" onClick={() => completeQuest(current)} aria-label="I did this">
                ✓
              </button>
            </div>
          )}
          <p className="gesture-hint">Drag left to pass · drag right to save · check to rank</p>
        </section>

        <aside className={`ranking-panel ${tab === "discover" ? "mobile-hidden-ranking" : ""}`}>
          <div className="panel-heading">
            <div>
              <p className="section-label">Your definitive list</p>
              <h2>Ranking</h2>
            </div>
            <span className="rank-count">{rankedQuests.length}</span>
          </div>
          {rankedQuests.length ? (
            <ol className="ranking-list">
              {rankedQuests.map((quest, index) => (
                <li key={quest.id}>
                  <span className="rank-number">{index + 1}</span>
                  <div>
                    <strong>{quest.title}</strong>
                    <small>{quest.location.neighborhood} · {quest.vibe}</small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-ranking">
              <div className="empty-rank-number">#</div>
              <strong>No ranking yet</strong>
              <p>Complete a quest, then compare it head-to-head.</p>
              <button onClick={() => setTab("discover")}>Find a quest</button>
            </div>
          )}
          <div className="ranking-principle">
            <span>01</span>
            <p><strong>No stars. No averages.</strong><br />Every position comes from a decision you made.</p>
          </div>
        </aside>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={tab === "discover" ? "active" : ""} onClick={() => setTab("discover")}>
          <span>⌁</span>Discover
        </button>
        <button className={tab === "ranking" ? "active" : ""} onClick={() => setTab("ranking")}>
          <span>#</span>Ranking
        </button>
      </nav>

      {compare && comparisonQuest && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Rank completed quest">
          <section className="comparison-modal">
            <header>
              <p className="section-label">Pairwise ranking</p>
              <span>Comparison {Math.min(comparisonIndex + 1, user.ranked.length)} of ~{Math.ceil(Math.log2(user.ranked.length + 1))}</span>
            </header>
            <h2>Which was better?</h2>
            <p className="modal-subtitle">Your answer determines the exact number. There is no tie.</p>
            <button className="comparison-choice new-choice" onClick={() => answerComparison(true)}>
              <span>NEW QUEST</span>
              <strong>{compare.quest.title}</strong>
              <small>{compare.quest.location.neighborhood}</small>
            </button>
            <div className="choice-divider"><span>OR</span></div>
            <button className="comparison-choice" onClick={() => answerComparison(false)}>
              <span>CURRENTLY #{comparisonIndex + 1}</span>
              <strong>{comparisonQuest.title}</strong>
              <small>{comparisonQuest.location.neighborhood}</small>
            </button>
          </section>
        </div>
      )}

      {rankResult && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Ranking result">
          <section className="rank-result-modal">
            <p className="section-label">Ranking updated</p>
            <div className="result-number">#{rankResult.rank}</div>
            <h2>{rankResult.quest.title}</h2>
            <p>That is its exact place in your list.</p>
            <button onClick={() => { setRankResult(null); setTab("ranking"); }}>See full ranking</button>
            <button className="text-button" onClick={() => setRankResult(null)}>Keep exploring</button>
          </section>
        </div>
      )}

      {shareOpen && current && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Send quest in iMessage">
          <section className="share-modal">
            <button className="modal-close" onClick={() => setShareOpen(false)} aria-label="Close">×</button>
            <p className="section-label">Send with Photon</p>
            <h2>Drop it in iMessage.</h2>
            <p>Use a phone number with country code. Photon must allow this recipient on your project.</p>
            <label htmlFor="recipient">Recipient</label>
            <input
              id="recipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="+1 415 555 0123"
              autoComplete="tel"
              inputMode="tel"
            />
            <div className="share-preview">
              <span>DETOUR</span>
              <strong>{current.title}</strong>
              <small>{current.location.name}</small>
            </div>
            <button className="primary-button" onClick={sendQuest} disabled={sending || !recipient.trim()}>
              {sending ? "Sending…" : "Send quest"}
            </button>
          </section>
        </div>
      )}

      {notice && <div className="notice" role="status">{notice}</div>}
    </main>
  );
}
