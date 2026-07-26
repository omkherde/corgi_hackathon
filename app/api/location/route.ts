import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NominatimResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    county?: string;
    state?: string;
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Valid coordinates are required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "User-Agent": "Detour Hackathon App/1.0",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!response.ok) throw new Error(`Reverse geocoder returned ${response.status}`);
    const data = (await response.json()) as NominatimResponse;
    const address = data.address ?? {};
    const locality =
      address.neighbourhood ||
      address.suburb ||
      address.city ||
      address.town ||
      address.village ||
      address.county;
    const region = address.state;
    const label = [locality, region].filter(Boolean).join(", ");
    return NextResponse.json({ label: label || `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
  } catch (error) {
    console.error("Reverse geocoding failed", error);
    return NextResponse.json({ label: `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
  }
}
