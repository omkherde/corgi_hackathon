# Detour

Detour is Beli for side quests: weird, specific things to do near you, ranked
by your friends' actual taste instead of strangers' star ratings.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `.env.local` with a Merge Gateway API key and Photon Spectrum project
credentials. Never commit `.env.local`.

```env
MERGE_GATEWAY_API_KEY=
MERGE_GATEWAY_MODEL=gpt-4o-mini
SPECTRUM_PROJECT_ID=
SPECTRUM_PROJECT_SECRET=
PHOTON_DEFAULT_RECIPIENT=
```

## Commands

```bash
npm run lint
npm run build
node --experimental-strip-types scripts/gen-quests.ts
```

The app uses Next.js App Router, Merge Gateway for runtime quest-copy
personalization, Photon Spectrum for iMessage delivery, static quest data, and
browser `localStorage` for user state.
