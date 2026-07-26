"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import quests from "@/data/quests.json";
import photoCredits from "@/data/photo-credits.json";
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
type Person = { name: string; role: string; company: string; kind: "host" | "judge"; avatar?: number };
const HOSTS: Person[] = [
  { name: "Daniel Garcia", role: "Demand", company: "Merge", kind: "host" },
  { name: "Pritak Patel", role: "VP, Growth & Services", company: "Merge", kind: "host" },
  { name: "Anamika Khaleghian", role: "Growth Engineer", company: "Corgi", kind: "host" },
  { name: "Gabriel Enciso", role: "Startups", company: "Vercel", kind: "host" },
  { name: "Ella Schlaghecke", role: "Partnerships", company: "Corgi", kind: "host" },
  { name: "Lu Zhang", role: "Growth", company: "Corgi", kind: "host" },
  { name: "Laura Dang", role: "Partnerships", company: "Corgi", kind: "host" },
  { name: "Patrick Ruan", role: "Chief of Staff", company: "Photon", kind: "host" },
];
const JUDGES: Person[] = [
  { name: "Dammy Adeoti", role: "Solutions Engineer", company: "Merge", kind: "judge", avatar: 0 },
  { name: "Arther Liou", role: "Solutions Architect", company: "Merge", kind: "judge", avatar: 1 },
  { name: "Aidan Timmerman", role: "Deployment Strategy & Partnerships", company: "Merge", kind: "judge", avatar: 2 },
  { name: "Bill Jiao", role: "Co-founder", company: "General Instinct", kind: "judge", avatar: 3 },
  { name: "Connor Thean Loi", role: "Founder", company: "Replicas", kind: "judge", avatar: 4 },
  { name: "Saai Arora", role: "CTO", company: "Replicas", kind: "judge", avatar: 5 },
  { name: "Sean Ethan Cole", role: "CEO", company: "Parasma", kind: "judge", avatar: 6 },
  { name: "Guanming Wang", role: "Co-founder", company: "General Instinct", kind: "judge", avatar: 7 },
  { name: "Leon Mojarrabi", role: "Co-founder", company: "GutGutGoose", kind: "judge", avatar: 8 },
  { name: "Anis Mihrshahi", role: "Co-founder", company: "GutGutGoose", kind: "judge", avatar: 9 },
  { name: "Marinos Eliades", role: "Co-founder", company: "Prized", kind: "judge", avatar: 10 },
  { name: "Varun Nair", role: "New Media", company: "Robotics.co", kind: "judge", avatar: 11 },
  { name: "Leo Yilu Fu", role: "Head Designer", company: "Corgi", kind: "judge", avatar: 12 },
  { name: "Kushagra Bharti", role: "Software Engineer", company: "Corgi", kind: "judge", avatar: 13 },
  { name: "Joseph Boyce", role: "GTM Lead", company: "Corgi", kind: "judge" },
];
const PEOPLE = [...HOSTS, ...JUDGES];
type View = "feed" | "explore" | "saved" | "friends" | "ranking" | "map" | "calendar" | "profile";
type CompareState = { quest: Quest; lo: number; hi: number };

function questImage(quest: Quest) {
  return IMAGES[quest.id] || (photoCredits as Record<string, { url: string }>)[quest.id]?.url;
}

type IconName = "feed" | "list" | "search" | "trophy" | "profile" | "friends" | "map" | "bell" | "calendar" | "menu" | "heart" | "comment" | "send" | "bookmark" | "plus";
function AppIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    feed: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    friends: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 7 5"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    comment: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
    bookmark: <path d="M6 3h12v19l-6-4-6 4V3Z"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
  };
  return <svg className="app-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PersonAvatar({ person, size = "md" }: { person: Person; size?: "sm" | "md" | "lg" }) {
  const initials = person.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return person.avatar === undefined
    ? <span className={`identity-avatar identity-${size}`}>{initials}</span>
    : <span className={`judge-avatar judge-${person.avatar} identity-${size}`} aria-label={`${person.name} profile photo`} />;
}

export default function Home() {
  const [user, setUser] = useState<UserState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("feed");
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
  const [squad, setSquad] = useState<string[]>(["Dammy Adeoti", "Aidan Timmerman", "Saai Arora"]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<number[]>([]);
  const [leaderboardMetric, setLeaderboardMetric] = useState<"Been" | "Influence" | "Notes" | "Photos">("Been");
  const [listOpen, setListOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [customLists, setCustomLists] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(6);
  const pointerStart = useRef(0);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(loadUserState());
      setRecipient(window.localStorage.getItem("detour:recipient") ?? "");
      const savedSquad = window.localStorage.getItem("detour:squad");
      if (savedSquad) {
        const validNames = new Set(PEOPLE.map((person) => person.name));
        const restored = (JSON.parse(savedSquad) as string[]).filter((name) => validNames.has(name));
        if (restored.length) setSquad(restored);
      }
      setFollowing(JSON.parse(window.localStorage.getItem("detour:following") ?? "[]") as string[]);
      setCustomLists(JSON.parse(window.localStorage.getItem("detour:lists") ?? "[]") as string[]);
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

  function toggleFollow(name: string) {
    setFollowing((current) => {
      const next = current.includes(name) ? current.filter((person) => person !== name) : [...current, name];
      window.localStorage.setItem("detour:following", JSON.stringify(next));
      return next;
    });
  }

  function toggleNumber(setter: React.Dispatch<React.SetStateAction<number[]>>, id: number) {
    setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function createList() {
    if (!listName.trim()) return;
    const next = [...customLists, listName.trim()];
    setCustomLists(next);
    window.localStorage.setItem("detour:lists", JSON.stringify(next));
    setListName("");
    setListOpen(false);
  }

  function openNotifications() {
    setUnread(0);
    setNotificationsOpen(true);
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
        <button className="wordmark" onClick={() => setView("feed")}><span>↗</span>detour</button>
        <nav className="side-nav" aria-label="Primary navigation">
          <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}><AppIcon name="feed" />Feed</button>
          <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}><AppIcon name="list" />My lists <b>{savedQuests.length}</b></button>
          <button className={view === "explore" ? "active" : ""} onClick={() => setView("explore")}><AppIcon name="search" />Explore</button>
          <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}><AppIcon name="trophy" />Leaderboard</button>
          <button className={view === "friends" ? "active" : ""} onClick={() => setView("friends")}><AppIcon name="friends" />Friends</button>
          <button className={view === "map" ? "active" : ""} onClick={() => setView("map")}><AppIcon name="map" />Map</button>
        </nav>
        <div className="left-footer">
          <button className="location-row" onClick={() => setSquadOpen(true)}>
            <span className="avatar-stack">{squad.slice(0, 3).map((name) => { const person = PEOPLE.find((item) => item.name === name); return person ? <PersonAvatar key={name} person={person} size="sm" /> : null; })}</span>
            <span><small>PLANNING FOR</small><strong>{squad.length ? `${squad.length} person squad` : "Just me"}</strong></span>
            <em>›</em>
          </button>
          <button className="profile-row" onClick={() => setView("profile")}><span className="user-avatar">OM</span><span><strong>Om Kherde</strong><small>View profile</small></span><em>›</em></button>
          <button className="contact-link" onClick={() => setContactOpen(true)}>Contact the Detour team ↗</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-header">
          <button className="wordmark" onClick={() => setView("feed")}><span>↗</span>detour</button>
          <div className="mobile-top-actions"><button onClick={() => setView("calendar")} aria-label="Open planner"><AppIcon name="calendar" /></button><button className="notification-trigger" onClick={openNotifications} aria-label="Open notifications"><AppIcon name="bell" />{unread > 0 && <b>{unread}</b>}</button><button onClick={() => setMenuOpen(true)} aria-label="Open menu"><AppIcon name="menu" /></button></div>
        </header>
        {view === "feed" && <FeedView quests={FEATURED} people={JUDGES.slice(0, 8)} following={following} onFollow={toggleFollow} liked={likedPosts} bookmarked={bookmarkedPosts} onLike={(id) => toggleNumber(setLikedPosts, id)} onBookmark={(id) => toggleNumber(setBookmarkedPosts, id)} onOpenQuest={openQuest} onSearch={() => setSearchOpen(true)} onFriends={() => setView("friends")} onLocate={requestLocation} />}
        {view === "explore" && (
          <>
            <header className="workspace-header">
              <div><p>{new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())} · {locationLabel}</p><h1>What are we doing?</h1></div>
              <button className="search-button" onClick={() => setSearchOpen(true)} aria-label="Search quests">⌕</button>
            </header>
            <button className="squad-pill" onClick={() => setSquadOpen(true)}>
              <span className="avatar-stack">{squad.slice(0, 3).map((name) => { const person = PEOPLE.find((item) => item.name === name); return person ? <PersonAvatar key={name} person={person} size="sm" /> : null; })}</span>
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
                      <a className="address-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${current.location.lat},${current.location.lng}`)}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">{current.location.address || current.location.name} ↗</a>
                      <div className="quest-facts"><span>◷ {current.durationMin} min</span><span>▱ Free</span><span>{current.groupSize === "group" ? "2-5 people" : current.groupSize}</span></div>
                    </div>
                    {IMAGES[current.id] ? <a className="photo-credit" href={PHOTO_CREDITS[current.id]} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Photo credit</a> : <a className="photo-credit" href={(photoCredits as Record<string, { source: string }>)[current.id]?.source} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Wikimedia Commons · {(photoCredits as Record<string, { license: string }>)[current.id]?.license}</a>}
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
        {view === "saved" && <ListsView saved={savedQuests} completed={user.completed.length} customLists={customLists} onQuest={openQuest} onNewList={() => setListOpen(true)} />}
        {view === "friends" && <FriendsView squad={squad} following={following} onToggle={toggleSquadMember} onFollow={toggleFollow} />}
        {view === "ranking" && <LeaderboardView people={PEOPLE} metric={leaderboardMetric} onMetric={setLeaderboardMetric} following={following} />}
        {view === "map" && <MapView quest={mapQuest} quests={ALL_QUESTS} onQuest={setMapQuest} />}
        {view === "calendar" && <PlannerView quests={savedQuests.length ? savedQuests : FEATURED} onQuest={openQuest} />}
        {view === "profile" && <ProfileView saved={savedQuests.length} completed={user.completed.length} ranked={rankedQuests.length} onContact={() => setContactOpen(true)} />}
      </section>

      <aside className="right-rail">
        <section className="rail-utility">
          <button onClick={() => setView("calendar")} aria-label="Open planner"><AppIcon name="calendar" /></button>
          <button className="notification-trigger" onClick={openNotifications} aria-label="Open notifications"><AppIcon name="bell" />{unread > 0 && <b>{unread}</b>}</button>
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu"><AppIcon name="menu" /></button>
        </section>
        <section className="rail-section">
          <header><h2>Up next</h2><button onClick={() => setSearchOpen(true)}>See all</button></header>
          <div className="up-next-list">
            {upNext.map((quest) => <button key={quest.id} onClick={() => openQuest(quest)}><span className="remote-thumb" style={{ backgroundImage: `url(${questImage(quest)})` }} /><span><strong>{quest.title}</strong><small>{quest.location.neighborhood} · {quest.durationMin} min</small></span></button>)}
          </div>
        </section>
        <section className="rail-section ranking-rail">
          <header><h2>Your ranking</h2><button onClick={() => setView("ranking")}>Full list</button></header>
          {rankedQuests.length ? <ol>{rankedQuests.slice(0, 3).map((quest, index) => <li key={quest.id}><span>{index + 1}</span><strong>{quest.title}</strong></li>)}</ol> : <p className="rail-empty">Complete a quest to start your list.</p>}
        </section>
        <div className="verified-note"><span>♮</span><p><strong>{ALL_QUESTS.length} verified ideas.</strong><small>Hours and access notes are included.</small></p></div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}><AppIcon name="feed" /><span>Feed</span></button>
        <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}><AppIcon name="list" /><span>My lists</span></button>
        <button className={`mobile-explore ${view === "explore" ? "active" : ""}`} onClick={() => setView("explore")}><i><AppIcon name="plus" size={28} /></i><span>Explore</span></button>
        <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}><AppIcon name="trophy" /><span>Leaders</span></button>
        <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}><AppIcon name="profile" /><span>Profile</span></button>
      </nav>

      {compare && comparisonQuest && <div className="modal-backdrop"><section className="modal-card"><p className="eyebrow">PLACE IT IN YOUR LIST</p><h2>Which was better?</h2><p>Your answer gives this quest an exact number.</p><button className="comparison-choice" onClick={() => answerComparison(true)}><small>NEW QUEST</small><strong>{compare.quest.title}</strong></button><span className="or">OR</span><button className="comparison-choice" onClick={() => answerComparison(false)}><small>CURRENTLY #{comparisonIndex + 1}</small><strong>{comparisonQuest.title}</strong></button></section></div>}
      {rankResult && <div className="modal-backdrop"><section className="modal-card result-card"><p className="eyebrow">RANKING UPDATED</p><strong className="result-number">#{rankResult.rank}</strong><h2>{rankResult.quest.title}</h2><button className="modal-primary" onClick={() => { setRankResult(null); setView("ranking"); }}>See full ranking</button><button className="modal-secondary" onClick={() => setRankResult(null)}>Keep exploring</button></section></div>}
      {shareOpen && current && <div className="modal-backdrop"><section className="modal-card share-modal"><button className="modal-close" onClick={() => setShareOpen(false)}>×</button><p className="eyebrow">SEND WITH PHOTON</p><h2>Send this quest.</h2><p>Enter a phone number with country code.</p><label htmlFor="recipient">Recipient</label><input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="+1 415 555 0123" inputMode="tel" /><div className="message-preview"><small>DETOUR</small><strong>{current.title}</strong><span>{current.location.name}</span></div><button className="modal-primary" onClick={sendQuest} disabled={sending || !recipient.trim()}>{sending ? "Sending..." : "Send in iMessage"}</button></section></div>}
      {searchOpen && <div className="modal-backdrop"><section className="modal-card search-modal"><button className="modal-close" onClick={() => setSearchOpen(false)}>×</button><p className="eyebrow">GLOBAL SEARCH</p><h2>Find your next move.</h2><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Quest, place, neighborhood, or person" /><div className="search-results">{PEOPLE.filter((person) => `${person.name} ${person.company}`.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, searchQuery ? 4 : 2).map((person) => <article className="person-search-result" key={person.name}><PersonAvatar person={person} /><span><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span><button className={following.includes(person.name) ? "following" : ""} onClick={() => toggleFollow(person.name)}>{following.includes(person.name) ? "Following" : "Follow"}</button></article>)}{searchResults.map((quest) => <button key={quest.id} onClick={() => openQuest(quest)}><span className="remote-thumb" style={{ backgroundImage: `url(${questImage(quest)})` }} /><span><strong>{quest.title}</strong><small>{quest.location.address || quest.location.name}</small></span></button>)}</div></section></div>}
      {squadOpen && <div className="modal-backdrop"><section className="modal-card squad-modal"><button className="modal-close" onClick={() => setSquadOpen(false)}>×</button><p className="eyebrow">SIDEQUEST SQUAD</p><h2>Who is coming?</h2><p>Selections are saved on this device and change your planning group.</p><div className="people-list">{PEOPLE.map((person) => <button key={person.name} className={squad.includes(person.name) ? "selected" : ""} onClick={() => toggleSquadMember(person.name)}><PersonAvatar person={person} /><span><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span><b>{squad.includes(person.name) ? "✓" : "+"}</b></button>)}</div><button className="modal-primary" onClick={() => setSquadOpen(false)}>Plan for {squad.length || 1}</button></section></div>}
      {contactOpen && <div className="modal-backdrop"><section className="modal-card contact-modal"><button className="modal-close" onClick={() => setContactOpen(false)}>×</button><p className="eyebrow">CONTACT</p><h2>Build with us.</h2><a href="tel:+14694304138"><span>Phone</span><strong>(469) 430-4138</strong></a><a href="https://github.com/omkherde/corgi_hackathon" target="_blank" rel="noreferrer"><span>GitHub</span><strong>omkherde/corgi_hackathon ↗</strong></a></section></div>}
      {notificationsOpen && <NotificationsPanel people={PEOPLE.slice(0, 8)} following={following} onFollow={toggleFollow} onClose={() => setNotificationsOpen(false)} />}
      {listOpen && <div className="modal-backdrop"><form className="modal-card create-list-modal" onSubmit={(event) => { event.preventDefault(); createList(); }}><button type="button" className="modal-close" onClick={() => setListOpen(false)}>×</button><p className="eyebrow">NEW LIST</p><h2>Give this list a name.</h2><input autoFocus value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Late-night SF" /><button className="modal-primary" disabled={!listName.trim()}>Create list</button></form></div>}
      {menuOpen && <div className="modal-backdrop"><section className="modal-card app-menu"><button className="modal-close" onClick={() => setMenuOpen(false)}>×</button><p className="eyebrow">DETOUR MENU</p><h2>Where to?</h2><button onClick={() => { setView("friends"); setMenuOpen(false); }}><AppIcon name="friends" /><span><strong>Friends</strong><small>Hackathon hosts and judges</small></span></button><button onClick={() => { setView("map"); setMenuOpen(false); }}><AppIcon name="map" /><span><strong>Map</strong><small>All nearby quests</small></span></button><button onClick={() => { setView("calendar"); setMenuOpen(false); }}><AppIcon name="calendar" /><span><strong>Planner</strong><small>Your saved week</small></span></button><button onClick={() => { setContactOpen(true); setMenuOpen(false); }}><AppIcon name="profile" /><span><strong>Contact</strong><small>Phone and GitHub</small></span></button></section></div>}
      {notice && <div className="notice">{notice}</div>}
    </main>
  );
}

function FeedView({ quests: items, people, following, onFollow, liked, bookmarked, onLike, onBookmark, onOpenQuest, onSearch, onFriends, onLocate }: {
  quests: Quest[];
  people: Person[];
  following: string[];
  onFollow: (name: string) => void;
  liked: number[];
  bookmarked: number[];
  onLike: (id: number) => void;
  onBookmark: (id: number) => void;
  onOpenQuest: (quest: Quest) => void;
  onSearch: () => void;
  onFriends: () => void;
  onLocate: () => void;
}) {
  const [feedMode, setFeedMode] = useState<"Nearby" | "Trending" | "Friends">("Trending");
  const [commentPost, setCommentPost] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const postPeople = [people[2], people[4], people[7]];
  async function shareQuest(quest: Quest) {
    const url = `${window.location.origin}?quest=${quest.id}`;
    if (navigator.share) await navigator.share({ title: quest.title, text: quest.body, url });
    else await navigator.clipboard.writeText(url);
  }
  return <section className="feed-view">
    <header className="feed-header"><div><p className="eyebrow">SATURDAY IN SAN FRANCISCO</p><h1>Find the good part.</h1></div><button className="feed-search" onClick={onSearch}><AppIcon name="search" /><span>Search quests, people, lists</span></button></header>
    <div className="discovery-tabs">{(["Nearby", "Trending", "Friends"] as const).map((mode) => <button key={mode} className={feedMode === mode ? "active" : ""} onClick={() => { setFeedMode(mode); if (mode === "Nearby") onLocate(); }}>{mode === "Nearby" ? "⌖" : mode === "Trending" ? "↗" : "♙"} {mode === "Friends" ? "Friend recs" : mode}</button>)}</div>
    <section className="featured-lists"><header><div><p className="eyebrow">FEATURED LISTS</p><h2>Made for tonight</h2></div><button onClick={onSearch}>See all</button></header><div className="featured-list-track">{items.slice(0, 3).map((quest, index) => <button key={quest.id} onClick={() => onOpenQuest(quest)} style={{ backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,.8)), url(${questImage(quest)})` }}><span>0 / {index + 6} COMPLETE</span><strong>{index === 0 ? "After-dark San Francisco" : index === 1 ? "Worth crossing town for" : "Photo missions for two"}</strong><small>{quest.location.neighborhood} and nearby</small></button>)}</div></section>
    <section className="friend-suggestions"><header><div><p className="eyebrow">PEOPLE IN THE ROOM</p><h2>Follow the hackathon crew</h2></div><button onClick={onFriends}>View everyone</button></header><div>{people.slice(0, 4).map((person) => <article key={person.name}><PersonAvatar person={person} size="lg" /><strong>{person.name}</strong><small>{person.company}</small><button className={following.includes(person.name) ? "following" : ""} onClick={() => onFollow(person.name)}>{following.includes(person.name) ? "Following" : "Follow"}</button></article>)}</div></section>
    <header className="feed-section-title"><p className="eyebrow">YOUR FEED</p><h2>{feedMode === "Friends" ? "What your crew saved" : feedMode === "Nearby" ? "Happening near you" : "Trending with builders"}</h2></header>
    <div className="social-feed">{items.slice(0, 3).map((quest, index) => {
      const person = postPeople[index];
      const isLiked = liked.includes(index);
      const isBookmarked = bookmarked.includes(index);
      return <article className="feed-post" key={quest.id}>
        <header><PersonAvatar person={person} /><div><strong>{person.name} <span>{index === 1 ? "saved" : "ranked"} {quest.title}</span></strong><small>{quest.location.neighborhood} · {index + 1}h</small></div><span className="feed-score">{[9.2, 8.7, 8.4][index]}</span></header>
        <button className="feed-photo" onClick={() => onOpenQuest(quest)} style={{ backgroundImage: `url(${questImage(quest)})` }}><span>{quest.vibe}</span></button>
        <div className="feed-post-copy"><h3>{quest.title}</h3><a href={`https://www.google.com/maps/search/?api=1&query=${quest.location.lat},${quest.location.lng}`} target="_blank" rel="noreferrer">{quest.location.address} ↗</a><p><b>Notes:</b> {index === 0 ? "The path looks completely different after the fog settles. Go before the late crowd and bring one person." : index === 1 ? "Exactly the kind of place you almost walk past. The small constraint made the whole stop memorable." : "Best at the edge of blue hour. The view works, but the challenge is what made this worth saving."}</p></div>
        <footer><div><button className={isLiked ? "active" : ""} onClick={() => onLike(index)} aria-label="Like"><AppIcon name="heart" /><span>{12 + index * 7 + (isLiked ? 1 : 0)}</span></button><button onClick={() => setCommentPost(commentPost === index ? null : index)} aria-label="Comment"><AppIcon name="comment" /><span>{3 + index}</span></button><button onClick={() => void shareQuest(quest)} aria-label="Share"><AppIcon name="send" /></button></div><button className={isBookmarked ? "active" : ""} onClick={() => onBookmark(index)} aria-label="Bookmark"><AppIcon name="bookmark" /></button></footer>
        {commentPost === index && <form className="comment-box" onSubmit={(event) => { event.preventDefault(); setComment(""); setCommentPost(null); }}><input autoFocus value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a note for the crew" /><button disabled={!comment.trim()}>Post</button></form>}
      </article>;
    })}</div>
  </section>;
}

function ListsView({ saved, completed, customLists, onQuest, onNewList }: { saved: Quest[]; completed: number; customLists: string[]; onQuest: (quest: Quest) => void; onNewList: () => void }) {
  const lists = [
    { title: "For tonight", subtitle: "Fast plans after dark", quest: FEATURED[2], count: saved.filter((quest) => quest.bestTime.some((time) => time.includes("night"))).length, total: 12 },
    { title: "Sidequest squad", subtitle: "Better with two or more", quest: FEATURED[0], count: completed, total: 8 },
    { title: "SF essentials", subtitle: "The good version of the classics", quest: FEATURED[3], count: Math.min(completed, 3), total: 10 },
  ];
  return <section className="inner-view lists-view"><p className="eyebrow">YOUR COLLECTION</p><h1>My lists</h1><div className="list-summary"><div><strong>{saved.length}</strong><span>Want to go</span></div><div><strong>{completed}</strong><span>Been</span></div><button onClick={onNewList}><AppIcon name="plus" /> New list</button></div><div className="curated-list-grid">{[...lists, ...customLists.map((title, index) => ({ title, subtitle: "Your custom collection", quest: FEATURED[index % FEATURED.length], count: 0, total: 0 }))].map((list) => <button key={list.title} onClick={() => onQuest(list.quest)}><span className="list-cover" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.72)), url(${questImage(list.quest)})` }}><b>{list.total ? `${list.count} / ${list.total}` : "NEW"}</b></span><span><strong>{list.title}</strong><small>{list.subtitle}</small><i><em style={{ width: `${list.total ? Math.min(100, (list.count / list.total) * 100) : 0}%` }} /></i></span></button>)}</div>{saved.length > 0 && <><header className="saved-heading"><h2>Saved quests</h2><span>{saved.length}</span></header><div className="collection-grid">{saved.map((quest) => <article key={quest.id} onClick={() => onQuest(quest)} style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.78)), url(${questImage(quest)})` }}><span>{quest.location.neighborhood}</span><h2>{quest.title}</h2><p>{quest.durationMin} min · {quest.vibe}</p></article>)}</div></>}</section>;
}

function FriendsView({ squad, following, onToggle, onFollow }: { squad: string[]; following: string[]; onToggle: (name: string) => void; onFollow: (name: string) => void }) {
  const [crew, setCrew] = useState<"Judges" | "Hosts">("Judges");
  const people = crew === "Judges" ? JUDGES : HOSTS;
  return <section className="inner-view friends-view"><p className="eyebrow">YC SUS HACKATHON</p><h1>People in the room</h1><p className="view-subtitle">Follow their Detours or add them to tonight&apos;s planning squad.</p><div className="crew-tabs"><button className={crew === "Judges" ? "active" : ""} onClick={() => setCrew("Judges")}>Judges · {JUDGES.length}</button><button className={crew === "Hosts" ? "active" : ""} onClick={() => setCrew("Hosts")}>Hosts · {HOSTS.length}</button></div><div className="crew-avatar-strip">{people.map((person) => <button key={person.name} onClick={() => onToggle(person.name)} className={squad.includes(person.name) ? "active" : ""}><PersonAvatar person={person} /><span>{person.name.split(" ")[0]}</span></button>)}</div><div className="friends-grid">{people.map((person) => <article key={person.name}><PersonAvatar person={person} size="lg" /><div><h2>{person.name}</h2><p>{person.role} · {person.company}</p><small>{squad.includes(person.name) ? "In your Sidequest squad" : "Hackathon crew"}</small></div><div className="friend-actions"><button className={following.includes(person.name) ? "following" : ""} onClick={() => onFollow(person.name)}>{following.includes(person.name) ? "Following" : "Follow"}</button><button className={squad.includes(person.name) ? "in-squad" : ""} onClick={() => onToggle(person.name)}>{squad.includes(person.name) ? "✓" : "+"}</button></div></article>)}</div></section>;
}

function LeaderboardView({ people, metric, onMetric, following }: { people: Person[]; metric: "Been" | "Influence" | "Notes" | "Photos"; onMetric: (metric: "Been" | "Influence" | "Notes" | "Photos") => void; following: string[] }) {
  const [scope, setScope] = useState<"All members" | "Following">("All members");
  const [city, setCity] = useState<"San Francisco" | "All cities">("San Francisco");
  const filtered = scope === "Following" && following.length ? people.filter((person) => following.includes(person.name)) : people;
  const multipliers = { Been: 17, Influence: 9, Notes: 13, Photos: 21 };
  return <section className="inner-view leaderboard-view"><p className="eyebrow">THE ROOM, RANKED</p><h1>Leaderboard</h1><div className="leader-tabs">{(["Been", "Influence", "Notes", "Photos"] as const).map((item) => <button key={item} className={metric === item ? "active" : ""} onClick={() => onMetric(item)}>{item}</button>)}</div><p className="leader-description">{metric === "Been" ? "Number of completed quests" : metric === "Influence" ? "Saves inspired across the community" : metric === "Notes" ? "Useful notes shared with friends" : "Original quest photos added"}</p><div className="leader-filters"><button onClick={() => setScope(scope === "All members" ? "Following" : "All members")}>{scope}⌄</button><button onClick={() => setCity(city === "San Francisco" ? "All cities" : "San Francisco")}>{city}⌄</button></div><ol>{filtered.slice(0, city === "San Francisco" ? 15 : 10).map((person, index) => <li key={person.name}><span>{index + 1}</span><PersonAvatar person={person} /><div><strong>{person.name}</strong><small>{person.company}</small></div><b>{Math.max(9, (filtered.length - index) * multipliers[metric] + (index % 3) * 4)}</b></li>)}</ol></section>;
}

function NotificationsPanel({ people, following, onFollow, onClose }: { people: Person[]; following: string[]; onFollow: (name: string) => void; onClose: () => void }) {
  return <div className="notification-backdrop" onClick={onClose}><aside className="notifications-panel" onClick={(event) => event.stopPropagation()}><header><button onClick={onClose}>←</button><h2>Notifications</h2><span /></header><p className="eyebrow">NEW</p><div>{people.map((person, index) => <article key={person.name}><PersonAvatar person={person} /><p><strong>{person.name}</strong><span>{index % 3 === 0 ? " saved a quest from your list" : index % 3 === 1 ? " just joined Detour" : " started following you"}</span><small>{index + 1}{index < 2 ? "h" : "d"}</small></p><button className={following.includes(person.name) ? "following" : ""} onClick={() => onFollow(person.name)}>{following.includes(person.name) ? "Following" : index % 3 === 2 ? "Follow back" : "Follow"}</button></article>)}</div></aside></div>;
}

function ProfileView({ saved, completed, ranked, onContact }: { saved: number; completed: number; ranked: number; onContact: () => void }) {
  const [tab, setTab] = useState<"Activity" | "Lists" | "Photos" | "Info">("Activity");
  return <section className="inner-view profile-view"><p className="eyebrow">YOUR DETOUR PROFILE</p><div className="profile-hero"><div className="profile-monogram">OM</div><div><h1>Om Kherde</h1><p>San Francisco · Sidequest squad organizer</p></div><button onClick={onContact}>Contact</button></div><div className="profile-stats"><article><strong>{saved}</strong><span>Saved</span></article><article><strong>{completed}</strong><span>Completed</span></article><article><strong>{ranked}</strong><span>Ranked</span></article></div><div className="profile-tabs">{(["Activity", "Lists", "Photos", "Info"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>{tab === "Activity" && <section className="taste-card"><p className="eyebrow">CURRENT TASTE</p><h2>Night walks, strange landmarks, and food worth crossing town for.</h2><div><span>AFTER DARK</span><span>PHOTO MISSIONS</span><span>LOCAL FOOD</span></div></section>}{tab === "Lists" && <div className="profile-panel"><h2>Three lists in rotation</h2><p>For tonight · Sidequest squad · SF essentials</p></div>}{tab === "Photos" && <div className="profile-photo-grid">{FEATURED.slice(0, 3).map((quest) => <span key={quest.id} style={{ backgroundImage: `url(${questImage(quest)})` }} />)}</div>}{tab === "Info" && <section className="profile-details"><div><span>Home base</span><strong>San Francisco, California</strong></div><div><span>Phone</span><a href="tel:+14694304138">(469) 430-4138</a></div><div><span>GitHub</span><a href="https://github.com/omkherde/corgi_hackathon" target="_blank" rel="noreferrer">omkherde/corgi_hackathon ↗</a></div></section>}</section>;
}

function PlannerView({ quests: items, onQuest }: { quests: Quest[]; onQuest: (quest: Quest) => void }) {
  const days = ["Tonight", "Sunday", "Monday", "Tuesday", "Wednesday"];
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [schedule, setSchedule] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem("detour:planner");
    if (stored) {
      try {
        const savedSchedule = JSON.parse(stored);
        queueMicrotask(() => setSchedule(savedSchedule));
      } catch {
        localStorage.removeItem("detour:planner");
      }
    }
  }, []);

  function updateSchedule(day: string, questId?: string) {
    const next = { ...schedule };
    if (questId) next[day] = questId;
    else delete next[day];
    setSchedule(next);
    localStorage.setItem("detour:planner", JSON.stringify(next));
  }

  const available = items.length ? items : FEATURED;
  const selectedQuest = available.find((quest) => quest.id === schedule[selectedDay]);

  return <section className="inner-view planner-view">
    <p className="eyebrow">WEEKEND PLANNER</p>
    <h1>Make a plan.</h1>
    <p className="view-subtitle">Put one good idea on the calendar. Your plan stays saved on this device.</p>
    <div className="planner-days">{days.map((day, index) => {
      const planned = available.find((quest) => quest.id === schedule[day]);
      return <button key={day} className={selectedDay === day ? "active" : ""} onClick={() => setSelectedDay(day)}><small>{index === 0 ? "JUL 26" : `JUL ${26 + index}`}</small><strong>{day}</strong><span>{planned ? planned.title : "Open"}</span></button>;
    })}</div>
    {selectedQuest ? <article className="planned-quest">
      <button className="planned-photo" onClick={() => onQuest(selectedQuest)} style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.72)), url(${questImage(selectedQuest)})` }}><span>{selectedQuest.location.neighborhood}</span><strong>{selectedQuest.title}</strong></button>
      <div><p className="eyebrow">{selectedDay.toUpperCase()}</p><h2>{selectedQuest.title}</h2><p>{selectedQuest.durationMin} minutes · {selectedQuest.location.name}</p><div><button onClick={() => onQuest(selectedQuest)}>View quest</button><button onClick={() => updateSchedule(selectedDay)}>Remove</button></div></div>
    </article> : <section className="planner-empty"><AppIcon name="calendar" /><div><h2>{selectedDay} is open.</h2><p>Choose a quest below and make it official.</p></div></section>}
    <header className="planner-heading"><h2>Ideas for {selectedDay.toLowerCase()}</h2><span>{available.length} nearby</span></header>
    <div className="planner-options">{available.slice(0, 8).map((quest) => <button key={quest.id} className={schedule[selectedDay] === quest.id ? "selected" : ""} onClick={() => updateSchedule(selectedDay, quest.id)}><span style={{ backgroundImage: `url(${questImage(quest)})` }} /><span><small>{quest.location.neighborhood}</small><strong>{quest.title}</strong><em>{quest.durationMin} min</em></span><b>{schedule[selectedDay] === quest.id ? "✓" : "+"}</b></button>)}</div>
  </section>;
}

function MapView({ quest, quests: items, onQuest }: { quest: Quest; quests: Quest[]; onQuest: (quest: Quest) => void }) {
  const bbox = `${quest.location.lng - 0.02}%2C${quest.location.lat - 0.015}%2C${quest.location.lng + 0.02}%2C${quest.location.lat + 0.015}`;
  return <section className="inner-view map-view"><p className="eyebrow">QUEST MAP</p><h1>San Francisco, mapped.</h1><p className="view-subtitle">OpenStreetMap needs no API key. Select a place below to recenter the map.</p><div className="map-frame"><iframe title={`Map of ${quest.location.name}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${quest.location.lat}%2C${quest.location.lng}`} loading="lazy" /><div className="map-card"><span>{quest.location.neighborhood}</span><h2>{quest.title}</h2><p>{quest.location.address || quest.location.name}</p><a href={`https://www.openstreetmap.org/?mlat=${quest.location.lat}&mlon=${quest.location.lng}#map=16/${quest.location.lat}/${quest.location.lng}`} target="_blank" rel="noreferrer">Open full map ↗</a></div></div><div className="map-quest-strip">{items.slice(0, 16).map((item) => <button key={item.id} className={item.id === quest.id ? "active" : ""} onClick={() => onQuest(item)}><span className="remote-thumb" style={{ backgroundImage: `url(${questImage(item)})` }} /><span><strong>{item.title}</strong><small>{item.location.neighborhood}</small></span></button>)}</div></section>;
}
