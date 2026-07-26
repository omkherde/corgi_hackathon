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
type UserQuest = Quest & { photos: string[]; createdBy: string };
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
type View = "feed" | "explore" | "saved" | "friends" | "ranking" | "map" | "calendar" | "match" | "profile";
type CompareState = { quest: Quest; lo: number; hi: number };

function questImage(quest: Quest) {
  return (quest as UserQuest).photos?.[0] || IMAGES[quest.id] || (photoCredits as Record<string, { url: string }>)[quest.id]?.url;
}

type QuestTraits = { price: "Free" | "$" | "$$"; activity: string; energy: "Chill" | "Social" | "Active" };
function questTraits(quest: Quest): QuestTraits {
  const price = quest.vibe === "food" ? "$$" : quest.vibe === "weird" && quest.weirdness > 3 ? "$" : "Free";
  const activity = quest.vibe === "active" ? "Outdoors" : quest.vibe === "chill" ? "Slow down" : quest.vibe === "photo" ? "Creative" : quest.vibe === "food" ? "Food run" : "Wildcard";
  const energy = quest.vibe === "active" ? "Active" : quest.groupSize === "group" || quest.vibe === "food" ? "Social" : "Chill";
  return { price, activity, energy };
}

type IconName = "feed" | "list" | "search" | "trophy" | "profile" | "friends" | "map" | "bell" | "calendar" | "menu" | "heart" | "comment" | "send" | "bookmark" | "plus" | "radar" | "bolt";
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
    radar: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12 19 5"/><circle cx="12" cy="12" r="1"/></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>,
  };
  return <svg className="app-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PersonAvatar({ person, size = "md" }: { person: Person; size?: "sm" | "md" | "lg" }) {
  const initials = person.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return person.avatar === undefined
    ? <span className={`identity-avatar identity-${size}`}>{initials}</span>
    : <span className={`judge-avatar identity-${size}`} role="img" aria-label={`${person.name} profile photo`} style={{ backgroundImage: `url(/hackathon/judges/judge-${person.avatar}.png)` }} />;
}

function SquadAvatar({ seed, name, size = "md" }: { seed: string; name: string; size?: "sm" | "md" | "lg" }) {
  const index = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0) % 8;
  return <span className={`squad-avatar squad-avatar-${index} identity-${size}`} role="img" aria-label={`${name} avatar`} />;
}

export default function Home() {
  const [user, setUser] = useState<UserState>(EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("feed");
  const [location, setLocation] = useState<Coordinates>(SF);
  const [locationLabel, setLocationLabel] = useState("San Francisco");
  const [locating, setLocating] = useState(false);
  const [hasPreciseLocation, setHasPreciseLocation] = useState(false);
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [addQuestOpen, setAddQuestOpen] = useState(false);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
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
      setUserQuests(JSON.parse(window.localStorage.getItem("detour:user-quests") ?? "[]") as UserQuest[]);
      setLikedPosts(JSON.parse(window.localStorage.getItem("detour:liked-posts") ?? "[]") as number[]);
      setBookmarkedPosts(JSON.parse(window.localStorage.getItem("detour:bookmarked-posts") ?? "[]") as number[]);
      setUnread(Number(window.localStorage.getItem("detour:unread") ?? "6"));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveUserState(user);
  }, [ready, user]);

  const appQuests = useMemo(() => [...ALL_QUESTS, ...userQuests], [userQuests]);
  const byId = useMemo(() => new Map(appQuests.map((quest) => [quest.id, quest])), [appQuests]);
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
    return [...featuredDeck, ...scoreQuests([...(quests as Quest[]), ...userQuests], user, { location }).filter(({ quest }) => matchesFilter(quest))];
  }, [filter, location, user, userQuests]);
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
        setHasPreciseLocation(true);
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

  function toggleNumber(setter: React.Dispatch<React.SetStateAction<number[]>>, id: number, storageKey: string) {
    setter((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
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
    window.localStorage.setItem("detour:unread", "0");
    setNotificationsOpen(true);
  }

  function openQuest(quest: Quest) {
    setSelectedQuest(quest);
    setSearchOpen(false);
    setView("explore");
  }

  async function inviteFriends() {
    const invite = { title: "Join my Detour squad", text: "Help me find the good part of San Francisco on Detour.", url: window.location.origin };
    if (navigator.share) {
      await navigator.share(invite);
      setInviteOpen(false);
      return;
    }
    await navigator.clipboard.writeText(`${invite.text} ${invite.url}`);
    setInviteCopied(true);
  }

  function addUserQuest(quest: UserQuest) {
    const next = [quest, ...userQuests];
    setUserQuests(next);
    window.localStorage.setItem("detour:user-quests", JSON.stringify(next));
    setAddQuestOpen(false);
    setSelectedQuest(quest);
    setView("explore");
    setNotice("Sidequest added.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  const searchResults = appQuests.filter((quest) =>
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
          <button onClick={() => setAddQuestOpen(true)}><AppIcon name="plus" />Add sidequest</button>
          <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}><AppIcon name="trophy" />Leaderboard</button>
          <button className={view === "friends" ? "active" : ""} onClick={() => setView("friends")}><AppIcon name="friends" />Friends</button>
          <button className={view === "match" ? "active" : ""} onClick={() => setView("match")}><AppIcon name="radar" />Squad Match</button>
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
        {view === "feed" && <FeedView quests={FEATURED} people={JUDGES.slice(0, 8)} following={following} onFollow={toggleFollow} liked={likedPosts} bookmarked={bookmarkedPosts} onLike={(id) => toggleNumber(setLikedPosts, id, "detour:liked-posts")} onBookmark={(id) => toggleNumber(setBookmarkedPosts, id, "detour:bookmarked-posts")} onOpenQuest={openQuest} onSearch={() => setSearchOpen(true)} onFriends={() => setView("friends")} onLocate={requestLocation} onInvite={() => { setInviteCopied(false); setInviteOpen(true); }} />}
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
                      <a className="address-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((current as UserQuest).createdBy ? current.location.address || current.location.name : `${current.location.lat},${current.location.lng}`)}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">{current.location.address || current.location.name} ↗</a>
                      <div className="quest-facts"><span>◷ {current.durationMin} min</span><span>▱ {questTraits(current).price}</span><span>{questTraits(current).activity}</span><span>{questTraits(current).energy}</span><span>{current.groupSize === "group" ? "2-5 people" : current.groupSize}</span></div>
                    </div>
                    {(current as UserQuest).createdBy ? <span className="photo-credit">Added by {(current as UserQuest).createdBy}</span> : IMAGES[current.id] ? <a className="photo-credit" href={PHOTO_CREDITS[current.id]} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Photo credit</a> : <a className="photo-credit" href={(photoCredits as Record<string, { source: string }>)[current.id]?.source} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Wikimedia Commons · {(photoCredits as Record<string, { license: string }>)[current.id]?.license}</a>}
                  </article>
                </div>
                {(current as UserQuest).photos?.length > 1 && <div className="quest-photo-strip">{(current as UserQuest).photos.map((photo, index) => <span key={photo.slice(0, 40) + index} style={{ backgroundImage: `url(${photo})` }}><b>{index === 0 ? "COVER" : `${index + 1}`}</b></span>)}</div>}
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
        {view === "map" && <MapView quest={mapQuest} quests={appQuests} onQuest={setMapQuest} />}
        {view === "calendar" && <PlannerView quests={savedQuests.length ? savedQuests : FEATURED} onQuest={openQuest} />}
        {view === "match" && <MatchmakingView location={location} locationLabel={locationLabel} hasPreciseLocation={hasPreciseLocation} locating={locating} following={following} onLocate={requestLocation} onInvite={() => { setInviteCopied(false); setInviteOpen(true); }} />}
        {view === "profile" && <ProfileView saved={savedQuests.length} completed={user.completed.length} ranked={rankedQuests.length} following={following.length} onContact={() => setContactOpen(true)} />}
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
        <div className="verified-note"><span>♮</span><p><strong>{appQuests.length} ideas.</strong><small>{userQuests.length ? `${userQuests.length} added by you.` : "Hours and access notes are included."}</small></p></div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}><AppIcon name="feed" /><span>Feed</span></button>
        <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}><AppIcon name="list" /><span>My lists</span></button>
        <button className={`mobile-explore ${addQuestOpen ? "active" : ""}`} onClick={() => setAddQuestOpen(true)}><i><AppIcon name="plus" size={28} /></i><span>Add</span></button>
        <button className={view === "ranking" ? "active" : ""} onClick={() => setView("ranking")}><AppIcon name="trophy" /><span>Leaders</span></button>
        <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}><AppIcon name="profile" /><span>Profile</span></button>
      </nav>

      {compare && comparisonQuest && <div className="modal-backdrop"><section className="modal-card"><p className="eyebrow">PLACE IT IN YOUR LIST</p><h2>Which was better?</h2><p>Your answer gives this quest an exact number.</p><button className="comparison-choice" onClick={() => answerComparison(true)}><small>NEW QUEST</small><strong>{compare.quest.title}</strong></button><span className="or">OR</span><button className="comparison-choice" onClick={() => answerComparison(false)}><small>CURRENTLY #{comparisonIndex + 1}</small><strong>{comparisonQuest.title}</strong></button></section></div>}
      {rankResult && <div className="modal-backdrop"><section className="modal-card result-card"><p className="eyebrow">RANKING UPDATED</p><strong className="result-number">#{rankResult.rank}</strong><h2>{rankResult.quest.title}</h2><button className="modal-primary" onClick={() => { setRankResult(null); setView("ranking"); }}>See full ranking</button><button className="modal-secondary" onClick={() => setRankResult(null)}>Keep exploring</button></section></div>}
      {shareOpen && current && <div className="modal-backdrop"><section className="modal-card share-modal"><button className="modal-close" onClick={() => setShareOpen(false)}>×</button><p className="eyebrow">IMESSAGE</p><h2>Send this quest.</h2><p>Enter a phone number with country code.</p><label htmlFor="recipient">Recipient</label><input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="+1 415 555 0123" inputMode="tel" /><button className="modal-primary" onClick={sendQuest} disabled={sending || !recipient.trim()}>{sending ? "Sending..." : "Send in iMessage"}</button></section></div>}
      {searchOpen && <div className="modal-backdrop"><section className="modal-card search-modal"><button className="modal-close" onClick={() => setSearchOpen(false)}>×</button><p className="eyebrow">GLOBAL SEARCH</p><h2>Find your next move.</h2><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Quest, place, neighborhood, or person" /><div className="search-results">{PEOPLE.filter((person) => `${person.name} ${person.company}`.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, searchQuery ? 4 : 2).map((person) => <article className="person-search-result" key={person.name}><PersonAvatar person={person} /><span><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span><button className={following.includes(person.name) ? "following" : ""} onClick={() => toggleFollow(person.name)}>{following.includes(person.name) ? "Following" : "Follow"}</button></article>)}{searchResults.map((quest) => <button key={quest.id} onClick={() => openQuest(quest)}><span className="remote-thumb" style={{ backgroundImage: `url(${questImage(quest)})` }} /><span><strong>{quest.title}</strong><small>{quest.location.address || quest.location.name}</small></span></button>)}</div></section></div>}
      {squadOpen && <div className="modal-backdrop"><section className="modal-card squad-modal"><button className="modal-close" onClick={() => setSquadOpen(false)}>×</button><p className="eyebrow">SIDEQUEST SQUAD</p><h2>Who is coming?</h2><p>Selections are saved on this device and change your planning group.</p><div className="people-list">{PEOPLE.map((person) => <button key={person.name} className={squad.includes(person.name) ? "selected" : ""} onClick={() => toggleSquadMember(person.name)}><PersonAvatar person={person} /><span><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span><b>{squad.includes(person.name) ? "✓" : "+"}</b></button>)}</div><button className="modal-primary" onClick={() => setSquadOpen(false)}>Plan for {squad.length || 1}</button></section></div>}
      {contactOpen && <div className="modal-backdrop"><section className="modal-card contact-modal"><button className="modal-close" onClick={() => setContactOpen(false)}>×</button><p className="eyebrow">CONTACT</p><h2>Build with us.</h2><a href="tel:+14694304138"><span>Phone</span><strong>(469) 430-4138</strong></a><a href="https://github.com/omkherde/corgi_hackathon" target="_blank" rel="noreferrer"><span>GitHub</span><strong>omkherde/corgi_hackathon ↗</strong></a></section></div>}
      {notificationsOpen && <NotificationsPanel people={[...JUDGES.slice(0, 6), ...HOSTS.slice(0, 2)]} following={following} onFollow={toggleFollow} onClose={() => setNotificationsOpen(false)} />}
      {listOpen && <div className="modal-backdrop"><form className="modal-card create-list-modal" onSubmit={(event) => { event.preventDefault(); createList(); }}><button type="button" className="modal-close" onClick={() => setListOpen(false)}>×</button><p className="eyebrow">NEW LIST</p><h2>Give this list a name.</h2><input autoFocus value={listName} onChange={(event) => setListName(event.target.value)} placeholder="Late-night SF" /><button className="modal-primary" disabled={!listName.trim()}>Create list</button></form></div>}
      {menuOpen && <div className="modal-backdrop"><section className="modal-card app-menu"><button className="modal-close" onClick={() => setMenuOpen(false)}>×</button><p className="eyebrow">DETOUR MENU</p><h2>Where to?</h2><button onClick={() => { setAddQuestOpen(true); setMenuOpen(false); }}><AppIcon name="plus" /><span><strong>Add sidequest</strong><small>Share a place and its photos</small></span></button><button onClick={() => { setView("friends"); setMenuOpen(false); }}><AppIcon name="friends" /><span><strong>Friends</strong><small>Hackathon hosts and judges</small></span></button><button onClick={() => { setView("match"); setMenuOpen(false); }}><AppIcon name="radar" /><span><strong>Squad Match</strong><small>Queue with people nearby</small></span></button><button onClick={() => { setView("map"); setMenuOpen(false); }}><AppIcon name="map" /><span><strong>Map</strong><small>All nearby quests</small></span></button><button onClick={() => { setView("calendar"); setMenuOpen(false); }}><AppIcon name="calendar" /><span><strong>Planner</strong><small>Your saved week</small></span></button><button onClick={() => { setContactOpen(true); setMenuOpen(false); }}><AppIcon name="profile" /><span><strong>Contact</strong><small>Phone and GitHub</small></span></button></section></div>}
      {addQuestOpen && <AddSidequestModal location={location} onAdd={addUserQuest} onClose={() => setAddQuestOpen(false)} />}
      {inviteOpen && <div className="modal-backdrop"><section className="modal-card invite-modal"><button className="modal-close" onClick={() => setInviteOpen(false)}>×</button><p className="eyebrow">GROW THE SQUAD</p><h2>Detours are better together.</h2><p>Invite a friend to share quests, compare rankings, and plan a night out.</p><div className="invite-code"><span>YOUR INVITE LINK</span><strong>corgi-hackathon-pink.vercel.app</strong></div><button className="modal-primary" onClick={() => void inviteFriends()}>{inviteCopied ? "Copied to clipboard" : "Invite friends"}</button></section></div>}
      {notice && <div className="notice">{notice}</div>}
    </main>
  );
}

async function resizeQuestPhoto(file: File) {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = reject;
    next.src = source;
  });
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", .82);
}

function AddSidequestModal({ location, onAdd, onClose }: { location: Coordinates; onAdd: (quest: UserQuest) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [body, setBody] = useState("");
  const [vibe, setVibe] = useState<Quest["vibe"]>("chill");
  const [duration, setDuration] = useState(45);
  const [groupSize, setGroupSize] = useState<Quest["groupSize"]>("pair");
  const [photos, setPhotos] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setProcessing(true);
    const remaining = Math.max(0, 4 - photos.length);
    const next = await Promise.all([...files].filter((file) => file.type.startsWith("image/")).slice(0, remaining).map(resizeQuestPhoto));
    setPhotos([...photos, ...next]);
    setProcessing(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !place.trim() || !body.trim() || !photos.length) return;
    onAdd({
      id: `user-${crypto.randomUUID()}`,
      title: title.trim(),
      body: body.trim(),
      vibe,
      location: { name: place.trim(), neighborhood: neighborhood.trim() || "San Francisco", address: address.trim() || place.trim(), lat: location.lat, lng: location.lng },
      durationMin: duration,
      bestTime: ["anytime"],
      groupSize,
      weirdness: vibe === "weird" ? 4 : 2,
      photos,
      createdBy: "Om Kherde",
    });
  }

  const canSubmit = title.trim() && place.trim() && body.trim() && photos.length > 0;
  return <div className="modal-backdrop add-sidequest-backdrop"><form className="add-sidequest-modal" onSubmit={submit}><header><button type="button" onClick={onClose}>Cancel</button><div><p className="eyebrow">NEW SIDEQUEST</p><h2>Add a place worth leaving for.</h2></div><button className="publish-sidequest" disabled={!canSubmit || processing}>Publish</button></header><section className="sidequest-photo-editor"><div className="photo-grid">{photos.map((photo, index) => <figure key={photo.slice(0, 40) + index} className={index === 0 ? "cover-photo" : ""}><span className="uploaded-photo" role="img" aria-label={`Sidequest upload ${index + 1}`} style={{ backgroundImage: `url(${photo})` }} /><figcaption>{index === 0 ? "Cover" : index + 1}</figcaption><button type="button" onClick={() => setPhotos(photos.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Remove photo ${index + 1}`}>×</button></figure>)}{photos.length < 4 && <label className={photos.length === 0 ? "empty-photo-prompt" : ""}><input type="file" accept="image/*" multiple onChange={(event) => void addPhotos(event.target.files)} /><AppIcon name="plus" size={28} /><strong>{processing ? "Preparing photos..." : photos.length ? "Add another" : "Add photos"}</strong><small>{photos.length ? `${photos.length} of 4` : "The first photo becomes the cover"}</small></label>}</div></section><section className="sidequest-fields"><label className="full-field"><span>SIDEQUEST NAME</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Catch the last light" maxLength={70} /></label><label><span>PLACE</span><input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Bernal Heights Park" /></label><label><span>NEIGHBORHOOD</span><input value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} placeholder="Bernal Heights" /></label><label className="full-field"><span>ADDRESS</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Clickable map address" /></label><label className="full-field"><span>THE MOVE</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What should someone actually do when they get there?" maxLength={260} /></label><fieldset className="full-field"><legend>WHAT KIND OF DETOUR?</legend><div className="vibe-picker">{(["active", "chill", "photo", "food", "weird"] as const).map((item) => <button type="button" key={item} className={vibe === item ? "active" : ""} onClick={() => setVibe(item)}>{item === "active" ? "Active" : item === "chill" ? "Chill" : item === "photo" ? "Creative" : item === "food" ? "Food" : "Wildcard"}</button>)}</div></fieldset><label><span>DURATION</span><select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[20, 30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><label><span>BEST WITH</span><select value={groupSize} onChange={(event) => setGroupSize(event.target.value as Quest["groupSize"])}><option value="solo">Solo</option><option value="pair">Two people</option><option value="group">A group</option></select></label></section></form></div>;
}

function FeedView({ quests: items, people, following, onFollow, liked, bookmarked, onLike, onBookmark, onOpenQuest, onSearch, onFriends, onLocate, onInvite }: {
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
  onInvite: () => void;
}) {
  const [feedMode, setFeedMode] = useState<"Nearby" | "Trending" | "Friends">("Trending");
  const [commentPost, setCommentPost] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sharedPosts, setSharedPosts] = useState<number[]>([]);
  const [comments, setComments] = useState<Record<number, { name: string; text: string }[]>>({
    0: [{ name: "Aidan", text: "The fog was perfect around 7." }, { name: "Saai", text: "Saving this for tomorrow morning." }, { name: "Bill", text: "Bring a jacket. It gets cold fast." }],
    1: [{ name: "Leon", text: "The maple bar is the move." }, { name: "Connor", text: "This is dangerously close to the venue." }, { name: "Dammy", text: "Late-night squad?" }, { name: "Sean", text: "I am in." }],
    2: [{ name: "Guanming", text: "Grant looks great after the shops close." }, { name: "Marinos", text: "Blue hour works too." }, { name: "Varun", text: "Bring the small lens." }, { name: "Leo", text: "The storefront light is enough." }, { name: "Anis", text: "Best photo mission in the deck." }],
  });
  const [hiddenPeople, setHiddenPeople] = useState<string[]>([]);
  const [recommendationAsk, setRecommendationAsk] = useState("");
  const [recommendationSent, setRecommendationSent] = useState(false);
  const postPeople = [people[2], people[4], people[7]];
  const feedItems = feedMode === "Nearby" ? [items[0], items[2], items[1]] : feedMode === "Friends" ? [items[1], items[0], items[2]] : [items[2], items[0], items[1]];
  useEffect(() => {
    queueMicrotask(() => {
      const savedComments = window.localStorage.getItem("detour:feed-comments");
      if (savedComments) setComments(JSON.parse(savedComments) as Record<number, { name: string; text: string }[]>);
    });
  }, []);

  async function shareQuest(quest: Quest, index: number) {
    const url = `${window.location.origin}?quest=${quest.id}`;
    try {
      if (navigator.share) await navigator.share({ title: quest.title, text: quest.body, url });
      else await navigator.clipboard.writeText(url);
      setSharedPosts((current) => current.includes(index) ? current : [...current, index]);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) await navigator.clipboard.writeText(url);
    }
  }

  function postComment(index: number) {
    if (!comment.trim()) return;
    const next = { ...comments, [index]: [...(comments[index] || []), { name: "Om", text: comment.trim() }] };
    setComments(next);
    window.localStorage.setItem("detour:feed-comments", JSON.stringify(next));
    setComment("");
  }
  async function askFriends() {
    if (!recommendationAsk.trim()) return;
    const text = `Any Detour recommendations for: ${recommendationAsk.trim()}`;
    try {
      if (navigator.share) await navigator.share({ title: "Help me pick a Detour", text });
      else await navigator.clipboard.writeText(text);
      setRecommendationSent(true);
      setRecommendationAsk("");
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) await navigator.clipboard.writeText(text);
    }
  }
  return <section className="feed-view">
    <header className="feed-header"><div><p className="eyebrow">SATURDAY IN SAN FRANCISCO</p><h1>Find the good part.</h1></div><button className="feed-search" onClick={onSearch}><AppIcon name="search" /><span>Search quests, people, lists</span></button></header>
    <div className="discovery-tabs">{(["Nearby", "Trending", "Friends"] as const).map((mode) => <button key={mode} className={feedMode === mode ? "active" : ""} onClick={() => { setFeedMode(mode); if (mode === "Nearby") onLocate(); }}>{mode === "Nearby" ? "⌖" : mode === "Trending" ? "↗" : "♙"} {mode === "Friends" ? "Friend recs" : mode}</button>)}</div>
    <section className="invite-banner"><div><p className="eyebrow">SIDEQUEST SQUAD</p><h2>Bring the group with you.</h2><span>Share rankings, trade recommendations, and build tonight&apos;s plan together.</span></div><div className="invite-benefits"><span><AppIcon name="trophy" size={18} />Shared rankings</span><span><AppIcon name="send" size={18} />Quest sharing</span><span><AppIcon name="friends" size={18} />Squad planning</span></div><button onClick={onInvite}>Invite friends</button></section>
    <section className="featured-lists"><header><div><p className="eyebrow">FEATURED LISTS</p><h2>Made for tonight</h2></div><button onClick={onSearch}>See all</button></header><div className="featured-list-track">{items.slice(0, 3).map((quest, index) => <button key={quest.id} onClick={() => onOpenQuest(quest)} style={{ backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,.8)), url(${questImage(quest)})` }}><span>0 / {index + 6} COMPLETE</span><strong>{index === 0 ? "After-dark San Francisco" : index === 1 ? "Worth crossing town for" : "Photo missions for two"}</strong><small>{quest.location.neighborhood} and nearby</small></button>)}</div></section>
    <section className="friend-suggestions"><header><div><p className="eyebrow">PEOPLE IN THE ROOM</p><h2>Follow the hackathon crew</h2></div><button onClick={onFriends}>View everyone</button></header><div>{people.filter((person) => !hiddenPeople.includes(person.name)).slice(0, 4).map((person) => <article key={person.name}><button className="dismiss-person" onClick={() => setHiddenPeople([...hiddenPeople, person.name])} aria-label={`Dismiss ${person.name}`}>×</button><PersonAvatar person={person} size="lg" /><strong>{person.name}</strong><small>{person.company}</small><button className={following.includes(person.name) ? "following" : ""} onClick={() => onFollow(person.name)}>{following.includes(person.name) ? "Following" : "Follow"}</button></article>)}</div></section>
    <form className="ask-friends" onSubmit={(event) => { event.preventDefault(); void askFriends(); }}><span className="profile-monogram">OM</span><label><span>{recommendationSent ? "Recommendation request shared" : "Ask your friends for a recommendation"}</span><input value={recommendationAsk} onChange={(event) => { setRecommendationAsk(event.target.value); setRecommendationSent(false); }} placeholder="Late-night food near Chinatown?" /></label><button disabled={!recommendationAsk.trim()} aria-label="Share recommendation request"><AppIcon name="send" /></button></form>
    <header className="feed-section-title"><p className="eyebrow">YOUR FEED</p><h2>{feedMode === "Friends" ? "What your crew saved" : feedMode === "Nearby" ? "Happening near you" : "Trending with builders"}</h2></header>
    <div className="social-feed">{feedItems.filter(Boolean).map((quest, index) => {
      const person = postPeople[index];
      const isLiked = liked.includes(index);
      const isBookmarked = bookmarked.includes(index);
      return <article className="feed-post" key={quest.id}>
        <header><PersonAvatar person={person} /><div><strong>{person.name} <span>{index === 1 ? "saved" : "ranked"} {quest.title}</span></strong><small>{quest.location.neighborhood} · {index + 1}h</small></div><span className="feed-score">{[9.2, 8.7, 8.4][index]}</span></header>
        <button className="feed-photo" onClick={() => onOpenQuest(quest)} style={{ backgroundImage: `url(${questImage(quest)})` }}><span>{quest.vibe}</span></button>
        <div className="feed-post-copy"><h3>{quest.title}</h3><div className="feed-tags"><span>{questTraits(quest).price}</span><span>{questTraits(quest).activity}</span><span>{questTraits(quest).energy}</span><span>{quest.durationMin} min</span></div><a href={`https://www.google.com/maps/search/?api=1&query=${quest.location.lat},${quest.location.lng}`} target="_blank" rel="noreferrer">{quest.location.address} ↗</a><p><b>Notes:</b> {index === 0 ? "The path looks completely different after the fog settles. Go before the late crowd and bring one person." : index === 1 ? "Exactly the kind of place you almost walk past. The small constraint made the whole stop memorable." : "Best at the edge of blue hour. The view works, but the challenge is what made this worth saving."}</p></div>
        <footer><div><button className={isLiked ? "active" : ""} onClick={() => onLike(index)} aria-label="Like" aria-pressed={isLiked}><AppIcon name="heart" /><span>{12 + index * 7 + (isLiked ? 1 : 0)}</span></button><button className={commentPost === index ? "active" : ""} onClick={() => setCommentPost(commentPost === index ? null : index)} aria-label="Comments" aria-expanded={commentPost === index}><AppIcon name="comment" /><span>{comments[index]?.length || 0}</span></button><button className={sharedPosts.includes(index) ? "active" : ""} onClick={() => void shareQuest(quest, index)} aria-label="Share" aria-pressed={sharedPosts.includes(index)}><AppIcon name="send" /></button></div><button className={isBookmarked ? "active" : ""} onClick={() => onBookmark(index)} aria-label="Bookmark" aria-pressed={isBookmarked}><AppIcon name="bookmark" /></button></footer>
        {commentPost === index && <section className="comment-thread"><div>{(comments[index] || []).map((item, commentIndex) => <article key={`${item.name}-${commentIndex}`}><span>{item.name.slice(0, 1)}</span><p><strong>{item.name}</strong>{item.text}</p></article>)}</div><form className="comment-box" onSubmit={(event) => { event.preventDefault(); postComment(index); }}><input autoFocus value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" /><button disabled={!comment.trim()}>Post</button></form></section>}
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

function ProfileView({ saved, completed, ranked, following, onContact }: { saved: number; completed: number; ranked: number; following: number; onContact: () => void }) {
  const [tab, setTab] = useState<"Activity" | "Lists" | "Photos" | "Info">("Activity");
  const xp = completed * 250 + saved * 40 + following * 25;
  const level = Math.floor(xp / 500) + 1;
  const progress = xp % 500;
  return <section className="inner-view profile-view"><p className="eyebrow">YOUR DETOUR PROFILE</p><div className="profile-hero"><div className="profile-monogram">OM</div><div><h1>Om Kherde</h1><p>San Francisco · Level {level} city scout</p></div><button onClick={onContact}>Contact</button></div><section className="level-card"><div><span className="level-orb"><AppIcon name="bolt" />{level}</span><div><p className="eyebrow">CITY SCOUT LEVEL {level}</p><h2>{completed < 3 ? "Getting off the map." : completed < 8 ? "Neighborhood regular." : "Local legend."}</h2></div><strong>{xp} XP</strong></div><i><em style={{ width: `${(progress / 500) * 100}%` }} /></i><small>{500 - progress} XP to level {level + 1}</small></section><div className="profile-stats"><article><strong>{completed}</strong><span>Sidequests</span></article><article><strong>{saved}</strong><span>Saved</span></article><article><strong>{ranked}</strong><span>Ranked</span></article></div><div className="profile-tabs">{(["Activity", "Lists", "Photos", "Info"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>{tab === "Activity" && <><section className="taste-card"><p className="eyebrow">CURRENT TASTE</p><h2>Night walks, strange landmarks, and food worth crossing town for.</h2><div><span>AFTER DARK</span><span>PHOTO MISSIONS</span><span>LOCAL FOOD</span></div></section><section className="achievement-grid"><article className={completed >= 1 ? "unlocked" : ""}><AppIcon name="map" /><strong>First detour</strong><small>Complete one sidequest</small></article><article className={completed >= 3 ? "unlocked" : ""}><AppIcon name="friends" /><strong>Outside person</strong><small>Complete three sidequests</small></article><article className={completed >= 8 ? "unlocked" : ""}><AppIcon name="trophy" /><strong>City folklore</strong><small>Complete eight sidequests</small></article></section></>}{tab === "Lists" && <div className="profile-panel"><h2>Three lists in rotation</h2><p>For tonight · Sidequest squad · SF essentials</p></div>}{tab === "Photos" && <div className="profile-photo-grid">{FEATURED.slice(0, 3).map((quest) => <span key={quest.id} style={{ backgroundImage: `url(${questImage(quest)})` }} />)}</div>}{tab === "Info" && <section className="profile-details"><div><span>Home base</span><strong>San Francisco, California</strong></div><div><span>Phone</span><a href="tel:+14694304138">(469) 430-4138</a></div><div><span>GitHub</span><a href="https://github.com/omkherde/corgi_hackathon" target="_blank" rel="noreferrer">omkherde/corgi_hackathon ↗</a></div></section>}</section>;
}

type NearbyPlayer = { id: string; name: string; distanceMiles: number; mode: "open" | "friends"; joinedAt: number };
type SquadRequest = { id: string; name: string; createdAt: number };
function MatchmakingView({ location, locationLabel, hasPreciseLocation, locating, following, onLocate, onInvite }: { location: Coordinates; locationLabel: string; hasPreciseLocation: boolean; locating: boolean; following: string[]; onLocate: () => void; onInvite: () => void }) {
  const [radius, setRadius] = useState(1);
  const [mode, setMode] = useState<"open" | "friends">("open");
  const [active, setActive] = useState(false);
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  const [requests, setRequests] = useState<SquadRequest[]>([]);
  const [match, setMatch] = useState<{ id: string; name: string } | null>(null);
  const [nickname, setNickname] = useState("Om");
  const [status, setStatus] = useState("");
  const session = useRef("");

  useEffect(() => {
    queueMicrotask(() => {
      session.current = window.localStorage.getItem("detour:match-session") || crypto.randomUUID();
      window.localStorage.setItem("detour:match-session", session.current);
      setNickname(window.localStorage.getItem("detour:match-name") || "Om");
    });
  }, []);

  async function updateQueue(action: "join" | "leave" | "list" | "request" | "accept", targetId?: string) {
    if (!session.current) return;
    setStatus(action === "join" ? "Joining the queue..." : status);
    try {
      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId, sessionId: session.current, name: nickname.trim() || "Detour user", lat: location.lat, lng: location.lng, radiusMiles: radius, mode, allowedNames: following }),
      });
      const data = await response.json() as { nearby?: NearbyPlayer[]; requests?: SquadRequest[]; match?: { id: string; name: string }; requested?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Matchmaking is unavailable");
      if (data.nearby) setNearby(data.nearby);
      if (data.requests) setRequests(data.requests);
      if (data.match) {
        setMatch(data.match);
        setStatus(`Squad formed with ${data.match.name}.`);
      }
      if (data.requested) setStatus("Squad request sent. You will match when they accept.");
      if (action === "join") {
        setActive(true);
        setStatus("You are discoverable for 30 minutes.");
        window.localStorage.setItem("detour:match-name", nickname.trim() || "Detour user");
      } else if (action === "leave") {
        setActive(false);
        setNearby([]);
        setRequests([]);
        setMatch(null);
        setStatus("You left the queue.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Matchmaking is unavailable");
    }
  }

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void updateQueue("join"), 20000);
    return () => window.clearInterval(timer);
  });

  return <section className="inner-view match-view">
    <p className="eyebrow">PROXIMITY MATCHMAKING</p><h1>Fill the squad.</h1>
    <p className="view-subtitle">Opt in for 30 minutes and find other Detour users who are ready to go now. Exact locations are never shown.</p>
    <div className="match-layout"><section className="match-control"><div className={`radar-visual ${active ? "active" : ""}`}><i /><i /><i /><span><AppIcon name="radar" size={34} /></span>{nearby.slice(0, 3).map((player, index) => <b key={player.id} className={`ping ping-${index + 1}`} title={player.name} />)}</div><div className="match-status"><span className={hasPreciseLocation ? "ready" : ""}>{hasPreciseLocation ? "LOCATION READY" : "LOCATION REQUIRED"}</span><strong>{hasPreciseLocation ? locationLabel : "Share your location to set a real radius"}</strong></div>{!hasPreciseLocation ? <button className="match-primary" onClick={onLocate} disabled={locating}>{locating ? "Finding you..." : "Use my location"}</button> : active ? <button className="match-secondary" onClick={() => void updateQueue("leave")}>Leave queue</button> : <button className="match-primary" onClick={() => void updateQueue("join")}>Find my squad</button>}<small className="privacy-note">Your coordinates are held temporarily in memory and expire automatically. Other users only receive an approximate distance.</small></section><section className="match-settings"><label><span>DISPLAY NAME</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} disabled={active} /></label><div><span className="setting-label">WHO CAN MATCH</span><div className="segmented">{(["open", "friends"] as const).map((item) => <button key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)} disabled={active}>{item === "open" ? "Open squad" : "Friends only"}</button>)}</div></div><div><span className="setting-label">SEARCH RADIUS</span><div className="radius-options">{[1, 3, 5].map((miles) => <button key={miles} className={radius === miles ? "active" : ""} onClick={() => setRadius(miles)} disabled={active}>{miles} mi</button>)}</div></div><p className="queue-copy">{mode === "open" ? "Open squad lets you match with any opted-in Detour user nearby." : `Friends only limits results to the ${following.length} people you follow.`}</p><button className="invite-known" onClick={onInvite}><AppIcon name="friends" />Invite friends instead</button></section></div>
    <section className="nearby-queue"><header><div><p className="eyebrow">QUEUE</p><h2>{active ? `${nearby.length} nearby ${nearby.length === 1 ? "person" : "people"}` : "Not discoverable yet"}</h2></div>{active && <button onClick={() => void updateQueue("list")}>Refresh</button>}</header>{match && <div className="formed-squad"><SquadAvatar seed={match.id} name={match.name} /><div><small>SQUAD FORMED</small><strong>You matched with {match.name}</strong></div><AppIcon name="bolt" /></div>}{requests.length > 0 && <div className="squad-requests"><p className="eyebrow">REQUESTS</p>{requests.map((request) => <article key={request.id}><SquadAvatar seed={request.id} name={request.name} /><div><strong>{request.name}</strong><small>Wants to queue up with you</small></div><button onClick={() => void updateQueue("accept", request.id)}>Accept</button></article>)}</div>}{active && nearby.length > 0 ? <div>{nearby.map((player) => <article key={player.id}><SquadAvatar seed={player.id} name={player.name} /><div><strong>{player.name}</strong><small>{player.distanceMiles < .1 ? "Less than 0.1 mi away" : `${player.distanceMiles.toFixed(1)} mi away`} · Ready now</small></div><button onClick={() => void updateQueue("request", player.id)}>Queue up</button></article>)}</div> : !match && <div className="queue-empty"><AppIcon name="radar" size={30} /><p>{active ? "No opted-in users are in your radius yet. Keep the queue open or invite your friends." : "Choose your radius and go discoverable when you are ready."}</p></div>}{status && <p className="match-message">{status}</p>}</section>
  </section>;
}

function calendarDate(dayOffset: number, hour = 19) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function exportQuestCalendar(quest: Quest, dayOffset: number) {
  const start = calendarDate(dayOffset);
  const end = new Date(start.getTime() + quest.durationMin * 60000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Detour//Sidequest//EN", "BEGIN:VEVENT", `UID:${quest.id}-${start.getTime()}@detour`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(quest.title)}`, `DESCRIPTION:${escape(quest.body)}`, `LOCATION:${escape(quest.location.address || quest.location.name)}`, `GEO:${quest.location.lat};${quest.location.lng}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  link.download = `${quest.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function handoffQuestEvent(quest: Quest, platform: "Luma" | "Partiful") {
  const details = `${quest.title}\n${quest.body}\n${quest.location.address || quest.location.name}\n${quest.durationMin} minutes`;
  const url = platform === "Luma" ? "https://luma.com/home" : "https://partiful.com/";
  window.open(url, "_blank", "noopener,noreferrer");
  void navigator.clipboard.writeText(details);
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
      <div><p className="eyebrow">{selectedDay.toUpperCase()}</p><h2>{selectedQuest.title}</h2><p>{selectedQuest.durationMin} minutes · {selectedQuest.location.name}</p><div className="planned-tags"><span>{questTraits(selectedQuest).price}</span><span>{questTraits(selectedQuest).activity}</span><span>{questTraits(selectedQuest).energy}</span></div><div className="planned-actions"><button onClick={() => onQuest(selectedQuest)}>View quest</button><button onClick={() => exportQuestCalendar(selectedQuest, days.indexOf(selectedDay))}>Add to calendar</button><button onClick={() => updateSchedule(selectedDay)}>Remove</button></div><div className="event-handoffs"><span>CREATE AN EVENT</span><button onClick={() => handoffQuestEvent(selectedQuest, "Luma")}>Luma ↗</button><button onClick={() => handoffQuestEvent(selectedQuest, "Partiful")}>Partiful ↗</button><small>Quest details are copied for pasting.</small></div></div>
    </article> : <section className="planner-empty"><AppIcon name="calendar" /><div><h2>{selectedDay} is open.</h2><p>Choose a quest below and make it official.</p></div></section>}
    <header className="planner-heading"><h2>Ideas for {selectedDay.toLowerCase()}</h2><span>{available.length} nearby</span></header>
    <div className="planner-options">{available.slice(0, 8).map((quest) => <button key={quest.id} className={schedule[selectedDay] === quest.id ? "selected" : ""} onClick={() => updateSchedule(selectedDay, quest.id)}><span style={{ backgroundImage: `url(${questImage(quest)})` }} /><span><small>{quest.location.neighborhood}</small><strong>{quest.title}</strong><em>{quest.durationMin} min · {questTraits(quest).price} · {questTraits(quest).energy}</em></span><b>{schedule[selectedDay] === quest.id ? "✓" : "+"}</b></button>)}</div>
  </section>;
}

function MapView({ quest, quests: items, onQuest }: { quest: Quest; quests: Quest[]; onQuest: (quest: Quest) => void }) {
  const bbox = `${quest.location.lng - 0.02}%2C${quest.location.lat - 0.015}%2C${quest.location.lng + 0.02}%2C${quest.location.lat + 0.015}`;
  return <section className="inner-view map-view"><p className="eyebrow">QUEST MAP</p><h1>San Francisco, mapped.</h1><div className="map-frame"><iframe title={`Map of ${quest.location.name}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${quest.location.lat}%2C${quest.location.lng}`} loading="lazy" /><div className="map-card"><span>{quest.location.neighborhood}</span><h2>{quest.title}</h2><p>{quest.location.address || quest.location.name}</p><a href={`https://www.openstreetmap.org/?mlat=${quest.location.lat}&mlon=${quest.location.lng}#map=16/${quest.location.lat}/${quest.location.lng}`} target="_blank" rel="noreferrer">Open full map ↗</a></div></div><div className="map-quest-strip">{items.slice(0, 16).map((item) => <button key={item.id} className={item.id === quest.id ? "active" : ""} onClick={() => onQuest(item)}><span className="remote-thumb" style={{ backgroundImage: `url(${questImage(item)})` }} /><span><strong>{item.title}</strong><small>{item.location.neighborhood}</small></span></button>)}</div></section>;
}
