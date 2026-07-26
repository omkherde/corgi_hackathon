import { NextResponse } from "next/server";

import { getPhotonClient, photonIsConfigured } from "@/lib/photon";
import type { Quest } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendQuestBody = {
  quest?: Partial<Quest>;
  recipient?: string | string[];
};

function isQuest(quest: Partial<Quest> | undefined): quest is Quest {
  return Boolean(
    quest &&
      typeof quest.id === "string" &&
      typeof quest.title === "string" &&
      typeof quest.body === "string" &&
      quest.location &&
      typeof quest.location.name === "string",
  );
}

function formatQuest(quest: Quest): string {
  return [
    `DETOUR | ${quest.title}`,
    quest.body,
    `📍 ${quest.location.name}, ${quest.location.neighborhood}`,
    `⏱ ${quest.durationMin} min`,
  ].join("\n\n");
}

export async function POST(request: Request) {
  let body: SendQuestBody;
  try {
    body = (await request.json()) as SendQuestBody;
  } catch {
    return NextResponse.json({ error: "Expected a JSON request body" }, { status: 400 });
  }

  if (!isQuest(body.quest)) {
    return NextResponse.json({ error: "A valid quest is required" }, { status: 400 });
  }

  const recipient = body.recipient ?? process.env.PHOTON_DEFAULT_RECIPIENT;
  if (
    !recipient ||
    (Array.isArray(recipient) && recipient.length === 0) ||
    (typeof recipient === "string" && !recipient.trim())
  ) {
    return NextResponse.json(
      { error: "Provide recipient or configure PHOTON_DEFAULT_RECIPIENT" },
      { status: 400 },
    );
  }

  if (!photonIsConfigured()) {
    return NextResponse.json(
      { error: "Photon is not configured on this deployment" },
      { status: 503 },
    );
  }

  try {
    const photon = await getPhotonClient();
    const messageId = await photon.send(recipient, formatQuest(body.quest));
    return NextResponse.json({ ok: true, messageId });
  } catch (error) {
    console.error("Photon send failed", error);
    const message = error instanceof Error ? error.message : "";
    const targetNotAllowed = message.includes("Target not allowed");
    return NextResponse.json(
      {
        error: "Photon could not send this quest.",
        detail: targetNotAllowed
          ? "Photon blocked this recipient. Add the number to your project’s allowed targets, then try again."
          : "Photon could not send this quest. Check the number and try again.",
      },
      { status: 502 },
    );
  }
}
