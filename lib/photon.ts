import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

type PhotonClient = {
  send: (recipient: string | string[], message: string) => Promise<string | null>;
  stop: () => Promise<void>;
};

declare global {
  var __detourPhotonClient: Promise<PhotonClient> | undefined;
}

function spectrumEnv(
  canonical: "SPECTRUM_PROJECT_ID" | "SPECTRUM_PROJECT_SECRET",
  legacy: "PHOTON_PROJECT_ID" | "PHOTON_PROJECT_SECRET",
): string | undefined {
  return process.env[canonical]?.trim() || process.env[legacy]?.trim();
}

function requiredEnv(
  canonical: "SPECTRUM_PROJECT_ID" | "SPECTRUM_PROJECT_SECRET",
  legacy: "PHOTON_PROJECT_ID" | "PHOTON_PROJECT_SECRET",
): string {
  const value = spectrumEnv(canonical, legacy);
  if (!value) throw new Error(`${canonical} is not configured`);
  return value;
}

async function createPhotonClient(): Promise<PhotonClient> {
  const spectrum = await Spectrum({
    projectId: requiredEnv("SPECTRUM_PROJECT_ID", "PHOTON_PROJECT_ID"),
    projectSecret: requiredEnv(
      "SPECTRUM_PROJECT_SECRET",
      "PHOTON_PROJECT_SECRET",
    ),
    providers: [imessage.config()],
    options: { logLevel: "warn" },
  });

  const provider = imessage(spectrum);

  return {
    async send(recipient, message) {
      const recipients = Array.isArray(recipient) ? recipient : [recipient];
      const normalized = recipients.map((value) => value.trim()).filter(Boolean);
      if (normalized.length === 0) throw new Error("At least one recipient is required");

      const space = await provider.space.create(
        normalized.length === 1 ? normalized[0] : normalized,
      );
      const sent = await space.send(message);
      return sent?.id ?? null;
    },
    stop: () => spectrum.stop(),
  };
}

export function getPhotonClient(): Promise<PhotonClient> {
  if (!globalThis.__detourPhotonClient) {
    globalThis.__detourPhotonClient = createPhotonClient().catch((error) => {
      globalThis.__detourPhotonClient = undefined;
      throw error;
    });
  }

  return globalThis.__detourPhotonClient;
}

export function photonIsConfigured(): boolean {
  return Boolean(
    spectrumEnv("SPECTRUM_PROJECT_ID", "PHOTON_PROJECT_ID") &&
      spectrumEnv("SPECTRUM_PROJECT_SECRET", "PHOTON_PROJECT_SECRET"),
  );
}
