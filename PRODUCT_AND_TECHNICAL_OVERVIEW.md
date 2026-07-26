# Detour

## Product and Technical Overview

**Live product:** [corgi-hackathon-pink.vercel.app](https://corgi-hackathon-pink.vercel.app)  
**Repository:** [github.com/omkherde/corgi_hackathon](https://github.com/omkherde/corgi_hackathon)

---

## Executive summary

Detour is a social discovery product for finding memorable things to do nearby. It turns places into specific, time-aware “side quests,” then learns a person’s taste through swipes and head-to-head comparisons instead of generic star ratings.

The simplest description is:

> **Detour is Beli for side quests: specific things to do near you, ranked through people whose taste you trust instead of anonymous averages.**

Google Maps is excellent when someone already knows what they need. Detour is designed for the opposite moment: a person or group has free time, wants to do something interesting, and does not know what to search for.

Instead of returning another list of attractions, Detour gives the user an actionable prompt:

> Walk Grant Avenue after dark. Find the quietest block and take one portrait using only storefront light.

That distinction is the product. A listing describes a place. A Detour gives someone a reason to leave.

---

## The problem

Local discovery is fragmented across tools that solve different problems poorly:

- Maps products prioritize popular and searchable destinations.
- Review products collapse subjective experiences into averaged star ratings.
- Search results frequently surface SEO-driven versions of the same tourist lists.
- Social recommendations disappear into group chats, saved posts, and individual memory.
- Group planning requires coordinating taste, distance, timing, and availability across several apps.

The best local experiences are often highly contextual. A place may only be special at blue hour, in the fog, with two people, or when paired with a small challenge. Conventional place databases do not capture that layer.

Detour converts that missing context into a reusable product object: the **quest**.

---

## Unique value proposition

### 1. Detour recommends actions, not listings

Every quest combines:

- A real place
- A specific task or constraint
- A useful time or condition
- An expected duration
- A group-size recommendation
- A mood or activity category

This makes a recommendation immediately actionable and more memorable than a conventional place card.

### 2. Taste is learned through comparison

Detour separates two signals that most products conflate:

- **Swipe:** “Would I consider doing this?”
- **Pairwise ranking:** “Was this better than that?”

Swiping captures lightweight intent. Pairwise ranking captures a much stronger preference signal. When a completed quest is compared against the user’s existing list, binary-search insertion determines its exact position in only a few taps.

This avoids the central weakness of star ratings: different people interpret numerical scales differently, and most scores cluster within a narrow range. People are considerably better at answering “which was better?”

### 3. Discovery is personal and social

Detour combines:

- The user’s ranked history
- Swipe behavior
- Current location
- Preferred vibe, duration, and group size
- Recommendations and activity from people they follow

The result is not a universal “best of San Francisco” list. It is a changing deck based on a person and the people around them.

### 4. The experience continues outside the app

Photon Spectrum integration is designed to send a quest directly into iMessage. The recommendation can move from discovery into the group’s existing conversation without requiring everyone to adopt a new coordination workflow.

### 5. The core product remains useful when AI services fail

Detour’s quest bank is generated and reviewed ahead of time. The live application does not depend on an LLM to produce its primary content. Runtime AI enhances quest language after sufficient taste history exists, but a deterministic fallback preserves the complete product loop if Merge Gateway is unavailable.

---

## The wow factor

### A recommendation becomes a mission

The main card does not merely say where to go. It tells the group what to do when they arrive. Photography constraints, timing, group composition, and small challenges transform ordinary locations into stories.

### Ranking feels like a game

After completing a quest, the user is shown two experiences and answers one question: **Which was better?** Each answer visibly moves the new quest through the ranking until its exact position is found. Concrete rankings emerge without asking the user to invent a score.

### The app visibly develops taste

The scoring model builds a legible taste profile from the ranked list:

- Preferred quest vibes
- Typical duration
- Desired weirdness
- Solo, pair, or group preference

Once the user has enough history, Merge Gateway can rewrite the leading recommendation in a voice that reflects those preferences while preserving the original place and task.

### A quest can jump into iMessage

The Photon flow turns a selected quest into a formatted message containing its title, instructions, location, and duration. This is a strong demonstration moment because the recommendation leaves the browser and appears in the interface the group already uses.

### Nearby users can form a squad

Proximity matchmaking lets users opt into a temporary queue, choose a radius, and either meet other open users or restrict matching to friends. Exact coordinates are not displayed. Match requests and acceptance create a lightweight “fill” mechanic inspired by multiplayer games.

### The city becomes explorable in several ways

The same quest catalog can be approached as:

- A swipe deck
- A personalized feed
- A ranked list
- Saved collections
- A map
- A calendar plan
- A social recommendation
- A squad activity

The interfaces share the same underlying quest objects, so preference data follows the user across the product.

---

## Core product loop

1. Detour requests the user’s location, with San Francisco as the fallback.
2. The user chooses a vibe or browsing mode.
3. A personalized deck presents nearby quests.
4. The user swipes right to save or left to pass.
5. A saved quest can be opened, shared, placed into a plan, or sent through Photon.
6. After completing it, the user ranks it against previous experiences.
7. The ranked list updates through binary-search insertion.
8. The taste model becomes more precise and changes future recommendations.
9. Friends, squads, and social activity help the next plan form.

This is a compounding loop: discovery produces preference data, preference data improves discovery, and sharing brings more useful social signals into the system.

---

## Feature inventory

### Discovery and exploration

- Tinder-style quest deck with pointer and touch interactions
- Explicit save and pass controls
- Vibe filters for low-key, creative, active, short, and after-dark activities
- Location-aware scoring with a San Francisco fallback
- Search across quest names, locations, and neighborhoods
- Eighty preloaded quests with eighty distinct credited images
- Quest detail presentation with address, duration, timing, group size, price indicator, energy, and category tags
- Clickable map addresses
- User-created side quests with up to four uploaded photos

### Ranking and personalization

- Binary pairwise comparison flow
- Ordered personal rankings with concrete positions
- Taste-vector generation from ranked history
- Weighted preferences favoring highly ranked quests
- Distance, vibe, weirdness, duration, group-size, and social scoring
- Cold-start ordering based on distance and distinctiveness
- Optional runtime copy personalization through Merge Gateway
- Deterministic copy fallback

### Social experience

- Community directory for judges and hosts
- Follow and unfollow behavior
- Add-to-squad controls
- Persistent squad selection
- Editable Instagram, LinkedIn, X, and website fields
- URL validation for social profiles
- Feed posts with likes, comments, sharing, and bookmarks
- Expandable comment threads
- Recommendation requests that use the native share sheet or clipboard
- Notifications with working follow actions

### Planning and gamification

- Saved and custom quest lists
- Calendar-oriented planner
- Completion tracking
- Profile statistics for completed, saved, and ranked quests
- Experience points and city-scout levels
- Progress to the next level
- Unlockable achievement states
- Leaderboards for completed quests, influence, notes, and photos

### Location and matchmaking

- Browser geolocation with explicit permission request
- Interactive quest map
- One-, three-, and five-mile matchmaking radii
- Open or friends-only queue modes
- Thirty-minute presence expiration
- Match requests and acceptance
- No public display of exact user coordinates

### Sharing and messaging

- Native Web Share API support
- Clipboard fallback
- Shareable quest URLs
- Photon Spectrum server integration
- Phone-number and email target normalization
- Actionable Photon error states for credentials, target allowlists, and unavailable iMessage lines

---

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web application | Next.js 16 App Router | Full-stack React application, routing, rendering, and API endpoints |
| UI | React 19 and TypeScript | Stateful, typed product experience |
| Styling | Tailwind CSS 4 plus application CSS | Responsive desktop and mobile design system |
| Hosting | Vercel | Production builds, serverless API routes, and deployment |
| Personalization | Merge Gateway | OpenAI-compatible LLM routing for optional quest-copy rewriting |
| Messaging | Photon Spectrum and `spectrum-ts` | iMessage provider integration |
| Geolocation | Browser Geolocation API | User-approved location acquisition |
| Maps | OpenStreetMap-based embedded map | Interactive quest geography without a required map API key |
| Local persistence | Browser `localStorage` | Swipes, rankings, lists, social links, comments, and profile state |
| Content | Static JSON | Reliable quest bank and photo attribution |
| Media | Wikimedia Commons and curated local assets | Distinct quest photography with source records |

The project deliberately keeps its dependency surface small. The production package currently depends on Next.js, React, React DOM, and Photon’s Spectrum SDK.

---

## System architecture

```mermaid
flowchart TD
    GEO[Browser geolocation] --> SCORE[Client-side quest scorer]
    QUESTS[Static quest catalog] --> SCORE
    STATE[Local user state] --> SCORE
    SOCIAL[Rankings and social signals] --> SCORE
    SCORE --> DECK[Swipe and discovery UI]
    DECK --> SAVE[Saved quests and plans]
    SAVE --> RANK[Pairwise ranking]
    RANK --> STATE
    SCORE --> PERSONALIZE[/api/personalize]
    PERSONALIZE --> MERGE[Merge Gateway]
    DECK --> SEND[/api/send-quest]
    SEND --> PHOTON[Photon Spectrum]
    PHOTON --> IMESSAGE[iMessage]
    GEO --> MATCH[/api/matchmaking]
    MATCH --> SQUAD[Temporary nearby squad queue]
```

### Application routes

- `/` provides the complete client application.
- `/api/location` converts coordinates into a readable location label.
- `/api/personalize` sends a bounded taste-aware rewriting request through Merge Gateway.
- `/api/send-quest` validates and formats a quest before Photon delivery.
- `/api/matchmaking` handles temporary proximity presence, requests, and matches.

### Data model

The central object is a typed `Quest`:

```ts
type Quest = {
  id: string;
  title: string;
  body: string;
  vibe: "active" | "chill" | "photo" | "food" | "weird";
  location: {
    name: string;
    neighborhood: string;
    address?: string;
    lat: number;
    lng: number;
  };
  durationMin: number;
  bestTime: string[];
  groupSize: "solo" | "pair" | "group";
  weirdness: 1 | 2 | 3 | 4 | 5;
};
```

User preference state is intentionally compact:

```ts
type UserState = {
  ranked: string[];
  swipes: Record<string, "yes" | "no">;
  completed: string[];
};
```

The ordered `ranked` array is the core preference structure. Index zero is the user’s favorite completed quest.

---

## How the recommendation model works

Detour uses a deterministic, explainable ranking model rather than a trained recommendation model.

### Cold start

Before the user has ranked anything, quests receive:

- A boost for higher weirdness
- A penalty for distance
- Optional hard filtering by selected vibe

This helps the first session feel distinctive while remaining locally relevant.

### Taste-informed scoring

Ranked quests are weighted by position, with the top of the list contributing most. The model calculates:

- A distribution across five vibes
- Mean preferred weirdness
- Mean preferred duration
- A distribution across solo, pair, and group activities

Every unseen quest is scored from:

- Vibe similarity
- Weirdness similarity
- Duration similarity
- Group-size similarity
- Proximity
- Friend-ranking boost

The approach is fast, inspectable, inexpensive, and dependable during a live demonstration.

---

## Integration details

### Merge Gateway

`/api/personalize` uses Merge Gateway’s OpenAI-compatible chat-completions endpoint. Personalization only runs when the user has at least three ranked quests and a gateway key is configured.

The prompt:

- Preserves the original location and constraint
- Uses ranked history only as a taste signal
- Requires concise second-person language
- Prohibits ratings, algorithm references, and copied activities
- Enforces a short output limit

Requests have a five-second timeout. Any invalid, failed, or missing response returns the original quest copy.

### Photon Spectrum

`/api/send-quest`:

1. Validates the quest.
2. Validates or supplies the recipient.
3. Confirms Photon credentials are present.
4. Normalizes phone numbers or email addresses.
5. Creates an iMessage space.
6. Sends the formatted quest.
7. Returns the Photon message identifier when available.

The route distinguishes common failure classes:

- Recipient is not in the project allowlist
- Project credentials were rejected
- No active iMessage line is available
- Spectrum could not complete delivery from the serverless request

---

## Reliability and privacy decisions

- The core catalog remains usable without Merge or Photon.
- Location requires user permission and falls back safely.
- Exact matchmaking coordinates are never returned to other users.
- Matchmaking presence expires after thirty minutes.
- Social profile URLs are optional, user-entered, protocol-validated, and locally stored.
- Secrets belong in Vercel environment variables and must not be committed.
- Quest photo sources are tracked separately in `data/photo-credits.json`.
- Input validation is performed at the API boundary for quests, recipients, coordinates, and session IDs.

---

## Production status and remaining hardening

The current product is deployed, responsive, and passes linting, TypeScript compilation, static generation, and production builds. It is suitable for demos, user testing, and an early controlled release.

Before a broad public launch, the following infrastructure should be added:

1. **Authentication and accounts:** replace the hardcoded local identity with a real account system.
2. **Durable database:** move user state, comments, follows, lists, rankings, and social profiles out of `localStorage`.
3. **Durable matchmaking presence:** replace the in-memory server map with Redis, Vercel KV, or another shared low-latency store.
4. **Photon production provisioning:** activate and monitor a managed iMessage line, configure allowed targets, and verify credentials in every deployment environment.
5. **Abuse controls:** add API rate limits, reporting, moderation, and user blocking.
6. **Privacy controls:** add consent records, location-retention policies, account deletion, and published privacy terms.
7. **Observability:** add structured logs, error tracking, delivery metrics, and alerting.
8. **Automated testing:** add component, API, browser, accessibility, and mobile-device test suites.
9. **Media pipeline:** upload user photos into managed object storage with resizing and content validation.

These are scale and governance requirements, not dependencies for understanding or demonstrating the core product thesis.

---

## Suggested demonstration sequence

### 1. Establish the problem

“Maps works when you know what to search for. Detour is for when four people have three hours and no plan.”

### 2. Show expressive discovery

Open the deck, choose a vibe, and swipe through quests. Emphasize that each card contains a place, a time, and a challenge.

### 3. Show the social layer

Open the feed, interact with a post, view comments, save a quest, and add someone to the squad.

### 4. Show pairwise ranking

Complete a quest and compare it head-to-head. Let the audience see the new quest move into a concrete ranked position.

### 5. Show personalization

Return to discovery and explain how the ranked history changes the deck and optional personalized copy.

### 6. Show the interface handoff

Send a quest through Photon to the configured iMessage recipient.

### 7. End on the vision

“Detour captures the experiences that currently disappear inside friend groups, learns who has useful taste, and turns a city into something people can play together.”

---

## Strategic expansion opportunities

- City launches with locally curated quest collections
- Creator profiles and collaborative lists
- Private friend-group taste graphs
- Event and calendar integrations, including Luma
- Personalized weekly “leave the house” recommendations
- Completion photos and proof-of-quest challenges
- Venue and tourism partnerships that preserve editorial quality
- Group compatibility scoring
- Travel mode for unfamiliar cities
- Campus, conference, and company-community editions
- Durable cross-platform delivery through WhatsApp, Telegram, Slack, and additional Spectrum providers

---

## Closing position

Detour’s defensibility is not a generic database of places. It is the combination of:

1. Expressive, constraint-based quest content
2. Comparative taste data
3. Trusted social context
4. Location and timing
5. Distribution through the conversations people already use

The product answers a human question that conventional local search largely ignores:

> **Not “What is nearby?” but “What should we actually go do?”**
