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
  const [locationLabel, setLocationLabel] = useState("San Francisco fallback");
  const [locating, setLocating] = useState(false);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [rankResult, setRankResult] = useState<RankResult | null>(null);
  const [personalizedCopy, setPersonalizedCopy] = useState({ questId: "", copy: "" });
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swipeAnimating, setSwipeAnimating] = useState(false);
  const pointerStart = useRef(0);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(loadUserState());
      setRecipient(window.localStorage.getItem("detour:recipient") ?? "");
      setReady(true);
    });
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
    setSwipeAnimating(false);
  }

  function swipeWithAnimation(direction: "yes" | "no") {
    if (!current || swipeAnimating) return;
    setDragging(false);
    setSwipeAnimating(true);
    setDragX(direction === "yes" ? window.innerWidth * 1.15 : -window.innerWidth * 1.15);
    window.setTimeout(() => commitSwipe(direction), 380);
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
      setSwipeAnimating(true);
      window.setTimeout(() => commitSwipe("yes"), 320);
    } else if (dragX < -SWIPE_THRESHOLD) {
      setDragX(-window.innerWidth);
      setSwipeAnimating(true);
      window.setTimeout(() => commitSwipe("no"), 320);
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

  function requestLocation() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    setLocationLabel("Requesting location…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = { lat: coords.latitude, lng: coords.longitude };
        setLocation(nextLocation);
        try {
          const response = await fetch(
            `/api/location?lat=${coords.latitude}&lng=${coords.longitude}`,
          );
          const data = (await response.json()) as { label?: string };
          setLocationLabel(data.label || `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
        } catch {
          setLocationLabel(`${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocation(SF_FALLBACK);
        setLocationLabel("Location permission denied · using San Francisco");
        setLocating(false);
      },
      { timeout: 7000, maximumAge: 300_000 },
    );
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
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top">detour<span>.</span></a>
        <nav aria-label="Site navigation">
          <a href="#how">How it works</a>
          <a href="#experience">Explore</a>
          <a href="#ranking">Your ranking</a>
        </nav>
        <a className="header-cta" href="#experience">Open Detour</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="hero-kicker">LOCAL DISCOVERY, RANKED BY TASTE</p>
          <h1>Your best day in the city is not on a top-ten list.</h1>
          <p>
            Detour finds the specific, local things worth doing now—then learns
            from what you actually loved.
          </p>
          <div className="hero-actions">
            <a className="hero-primary" href="#experience">Explore nearby <span>↘</span></a>
            <a className="hero-secondary" href="#how">See how it works</a>
          </div>
          <div className="hero-proof">
            <div><strong>80</strong><span>curated SF quests</span></div>
            <div><strong>3 taps</strong><span>to place a favorite</span></div>
            <div><strong>1 list</strong><span>that gets more personal</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-label="Detour quest preview">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-card hero-card-back">
            <span>02</span><strong>The fog exchange</strong>
          </div>
          <div className="hero-card hero-card-front">
            <div className="hero-card-meta"><span>NEARBY</span><span>30 MIN</span></div>
            <h2>The city looks different from here.</h2>
            <p>Go before the first coffee run. Bring one person and leave your phones in your pockets until the view opens up.</p>
            <div className="hero-card-place">⌖ Bernal Heights · 1.4 km</div>
          </div>
          <div className="hero-swipe-note">DRAG TO CHOOSE <span>→</span></div>
        </div>
      </section>

      <section className="editorial-strip">
        <p>Built for the question</p>
        <h2>“We have a few hours. What should we actually do?”</h2>
      </section>

      <section className="how-section" id="how">
        <div className="section-intro">
          <p className="section-label">A clearer way to decide</p>
          <h2>From “maybe” to a plan in minutes.</h2>
        </div>
        <div className="steps-grid">
          <article><span>01</span><h3>Discover</h3><p>Swipe through specific things to do near your actual location.</p></article>
          <article><span>02</span><h3>Go</h3><p>Send the plan to iMessage and get out the door.</p></article>
          <article><span>03</span><h3>Decide</h3><p>Compare completed quests head-to-head to build your definitive list.</p></article>
        </div>
      </section>

      <section className="experience-section" id="experience">
        <header className="experience-header">
          <div>
            <p className="section-label">Interactive preview</p>
            <h2>Find your next detour.</h2>
          </div>
          <button className="location-button" onClick={requestLocation} disabled={locating}>
            <span>⌖</span>
            <div><small>SEARCHING NEAR</small><strong>{locationLabel}</strong></div>
          </button>
        </header>

        <div className="experience-grid">
          <section className={`discover-panel ${tab === "ranking" ? "mobile-hidden" : ""}`}>
            <div className="panel-heading">
              <div>
                <p className="section-label">Recommended for you</p>
                <h3>Choose with a swipe</h3>
              </div>
              <span className="deck-count">{deck.length} nearby</span>
            </div>

            <div className="deck-stage">
            {nextQuest && <div className="quest-card card-behind" aria-hidden="true" />}
            {current ? (
              <article
                className={`quest-card card-active ${dragging ? "dragging" : ""} ${swipeAnimating ? "animating-out" : ""}`}
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
                <button className="action-circle pass-action" onClick={() => swipeWithAnimation("no")} aria-label="Previous recommendation">
                  ←
                </button>
                <button className="share-action" onClick={openShare}>
                  <span>Send to iMessage</span><b>↗</b>
                </button>
                <button className="action-circle save-action" onClick={() => swipeWithAnimation("yes")} aria-label="Next recommendation">
                  →
                </button>
              </div>
            )}
            {current && (
              <button className="completed-link" onClick={() => completeQuest(current)}>
                Already did this? Add it to your ranking
              </button>
            )}
          </section>

          <aside className={`ranking-panel ${tab === "discover" ? "mobile-hidden-ranking" : ""}`} id="ranking">
            <div className="panel-heading">
              <div>
                <p className="section-label">Completed quests</p>
                <h3>Your ranking</h3>
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
          </aside>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">detour<span>.</span></a>
        <p>Do something worth ranking.</p>
        <a href="#experience">Back to the deck ↑</a>
      </footer>

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
