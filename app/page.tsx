"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";

import quests from "@/data/quests.json";
import { scoreQuests, type Coordinates } from "@/lib/scoring";
import { loadUserState, saveUserState } from "@/lib/storage";
import type { Quest, UserState } from "@/types";

const SF: Coordinates = { lat: 37.7749, lng: -122.4194 };
const EMPTY_STATE: UserState = { ranked: [], swipes: {}, completed: [] };
const SWIPE_THRESHOLD = 85;

const FEATURED: Quest[] = [
  {
    id: "featured-wood-line",
    title: "Walk the line",
    body: "Follow the full 1,200-foot curve. One photo each, with no bridge in frame.",
    vibe: "photo",
    location: { name: "Andy Goldsworthy's Wood Line", neighborhood: "Presidio", address: "Wood Line, Presidio Boulevard, San Francisco, CA 94129", lat: 37.7914, lng: -122.4496 },
    durationMin: 45,
    bestTime: ["afternoon"],
    groupSize: "group",
    weirdness: 2,
  },
  {
    id: "featured-bobs",
    title: "The 1 AM doughnut run",
    body: "Order one classic and one wildcard. Trade halfway through, then rank both before you leave.",
    vibe: "food",
    location: { name: "Bob's Donuts", neighborhood: "Nob Hill", address: "1621 Polk Street, San Francisco, CA 94109", lat: 37.7919, lng: -122.4215 },
    durationMin: 35,
    bestTime: ["late_night"],
    groupSize: "group",
    weirdness: 2,
  },
  {
    id: "featured-chinatown",
    title: "Lantern hour",
    body: "Walk Grant after dark. Find the quietest block and take one portrait using only storefront light.",
    vibe: "photo",
    location: { name: "Grant Avenue", neighborhood: "Chinatown", address: "Grant Avenue and Clay Street, San Francisco, CA 94108", lat: 37.7954, lng: -122.4078 },
    durationMin: 50,
    bestTime: ["night"],
    groupSize: "pair",
    weirdness: 3,
  },
  {
    id: "featured-bridge",
    title: "Make the bridge small",
    body: "Find a view where the Golden Gate fits between two fingers. No zoom and no standard postcard angle.",
    vibe: "photo",
    location: { name: "Pacific Overlook", neighborhood: "Presidio", address: "Pacific Overlook, Langdon Court, San Francisco, CA 94129", lat: 37.7986, lng: -122.4769 },
    durationMin: 55,
    bestTime: ["golden_hour"],
    groupSize: "pair",
    weirdness: 2,
  },
];

const IMAGES: Record<string, string> = {
  "featured-wood-line": "/quests/wood-line.jpg",
  "featured-bobs": "/quests/donuts.jpg",
  "featured-chinatown": "/quests/chinatown.jpg",
  "featured-bridge": "/quests/golden-gate.jpg",
};

const PHOTO_CREDITS: Record<string, string> = {
  "featured-wood-line": "https://unsplash.com/photos/xK-V2G7joFA",
  "featured-bobs": "https://unsplash.com/photos/1551024601-bec78aea704b",
  "featured-chinatown": "https://unsplash.com/photos/HjMkImW-9PA",
  "featured-bridge": "https://unsplash.com/photos/LeB2TbkT7n4",
};

const ALL_QUESTS = [...FEATURED, ...(quests as Quest[])];
const PEOPLE = [
  { name: "Daniel Garcia", role: "Demand at Merge", avatar: 0 },
  { name: "Pritak Patel", role: "VP, Growth & Services at Merge", avatar: 1 },
  { name: "Anamika Khaleghian", role: "Growth Engineer at Corgi", avatar: 2 },
  { name: "Patrick Ruan", role: "Chief of Staff at Photon", avatar: 3 },
  { name: "Dammy Adeoti", role: "Solutions Engineer at Merge", avatar: 4 },
  { name: "Arthur Liou", role: "Solutions Architect at Merge", avatar: 5 },
  { name: "Laura Dang", role: "Partnerships at Corgi", avatar: 6 },
  { name: "Kushagra Bharti", role: "Software Engineer at Corgi", avatar: 7 },
];
type View = "explore" | "saved" | "friends" | "ranking" | "map";
type CompareState = { quest: Quest; lo: number; hi: number };

function questImage(quest: Quest) {
  return IMAGES[quest.id] || `/quests/generated/${quest.id}.svg`;
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="nav-icon" aria-hidden="true">{children}</span>
);

export default function Home() {
  const [user, setUser] = useState<UserState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("explore");
  const [location, setLocation] = useState<Coordinates>(SF);
  const [locationLabel, setLocationLabel] = useState("San Francisco");
  const [locating, setLocating] = useState(false);
  const [filter, setFilter] = useState("For tonight");
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [rankResult, setRankResult] = useState<{ quest: Quest; rank: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swipeAnimating, setSwipeAnimating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [squadOpen, setSquadOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [mapQuest, setMapQuest] = useState<Quest>(FEATURED[0]);
  const [squad, setSquad] = useState<string[]>(["Daniel Garcia", "Anamika Khaleghian", "Patrick Ruan"]);
  const pointerStart = useRef(0);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(loadUserState());
      setRecipient(window.localStorage.getItem("detour:recipient") ?? "");
      const savedSquad = window.localStorage.getItem("detour:squad");
      if (savedSquad) setSquad(JSON.parse(savedSquad) as string[]);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveUserState(user);
  }, [ready, user]);

  const byId = useMemo(() => new Map(ALL_QUESTS.map((quest) => [quest.id, quest])), []);
  const rankedQuests = useMemo(
    () => user.ranked.map((id) => byId.get(id)).filter((quest): quest is Quest => Boolean(quest)),
    [byId, user.ranked],
  );
  const savedQuests = useMemo(
    () => Object.entries(user.swipes).filter(([, choice]) => choice === "yes").map(([id]) => byId.get(id)).filter((quest): quest is Quest => Boolean(quest)),
    [byId, user.swipes],
  );
  const deck = useMemo(() => {
    const seen = new Set([...Object.keys(user.swipes), ...user.completed, ...user.ranked]);
    const matchesFilter = (quest: Quest) => {
      if (filter === "Low-key") return quest.vibe === "chill" || quest.durationMin <= 35;
      if (filter === "Make something") return quest.vibe === "photo" || quest.vibe === "weird";
      if (filter === "Get moving") return quest.vibe === "active";
      if (filter === "Under an hour") return quest.durationMin < 60;
      if (filter === "After dark") return quest.bestTime.some((time) => time.includes("night") || time.includes("dark"));
      return true;
    };
    const featuredDeck = FEATURED
      .filter((quest) => !seen.has(quest.id) && matchesFilter(quest))
      .map((quest) => ({ quest, score: 100, distanceKm: null }));
    return [...featuredDeck, ...scoreQuests(quests as Quest[], user, { location }).filter(({ quest }) => matchesFilter(quest))];
  }, [filter, location, user]);
  const current = selectedQuest ?? deck[0]?.quest;
  const upNext = deck.slice(1, 3).map(({ quest }) => quest);
  const comparisonIndex = compare ? Math.floor((compare.lo + compare.hi) / 2) : -1;
  const comparisonQuest = comparisonIndex >= 0 ? byId.get(user.ranked[comparisonIndex]) : undefined;

  function commitSwipe(direction: "yes" | "no") {
    if (!current) return;
    setUser((state) => ({ ...state, swipes: { ...state.swipes, [current.id]: direction } }));
    setDragX(0);
    setSwipeAnimating(false);
    setSelectedQuest(null);
  }

  function swipe(direction: "yes" | "no") {
    if (!current || swipeAnimating) return;
    setDragging(false);
    setSwipeAnimating(true);
    setDragX(direction === "yes" ? window.innerWidth : -window.innerWidth);
    window.setTimeout(() => commitSwipe(direction), 360);
  }

  function pointerDown(event: ReactPointerEvent<HTMLElement>) {
    pointerStart.current = event.clientX - dragX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (dragging) setDragX(event.clientX - pointerStart.current);
  }

  function pointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) swipe("yes");
    else if (dragX < -SWIPE_THRESHOLD) swipe("no");
    else setDragX(0);
  }

  function completeQuest(quest: Quest) {
    if (user.completed.includes(quest.id)) {
      setRankResult({ quest, rank: user.ranked.indexOf(quest.id) + 1 });
    } else if (!user.ranked.length) {
      setUser((state) => ({ ...state, completed: [quest.id], ranked: [quest.id] }));
      setRankResult({ quest, rank: 1 });
    } else {
      setCompare({ quest, lo: 0, hi: user.ranked.length });
    }
  }

  function answerComparison(prefersNew: boolean) {
    if (!compare) return;
    const mid = Math.floor((compare.lo + compare.hi) / 2);
    const lo = prefersNew ? compare.lo : mid + 1;
    const hi = prefersNew ? mid : compare.hi;
    if (lo < hi) return setCompare({ ...compare, lo, hi });
    setUser((state) => ({
      ...state,
      completed: [...state.completed, compare.quest.id],
      ranked: [...state.ranked.slice(0, lo), compare.quest.id, ...state.ranked.slice(lo)],
    }));
    setRankResult({ quest: compare.quest, rank: lo + 1 });
    setCompare(null);
  }

  function requestLocation() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setLocation(next);
        try {
          const response = await fetch(`/api/location?lat=${coords.latitude}&lng=${coords.longitude}`);
          const data = await response.json() as { label?: string };
          setLocationLabel(data.label || "Current location");
        } catch {
          setLocationLabel("Current location");
        }
        setLocating(false);
      },
      () => {
        setLocationLabel("San Francisco");
        setLocating(false);
      },
      { timeout: 7000, maximumAge: 300000 },
    );
  }

  async function sendQuest() {
    if (!current || !recipient.trim() || sending) return;
    setSending(true);
    window.localStorage.setItem("detour:recipient", recipient.trim());
    try {
      const response = await fetch("/api/send-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest: current, recipient: recipient.trim() }),
      });
      const data = await response.json() as { error?: string; detail?: string };
      if (!response.ok) throw new Error(data.detail || data.error || "Could not send");
      setShareOpen(false);
      setNotice("Quest sent in iMessage.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send");
    } finally {
      setSending(false);
      window.setTimeout(() => setNotice(""), 4200);
    }
  }

  function toggleSquadMember(name: string) {
    setSquad((currentSquad) => {
      const next = currentSquad.includes(name) ? currentSquad.filter((member) => member !== name) : [...currentSquad, name];
      window.localStorage.setItem("detour:squad", JSON.stringify(next));
      return next;
    });
  }

  function openQuest(quest: Quest) {
    setSelectedQuest(quest);
    setSearchOpen(false);
    setView("explore");
  }

  const searchResults = ALL_QUESTS.filter((quest) =>
    `${quest.title} ${quest.location.name} ${quest.location.neighborhood}`.toLowerCase().includes(searchQuery.toLowerCase()),
  ).slice(0, 12);

  if (!ready) return <main className="loading-shell">Loading Detour</main>;

  return (
    <main className="app-shell">
      <aside className="left-rail">
        <button className="wordmark" onClick={() => setView("explore")}><span>↗</span>detour</button>
        <nav className="side-nav" aria-label="Primary navigation">
          <button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}><Icon>◉</Icon>Explore</button>
          <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}><Icon>♡</Icon>Saved <b>{savedQuests.length}</b></button>
          <button className={view === "friends" ? "active" : ""} onClick={() => setView("friends")}><Icon>♙</Icon>Friends</button>
          <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}><Icon>#</Icon>Ranking</button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><Icon>⌖</Icon>Map</button>
        </nav>
        <div className="left-footer">
          <button className="location-row" onClick={() => setSquadOpen(true)}>
            <span className="avatar-stack">{squad.slice(0, 3).map((name, index) => <i key={name} className={`person-avatar avatar-${PEOPLE.find((person) => person.name === name)?.avatar ?? index}`} />)}</span>
            <span><small>PLANNING FOR</small><strong>{squad.length ? `${squad.length} person squad` : "Just me"}</strong></span>
            <em>›</em>
          </button>
          <div className="profile-row"><span className="user-avatar">OM</span><strong>Om</strong></div>
          <button className="contact-link" onClick={() => setContactOpen(true)}>Contact the Detour team ↗</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-header">
          <button className="wordmark" onClick={() => setView("explore")}><span>↗</span>detour</button>
          <button className="mobile-location" onClick={requestLocation}>⌖ {locationLabel}</button>
        </header>
        {view === "explore" && (
          <>
            <header className="workspace-header">
              <div><p>{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())} · {locationLabel}</p><h1>What are we doing?</h1></div>
              <button className="search-button" onClick={() => setSearchOpen(true)} aria-label="Search quests">⌕</button>
            </header>
            <button className="squad-pill" onClick={() => setSquadOpen(true)}>
              <span className="avatar-stack">{squad.slice(0, 3).map((name) => <i key={name} className={`person-avatar avatar-${PEOPLE.find((person) => person.name === name)?.avatar ?? 0}`} />)}</span>
              Planning for {squad.length ? `${squad.length} person squad` : "yourself"} <b>☷</b>
            </button>
            <div className="filters">
              {["For tonight", "Low-key", "Make something", "Get moving", "Under an hour", "After dark"].map((item) => (
                <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
            {current ? (
              <>
                <div className="card-stage">
                  <article
                    className={`quest-card ${dragging ? "dragging" : ""} ${swipeAnimating ? "leaving" : ""}`}
                    style={{
                      transform: `translateX(${dragX}px) rotate(${dragX / 34}deg)`,
                      backgroundImage: `linear-gradient(180deg, rgba(8,8,5,.03) 28%, rgba(8,8,5,.88) 100%), url(${questImage(current)})`,
                    }}
                    onPointerDown={pointerDown}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                    onPointerCancel={pointerUp}
                  >
                    <div className={`choice-stamp reject ${dragX < -30 ? "show" : ""}`}>PASS</div>
                    <div className={`choice-stamp accept ${dragX > 30 ? "show" : ""}`}>SAVE</div>
                    <span className="quest-category">{current.vibe === "photo" ? "PHOTO MISSION" : current.vibe.toUpperCase()}</span>
                    <button className="card-menu" onClick={(event) => { event.stopPropagation(); setMapQuest(current); setView("map"); }} aria-label="View quest on map">⌖</button>
                    <div className="quest-copy">
                      <div className="quest-place"><strong>{current.location.name}</strong><strong>{current.location.neighborhood}</strong></div>
                      <h2>{current.title}</h2>
                      <p>{current.body}</p>
                      <a className="address-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${current.location.lat},${current.location.lng}`)}`} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">{current.location.address || current.location.name} ↗</a>
                      <div className="quest-facts"><span>◷ {current.durationMin} min</span><span>▱ Free</span><span>{current.groupSize === "group" ? "2-5 people" : current.groupSize}</span></div>
                    </div>
                    {IMAGES[current.id] ? <a className="photo-credit" href={PHOTO_CREDITS[current.id]} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Photo credit</a> : <span className="photo-credit">Original Detour illustration</span>}
                  </article>
                </div>
                <div className="deck-actions">
                  <button className="round-action" onClick={() => swipe("no")} aria-label="Pass quest">×</button>
                  <button className="save-action" onClick={() => swipe("yes")}>Save this quest</button>
                  <button className="round-action share" onClick={() => setShareOpen(true)} aria-label="Send quest">↗</button>
                </div>
                <button className="completed-link" onClick={() => completeQuest(current)}>Already did this? Place it in your ranking</button>
              </>
            ) : (
              <div className="empty-state"><h2>You saw every quest.</h2><button onClick={() => setUser(EMPTY_STATE)}>Reset the deck</button></div>
            )}
          </>
        )}
        {view === "saved" && <CollectionView title="Saved for later" subtitle="The quests you chose are ready when you are." quests={savedQuests} empty="Save a quest and it will appear here." />}
        {view === "friends" && <FriendsView squad={squad} onToggle={toggleSquadMember} />}
        {view === "ranking" && <RankingView quests={rankedQuests} onExplore={() => setView("explore")} />}
        {view === "map" && <MapView quest={mapQuest} quests={ALL_QUESTS} onQuest={setMapQuest} />}
      </section>

      <aside className="right-rail">
        <section className="rail-section">
          <header><h2>Up next</h2><button onClick={() => setView("saved")}>See all</button></header>
          <div className="up-next-list">
            {upNext.map((quest) => <button key={quest.id} onClick={() => openQuest(quest)}><Image src={questImage(quest)} alt="" width={110} height={110} /><span><strong>{quest.title}</strong><small>{quest.location.neighborhood} · {quest.durationMin} min</small></span></button>)}
          </div>
        </section>
        <section className="rail-section ranking-rail">
          <header><h2>Your ranking</h2><button onClick={() => setView("ranking")}>Full list</button></header>
          {rankedQuests.length ? <ol>{rankedQuests.slice(0, 3).map((quest, index) => <li key={quest.id}><span>{index + 1}</span><strong>{quest.title}</strong></li>)}</ol> : <p className="rail-empty">Complete a quest to start your list.</p>}
        </section>
        <div className="verified-note"><span>♮</span><p><strong>{ALL_QUESTS.length} verified ideas.</strong><small>Hours and access notes are included.</small></p></div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {(["explore", "saved", "friends", "ranking", "map"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}><span>{item === "explore" ? "◉" : item === "saved" ? "♡" : item === "friends" ? "♙" : item === "map" ? "⌖" : "#"}</span>{item}</button>)}
      </nav>

      {compare && comparisonQuest && <div className="modal-backdrop"><section className="modal-card"><p className="eyebrow">PLACE IT IN YOUR LIST</p><h2>Which was better?</h2><p>Your answer gives this quest an exact number.</p><button className="comparison-choice" onClick={() => answerComparison(true)}><small>NEW QUEST</small><strong>{compare.quest.title}</strong></button><span className="or">OR</span><button className="comparison-choice" onClick={() => answerComparison(false)}><small>CURRENTLY #{comparisonIndex + 1}</small><strong>{comparisonQuest.title}</strong></button></section></div>}
      {rankResult && <div className="modal-backdrop"><section className="modal-card result-card"><p className="eyebrow">RANKING UPDATED</p><strong className="result-number">#{rankResult.rank}</strong><h2>{rankResult.quest.title}</h2><button className="modal-primary" onClick={() => { setRankResult(null); setView("ranking"); }}>See full ranking</button><button className="modal-secondary" onClick={() => setRankResult(null)}>Keep exploring</button></section></div>}
      {shareOpen && current && <div className="modal-backdrop"><section className="modal-card share-modal"><button className="modal-close" onClick={() => setShareOpen(false)}>×</button><p className="eyebrow">SEND WITH PHOTON</p><h2>Send this quest.</h2><p>Enter a phone number with country code.</p><label htmlFor="recipient">Recipient</label><input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="+1 415 555 0123" inputMode="tel" /><div className="message-preview"><small>DETOUR</small><strong>{current.title}</strong><span>{current.location.name}</span></div><button className="modal-primary" onClick={sendQuest} disabled={sending || !recipient.trim()}>{sending ? "Sending..." : "Send in iMessage"}</button></section></div>}
      {searchOpen && <div className="modal-backdrop"><section className="modal-card search-modal"><button className="modal-close" onClick={() => setSearchOpen(false)}>×</button><p className="eyebrow">SEARCH ALL QUESTS</p><h2>Where to next?</h2><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Place, neighborhood, or quest" /><div className="search-results">{searchResults.map((quest) => <button key={quest.id} onClick={() => openQuest(quest)}><Image src={questImage(quest)} alt="" width={80} height={80} /><span><strong>{quest.title}</strong><small>{quest.location.address || quest.location.name}</small></span></button>)}</div></section></div>}
      {squadOpen && <div className="modal-backdrop"><section className="modal-card squad-modal"><button className="modal-close" onClick={() => setSquadOpen(false)}>×</button><p className="eyebrow">SIDEQUEST SQUAD</p><h2>Who is coming?</h2><p>Selections are saved on this device and change your planning group.</p><div className="people-list">{PEOPLE.map((person) => <button key={person.name} className={squad.includes(person.name) ? "selected" : ""} onClick={() => toggleSquadMember(person.name)}><span className={`large-person-avatar avatar-${person.avatar}`} /><span><strong>{person.name}</strong><small>{person.role}</small></span><b>{squad.includes(person.name) ? "✓" : "+"}</b></button>)}</div><button className="modal-primary" onClick={() => setSquadOpen(false)}>Plan for {squad.length || 1}</button></section></div>}
      {contactOpen && <div className="modal-backdrop"><section className="modal-card contact-modal"><button className="modal-close" onClick={() => setContactOpen(false)}>×</button><p className="eyebrow">CONTACT</p><h2>Build with us.</h2><a href="tel:+14694304138"><span>Phone</span><strong>(469) 430-4138</strong></a><a href="https://github.com/omkherde/corgi_hackathon" target="_blank" rel="noreferrer"><span>GitHub</span><strong>omkherde/corgi_hackathon ↗</strong></a></section></div>}
      {notice && <div className="notice">{notice}</div>}
    </main>
  );
}

function CollectionView({ title, subtitle, quests: items, empty }: { title: string; subtitle: string; quests: Quest[]; empty: string }) {
  return <section className="inner-view"><p className="eyebrow">YOUR DETOURS</p><h1>{title}</h1><p className="view-subtitle">{subtitle}</p>{items.length ? <div className="collection-grid">{items.map((quest) => <article key={quest.id} style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.78)), url(${questImage(quest)})` }}><span>{quest.location.neighborhood}</span><h2>{quest.title}</h2><p>{quest.durationMin} min · {quest.vibe}</p><a href={`https://www.google.com/maps/search/?api=1&query=${quest.location.lat},${quest.location.lng}`} target="_blank" rel="noreferrer">{quest.location.address || quest.location.name} ↗</a></article>)}</div> : <div className="empty-state"><h2>{empty}</h2></div>}</section>;
}

function FriendsView({ squad, onToggle }: { squad: string[]; onToggle: (name: string) => void }) {
  return <section className="inner-view"><p className="eyebrow">HACKATHON PEOPLE</p><h1>Sidequest squad</h1><p className="view-subtitle">Build a planning group from the hosts and judges in the room.</p><div className="friends-grid">{PEOPLE.map((person) => <article key={person.name}><span className={`large-person-avatar avatar-${person.avatar}`} /><div><h2>{person.name}</h2><p>{person.role}</p></div><button className={squad.includes(person.name) ? "in-squad" : ""} onClick={() => onToggle(person.name)}>{squad.includes(person.name) ? "In squad" : "Add"}</button></article>)}</div></section>;
}

function RankingView({ quests: items, onExplore }: { quests: Quest[]; onExplore: () => void }) {
  return <section className="inner-view ranking-view"><p className="eyebrow">COMPLETED QUESTS</p><h1>Your ranking</h1><p className="view-subtitle">Every completed quest gets one concrete position.</p>{items.length ? <ol>{items.map((quest, index) => <li key={quest.id}><span>{index + 1}</span><div><h2>{quest.title}</h2><p>{quest.location.neighborhood} · {quest.vibe}</p></div></li>)}</ol> : <div className="empty-state"><h2>Your first ranking starts after your first quest.</h2><button onClick={onExplore}>Explore quests</button></div>}</section>;
}

function MapView({ quest, quests: items, onQuest }: { quest: Quest; quests: Quest[]; onQuest: (quest: Quest) => void }) {
  const bbox = `${quest.location.lng - 0.02}%2C${quest.location.lat - 0.015}%2C${quest.location.lng + 0.02}%2C${quest.location.lat + 0.015}`;
  return <section className="inner-view map-view"><p className="eyebrow">QUEST MAP</p><h1>San Francisco, mapped.</h1><p className="view-subtitle">OpenStreetMap needs no API key. Select a place below to recenter the map.</p><div className="map-frame"><iframe title={`Map of ${quest.location.name}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${quest.location.lat}%2C${quest.location.lng}`} loading="lazy" /><div className="map-card"><span>{quest.location.neighborhood}</span><h2>{quest.title}</h2><p>{quest.location.address || quest.location.name}</p><a href={`https://www.openstreetmap.org/?mlat=${quest.location.lat}&mlon=${quest.location.lng}#map=16/${quest.location.lat}/${quest.location.lng}`} target="_blank" rel="noreferrer">Open full map ↗</a></div></div><div className="map-quest-strip">{items.slice(0, 16).map((item) => <button key={item.id} className={item.id === quest.id ? "active" : ""} onClick={() => onQuest(item)}><Image src={questImage(item)} alt="" width={90} height={90} /><span><strong>{item.title}</strong><small>{item.location.neighborhood}</small></span></button>)}</div></section>;
}
