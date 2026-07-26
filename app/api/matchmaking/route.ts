import { NextResponse } from "next/server";

type Presence = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  mode: "open" | "friends";
  allowedNames: string[];
  joinedAt: number;
  expiresAt: number;
  requests: { id: string; name: string; createdAt: number }[];
  matchedWith?: { id: string; name: string };
};

const globalPresence = globalThis as typeof globalThis & { detourPresence?: Map<string, Presence> };
const presence = globalPresence.detourPresence ?? new Map<string, Presence>();
globalPresence.detourPresence = presence;

const TTL_MS = 30 * 60 * 1000;

function distanceMiles(a: Presence, b: Presence) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function cleanExpired(now: number) {
  for (const [id, player] of presence) {
    if (player.expiresAt <= now) presence.delete(id);
  }
}

export async function POST(request: Request) {
  const now = Date.now();
  cleanExpired(now);
  const body = await request.json() as {
    action?: "join" | "leave" | "list" | "request" | "accept";
    sessionId?: string;
    targetId?: string;
    name?: string;
    lat?: number;
    lng?: number;
    radiusMiles?: number;
    mode?: "open" | "friends";
    allowedNames?: string[];
  };

  const id = body.sessionId?.slice(0, 80);
  if (!id) return NextResponse.json({ error: "A session ID is required." }, { status: 400 });

  if (body.action === "leave") {
    presence.delete(id);
    return NextResponse.json({ nearby: [] });
  }

  if (body.action === "join") {
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "A valid location is required." }, { status: 400 });
    }
    const existing = presence.get(id);
    presence.set(id, {
      id,
      name: (body.name || "Detour user").trim().slice(0, 24),
      lat,
      lng,
      radiusMiles: [1, 3, 5].includes(Number(body.radiusMiles)) ? Number(body.radiusMiles) : 1,
      mode: body.mode === "friends" ? "friends" : "open",
      allowedNames: Array.isArray(body.allowedNames) ? body.allowedNames.map((name) => String(name).slice(0, 60)).slice(0, 100) : [],
      joinedAt: existing?.joinedAt || now,
      expiresAt: now + TTL_MS,
      requests: existing?.requests || [],
      matchedWith: existing?.matchedWith,
    });
  }

  const player = presence.get(id);
  if (!player) return NextResponse.json({ error: "Join the queue before refreshing." }, { status: 409 });

  if (body.action === "request") {
    const target = body.targetId ? presence.get(body.targetId) : undefined;
    if (!target || target.id === player.id) return NextResponse.json({ error: "That person is no longer in the queue." }, { status: 404 });
    if (distanceMiles(player, target) > Math.min(player.radiusMiles, target.radiusMiles)) {
      return NextResponse.json({ error: "That person moved outside your shared radius." }, { status: 409 });
    }
    target.requests = [...target.requests.filter((request) => request.id !== player.id), { id: player.id, name: player.name, createdAt: now }].slice(-10);
    return NextResponse.json({ requested: true });
  }

  if (body.action === "accept") {
    const requester = body.targetId ? presence.get(body.targetId) : undefined;
    const requestExists = requester && player.requests.some((request) => request.id === requester.id);
    if (!requester || !requestExists) return NextResponse.json({ error: "That squad request expired." }, { status: 404 });
    player.matchedWith = { id: requester.id, name: requester.name };
    requester.matchedWith = { id: player.id, name: player.name };
    player.requests = player.requests.filter((request) => request.id !== requester.id);
    return NextResponse.json({ match: player.matchedWith });
  }

  const nearby = [...presence.values()]
    .filter((candidate) => {
      if (candidate.id === player.id) return false;
      const distance = distanceMiles(player, candidate);
      if (distance > Math.min(player.radiusMiles, candidate.radiusMiles)) return false;
      if (player.mode === "friends" && !player.allowedNames.includes(candidate.name)) return false;
      if (candidate.mode === "friends" && !candidate.allowedNames.includes(player.name)) return false;
      return true;
    })
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      distanceMiles: distanceMiles(player, candidate),
      mode: candidate.mode,
      joinedAt: candidate.joinedAt,
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 20);

  return NextResponse.json({ nearby, requests: player.requests, match: player.matchedWith });
}
