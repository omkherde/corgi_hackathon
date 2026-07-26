import { NextResponse } from "next/server";

import type { Quest } from "@/types";

export const runtime = "nodejs";

const FALLBACK =
  "Your list leans toward the quiet, oddly specific stuff. This one should fit.";

type PersonalizeBody = {
  quest?: Partial<Quest>;
  rankedQuests?: Array<Partial<Quest>>;
};

function validQuest(quest: Partial<Quest> | undefined): quest is Quest {
  return Boolean(
    quest &&
      typeof quest.title === "string" &&
      typeof quest.body === "string" &&
      typeof quest.vibe === "string",
  );
}

export async function POST(request: Request) {
  let body: PersonalizeBody;
  try {
    body = (await request.json()) as PersonalizeBody;
  } catch {
    return NextResponse.json({ copy: FALLBACK, personalized: false });
  }

  if (!validQuest(body.quest)) {
    return NextResponse.json({ error: "A valid quest is required" }, { status: 400 });
  }

  const history = (body.rankedQuests ?? []).filter(validQuest).slice(0, 8);
  if (history.length < 3 || !process.env.MERGE_GATEWAY_API_KEY?.trim()) {
    return NextResponse.json({ copy: FALLBACK, personalized: false });
  }

  const prompt = [
    "Write one sentence that introduces a side quest using this person's taste history.",
    "Be specific and perceptive, not flattering. Never mention scores, algorithms, or ratings.",
    "Use at most 22 words. Do not repeat the quest body. Return only the sentence.",
    `Candidate: ${body.quest.title} — ${body.quest.body}`,
    `Ranked best to worst:\n${history
      .map((quest, index) => `${index + 1}. ${quest.title} (${quest.vibe})`)
      .join("\n")}`,
  ].join("\n\n");

  try {
    const response = await fetch(
      "https://api-gateway.merge.dev/v1/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MERGE_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.MERGE_GATEWAY_MODEL || "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 60,
          messages: [
            {
              role: "system",
              content: "You write concise, human product copy for Detour.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) throw new Error(`Merge Gateway returned ${response.status}`);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const copy = payload.choices?.[0]?.message?.content?.trim();
    if (!copy) throw new Error("Merge Gateway returned empty copy");

    return NextResponse.json({ copy, personalized: true });
  } catch (error) {
    console.error("Personalization failed", error);
    return NextResponse.json({ copy: FALLBACK, personalized: false });
  }
}
