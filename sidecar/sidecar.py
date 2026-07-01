"""
Six Axes voice sidecar - Stage 3: attribution + upload + audio_tracks.

Driven by the capture_control table (the control plane):
  - status 'requested' + requester in a voice channel  -> join, start recording, set 'active'
  - status 'stopping' (set by /stop)                    -> stop, read sink directly, then:
        * resolve each Discord speaker -> character via characters.discord_user_id
        * upload each per-speaker WAV to the session-audio bucket
        * create ONE capture_jobs row (source 'online', status 'draft')
        * write one audio_tracks row per speaker (status 'pending')
        * link capture_control.capture_job_id and set 'done'

This produces exactly what the in-app recorder produces: a draft job with pending tracks,
which surfaces in the existing /capture GM view. It deliberately does NOT submit to Deepgram;
that stays the GM's consent-gated in-app action (session_consent_ok). Pipeline auto-handoff and
long-session hardening are Stage 4.

Capture uses the proven direct-sink-read pattern (py-cord fix/voice-rec-2): the branch's
stop-callback is unreliable, so we call stop_recording() and read sink.audio_data DIRECTLY
after a short wait.

Env:
  DISCORD_BOT_TOKEN
  SUPABASE_URL                 (same value as NEXT_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY
  POLL_SECONDS                 (optional, default 4)
  STOP_READ_DELAY_SECONDS      (optional, default 3)
  AUDIO_BUCKET                 (optional, default 'session-audio')
"""

import os
import io
import time
import wave
import asyncio
import datetime
import logging
import httpx
import discord

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("discord.voice.receive.reader").setLevel(logging.WARNING)
log = logging.getLogger("sidecar")

TOKEN = os.environ["DISCORD_BOT_TOKEN"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "4"))
STOP_READ_DELAY_SECONDS = int(os.environ.get("STOP_READ_DELAY_SECONDS", "3"))
AUDIO_BUCKET = os.environ.get("AUDIO_BUCKET", "session-audio")

REST = f"{SUPABASE_URL}/rest/v1"
STORAGE = f"{SUPABASE_URL}/storage/v1/object"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
WRITE_HEADERS = {**HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal"}
RETURN_HEADERS = {**HEADERS, "Content-Type": "application/json", "Prefer": "return=representation"}


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _wav_duration_seconds(blob: bytes):
    """Best-effort duration from a WAV blob; None if it cannot be parsed."""
    try:
        with wave.open(io.BytesIO(blob), "rb") as w:
            frames = w.getnframes()
            rate = w.getframerate()
            if rate:
                return round(frames / rate)
    except Exception:
        return None
    return None


async def _after_record(sink, *args):
    # The branch's after-callback is unreliable and can wedge on teardown.
    # We deliberately do nothing here and read the sink directly in do_stop().
    return


class Sidecar(discord.Client):
    def __init__(self, **kw):
        super().__init__(**kw)
        self.voice_locations: dict[tuple[str, str], str] = {}  # (guild_id, user_id) -> channel_id
        self.recordings: dict[str, dict] = {}                  # capture_control id -> recording state
        self.waiting_logged: set = set()
        self._started = False

    async def on_ready(self):
        log.info("Sidecar connected as %s. py-cord %s.", self.user, discord.__version__)
        for guild in self.guilds:
            for ch in guild.voice_channels:
                for member in ch.members:
                    self.voice_locations[(str(guild.id), str(member.id))] = str(ch.id)
        log.info("Seeded %d voice location(s).", len(self.voice_locations))
        if not self._started:
            self._started = True
            asyncio.create_task(self.poll_loop())

    async def on_voice_state_update(self, member, before, after):
        key = (str(member.guild.id), str(member.id))
        if after.channel is not None:
            self.voice_locations[key] = str(after.channel.id)
            log.info("voice: user %s -> channel %s", member.id, after.channel.id)
        else:
            self.voice_locations.pop(key, None)
            log.info("voice: user %s left voice", member.id)

    async def poll_loop(self):
        await self.wait_until_ready()
        log.info("Poller started (every %ss).", POLL_SECONDS)
        ticks = 0
        async with httpx.AsyncClient(timeout=30) as http:
            while not self.is_closed():
                try:
                    r = await http.get(
                        f"{REST}/capture_control",
                        params={"status": "in.(requested,stopping)", "select": "*"},
                        headers=HEADERS,
                    )
                    r.raise_for_status()
                    for row in r.json():
                        try:
                            await self.handle_control_row(http, row)
                        except Exception as e:
                            log.warning("row %s error: %r", row.get("id"), e)
                    ticks += 1
                    if ticks % 15 == 0:
                        log.info("poll alive: tick %d, %d active recording(s), tracking %d voice location(s)",
                                 ticks, len(self.recordings), len(self.voice_locations))
                except Exception as e:
                    log.warning("poll error: %r", e)
                await asyncio.sleep(POLL_SECONDS)

    async def handle_control_row(self, http, row):
        status = row.get("status")
        if status == "requested":
            await self.try_start(http, row)
        elif status == "stopping":
            await self.do_stop(http, row)

    async def try_start(self, http, row):
        rid = row["id"]
        if rid in self.recordings:
            return
        g = str(row.get("guild_id"))
        u = str(row.get("requested_by_discord_id"))
        chan_id = self.voice_locations.get((g, u))
        if not chan_id:
            if rid not in self.waiting_logged:
                self.waiting_logged.add(rid)
                log.info("request %s: user %s not in a voice channel yet; waiting to join.", rid, u)
            return
        channel = self.get_channel(int(chan_id))
        if channel is None:
            log.warning("request %s: channel %s not in cache; skipping this tick.", rid, chan_id)
            return
        try:
            vc = await channel.connect(timeout=30.0, reconnect=False)
        except Exception as e:
            log.warning("request %s: connect failed: %r", rid, e)
            await self.patch_status(http, rid, "error", error=f"connect failed: {e}")
            return
        sink = discord.sinks.WaveSink()
        try:
            vc.start_recording(sink, _after_record)
        except Exception as e:
            log.warning("request %s: start_recording failed: %r", rid, e)
            try:
                await vc.disconnect()
            except Exception:
                pass
            await self.patch_status(http, rid, "error", error=f"start_recording failed: {e}")
            return
        self.recordings[rid] = {
            "vc": vc,
            "sink": sink,
            "guild_id": g,
            "channel_id": chan_id,
            "session_id": row.get("session_id"),
            "campaign_id": row.get("campaign_id"),
        }
        self.waiting_logged.discard(rid)
        await self.patch_status(http, rid, "active")
        log.info("RECORDING started: request %s in channel %s (session %s).",
                 rid, chan_id, row.get("session_id"))

    async def do_stop(self, http, row):
        rid = row["id"]
        rec = self.recordings.pop(rid, None)
        self.waiting_logged.discard(rid)
        if rec is None:
            log.info("stop %s: no active recording in this process; marking done.", rid)
            await self.patch_status(http, rid, "done")
            return

        vc = rec["vc"]
        sink = rec["sink"]
        campaign_id = rec.get("campaign_id")
        session_id = rec.get("session_id")

        try:
            vc.stop_recording()
        except Exception as e:
            log.warning("stop %s: stop_recording raised: %r", rid, e)
        await asyncio.sleep(STOP_READ_DELAY_SECONDS)

        # 1) Read the sink directly and attribute each speaker to a character.
        collected = []  # (character_id, blob, duration, uid)
        unmapped = 0
        try:
            audio = getattr(sink, "audio_data", {}) or {}
            for key, data in audio.items():
                try:
                    data.file.seek(0)
                    blob = data.file.read()
                except Exception as e:
                    log.warning("stop %s: could not read track for %s: %r", rid, key, e)
                    continue
                uid = str(getattr(key, "id", key))
                char_id = await self.resolve_character(http, campaign_id, uid)
                dur = _wav_duration_seconds(blob)
                if not char_id:
                    unmapped += 1
                    log.warning("  unmapped speaker discord_id=%s bytes=%d (no claimed character); skipping.",
                                uid, len(blob))
                    continue
                collected.append((char_id, blob, dur, uid))
                log.info("  track: discord_id=%s character=%s bytes=%d duration=%ss",
                         uid, char_id, len(blob), dur)
        except Exception as e:
            log.warning("stop %s: reading sink failed: %r", rid, e)

        try:
            await vc.disconnect()
        except Exception:
            pass

        if not collected:
            log.info("stop %s: no attributable audio (%d unmapped); marking done without a job.", rid, unmapped)
            await self.patch_status(http, rid, "done", error=("all speakers unmapped" if unmapped else None))
            return

        if not (campaign_id and session_id):
            log.warning("stop %s: missing campaign/session; cannot create job.", rid)
            await self.patch_status(http, rid, "error", error="missing campaign or session")
            return

        # 2) Create ONE draft capture job for this recording (source 'online' per the CHECK constraint).
        job_id = await self.create_job(http, campaign_id, session_id)
        if not job_id:
            await self.patch_status(http, rid, "error", error="could not create capture job")
            return

        # 3) Upload each speaker's WAV and write an audio_tracks row (status 'pending').
        uploaded = 0
        for (char_id, blob, dur, uid) in collected:
            path = f"{campaign_id}/{job_id}/{char_id}-{int(time.time() * 1000)}.wav"
            if not await self.upload_wav(http, path, blob):
                log.warning("stop %s: upload failed for character %s; skipping track.", rid, char_id)
                continue
            if await self.insert_track(http, job_id, campaign_id, char_id, path, dur):
                uploaded += 1
                log.info("  uploaded track: character=%s -> %s", char_id, path)

        # 4) Link the control row to the job and finish.
        await self.patch_status(http, rid, "done", capture_job_id=job_id)
        log.info("STOPPED: request %s -> job %s; %d track(s) uploaded, %d unmapped speaker(s).",
                 rid, job_id, uploaded, unmapped)

    # --- data helpers -------------------------------------------------------

    async def resolve_character(self, http, campaign_id, discord_uid):
        if not campaign_id or not discord_uid:
            return None
        try:
            r = await http.get(
                f"{REST}/characters",
                params={
                    "campaign_id": f"eq.{campaign_id}",
                    "discord_user_id": f"eq.{discord_uid}",
                    "kind": "eq.pc",
                    "active": "eq.true",
                    "select": "id",
                    "limit": "1",
                },
                headers=HEADERS,
            )
            r.raise_for_status()
            rows = r.json()
            return rows[0]["id"] if rows else None
        except Exception as e:
            log.warning("resolve_character(%s) failed: %r", discord_uid, e)
            return None

    async def create_job(self, http, campaign_id, session_id):
        try:
            r = await http.post(
                f"{REST}/capture_jobs",
                headers=RETURN_HEADERS,
                json={
                    "campaign_id": campaign_id,
                    "session_id": session_id,
                    "source": "online",   # CHECK constraint allows only 'online' | 'in_person'
                    "status": "draft",
                },
            )
            r.raise_for_status()
            rows = r.json()
            return rows[0]["id"] if rows else None
        except Exception as e:
            log.warning("create_job failed: %r", e)
            return None

    async def upload_wav(self, http, path, blob):
        try:
            r = await http.post(
                f"{STORAGE}/{AUDIO_BUCKET}/{path}",
                headers={**HEADERS, "Content-Type": "audio/wav", "x-upsert": "true"},
                content=blob,
            )
            r.raise_for_status()
            return True
        except Exception as e:
            log.warning("upload_wav(%s) failed: %r", path, e)
            return False

    async def insert_track(self, http, job_id, campaign_id, character_id, storage_path, duration):
        try:
            body = {
                "job_id": job_id,
                "campaign_id": campaign_id,
                "character_id": character_id,
                "storage_path": storage_path,
                "status": "pending",
            }
            if duration is not None:
                body["duration_seconds"] = duration
            r = await http.post(f"{REST}/audio_tracks", headers=WRITE_HEADERS, json=body)
            r.raise_for_status()
            return True
        except Exception as e:
            log.warning("insert_track failed: %r", e)
            return False

    async def patch_status(self, http, rid, status, error=None, capture_job_id=None):
        body = {"status": status, "updated_at": _now_iso()}
        if error is not None:
            body["error"] = str(error)[:500]
        if capture_job_id is not None:
            body["capture_job_id"] = capture_job_id
        try:
            r = await http.patch(
                f"{REST}/capture_control",
                params={"id": f"eq.{rid}"},
                headers=WRITE_HEADERS,
                json=body,
            )
            r.raise_for_status()
        except Exception as e:
            log.warning("patch %s -> %s failed: %r", rid, status, e)


def main():
    intents = discord.Intents.none()
    intents.guilds = True
    intents.voice_states = True
    Sidecar(intents=intents).run(TOKEN)


if __name__ == "__main__":
    main()
