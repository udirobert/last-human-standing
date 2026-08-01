/**
 * ElevenLabs-backed background music catalog + disk cache.
 *
 * Tracks are generated offline (scripts/generate-bgm.mjs) or lazily on
 * first request, then served from server/data/bgm. The API key never
 * leaves the server.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BGM_DIR = path.resolve(__dirname, "../data/bgm");

/** FIFA-style stations — short instrumental loops matched to game phase. */
export const BGM_STATIONS = [
  {
    id: "ember-vigil",
    title: "Ember Vigil",
    phases: ["prelaunch"],
    prompt:
      "Instrumental only, no vocals. Warm analog lo-fi ambient for a waiting room before a high-stakes game. Soft muted guitar, gentle tape hiss, slow heartbeat kick at 72 bpm, hopeful but tense. Seamless loop feel, no big drops.",
    musicLengthMs: 28_000,
  },
  {
    id: "field-tension",
    title: "Field Tension",
    phases: ["live"],
    prompt:
      "Instrumental only, no vocals. Cinematic survival underscore for a daily elimination game. Low pulsing synth bass, sparse metallic percussion, distant siren-like pads, 95 bpm. Foreboding but human, never horror-jump-scare. Loop-friendly.",
    musicLengthMs: 30_000,
  },
  {
    id: "audit-pulse",
    title: "Audit Pulse",
    phases: ["live", "audit"],
    prompt:
      "Instrumental only, no vocals. Investigative electronic groove for a jury voting screen. Dry breakbeat at 108 bpm, detective-noir Rhodes stabs, filtered bass, curious not aggressive. Clean mix, seamless loop energy.",
    musicLengthMs: 28_000,
  },
  {
    id: "last-light",
    title: "Last Light",
    phases: ["ended"],
    prompt:
      "Instrumental only, no vocals. Bittersweet closing theme after a long survival game. Soft piano, warm strings, slow 70 bpm pulse, melancholic resolution with a faint ember of hope. No vocals, loopable ending.",
    musicLengthMs: 32_000,
  },
];

export function ensureBgmDir() {
  fs.mkdirSync(BGM_DIR, { recursive: true });
}

export function trackPaths(id) {
  return {
    mp3: path.join(BGM_DIR, `${id}.mp3`),
    meta: path.join(BGM_DIR, `${id}.json`),
  };
}

export function listAvailableStations() {
  ensureBgmDir();
  return BGM_STATIONS.map((station) => {
    const { mp3, meta } = trackPaths(station.id);
    const ready = fs.existsSync(mp3) && fs.statSync(mp3).size > 1024;
    let generatedAt = null;
    if (fs.existsSync(meta)) {
      try {
        generatedAt = JSON.parse(fs.readFileSync(meta, "utf8")).generatedAt ?? null;
      } catch {
        generatedAt = null;
      }
    }
    return {
      id: station.id,
      title: station.title,
      phases: station.phases,
      ready,
      generatedAt,
      url: ready ? `/api/music/track/${station.id}` : null,
    };
  });
}

export function getStation(id) {
  return BGM_STATIONS.find((s) => s.id === id) || null;
}

export function isTrackReady(id) {
  const { mp3 } = trackPaths(id);
  try {
    return fs.existsSync(mp3) && fs.statSync(mp3).size > 1024;
  } catch {
    return false;
  }
}

export function pickStationForPhase(phase, screen) {
  if (screen === "feed" || screen === "audit") {
    const audit = BGM_STATIONS.find((s) => s.id === "audit-pulse");
    if (audit && fs.existsSync(trackPaths(audit.id).mp3)) return audit.id;
  }
  const match = BGM_STATIONS.find((s) => s.phases.includes(phase || "prelaunch"));
  return match?.id || BGM_STATIONS[0].id;
}

/**
 * Compose one station via ElevenLabs Music API and write to disk.
 * Returns absolute mp3 path.
 */
export async function composeStation(station, { apiKey, force = false } = {}) {
  if (!station) throw new Error("station_required");
  if (!apiKey) throw new Error("elevenlabs_api_key_missing");
  ensureBgmDir();
  const { mp3, meta } = trackPaths(station.id);
  if (!force && fs.existsSync(mp3) && fs.statSync(mp3).size > 1024) {
    return mp3;
  }

  const url = new URL("https://api.elevenlabs.io/v1/music");
  url.searchParams.set("output_format", "mp3_44100_128");

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt: station.prompt,
      music_length_ms: station.musicLengthMs,
      model_id: "music_v1",
      force_instrumental: true,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`elevenlabs_music_${resp.status}: ${errText.slice(0, 280)}`);
  }

  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 1024) throw new Error("elevenlabs_music_empty");

  const tmp = `${mp3}.tmp`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, mp3);
  fs.writeFileSync(
    meta,
    JSON.stringify(
      {
        id: station.id,
        title: station.title,
        generatedAt: new Date().toISOString(),
        bytes: buf.length,
        musicLengthMs: station.musicLengthMs,
      },
      null,
      2,
    ),
  );
  return mp3;
}
