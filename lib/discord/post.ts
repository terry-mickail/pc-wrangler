const DISCORD_API = "https://discord.com/api/v10";
const MAX_DESC = 4000; // Discord embed description hard limit is 4096; leave headroom.
const BRASS = 0xc8a24b;

function chunkRecap(text: string, size: number): string[] {
  const paras = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    const candidate = cur ? `${cur}\n\n${p}` : p;
    if (candidate.length > size && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = candidate;
    }
    while (cur.length > size) {
      chunks.push(cur.slice(0, size));
      cur = cur.slice(size);
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Posts a recap into a Discord channel as one or more themed embeds.
// Returns true if every message posted, false on any failure or missing config.
export async function postRecapToDiscord(
  channelId: string,
  campaignName: string,
  sessionNumber: number | null,
  recap: string,
): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || !channelId) return false;

  const body = recap.trim();
  if (!body) return false;

  const title = sessionNumber != null
    ? `Previously on ${campaignName} \u2014 Session ${sessionNumber}`
    : `Previously on ${campaignName}`;

  const parts = chunkRecap(body, MAX_DESC);
  if (!parts.length) return false;

  try {
    for (let i = 0; i < parts.length; i++) {
      const embed: Record<string, unknown> = { description: parts[i], color: BRASS };
      if (i === 0) embed.title = title;
      const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}
