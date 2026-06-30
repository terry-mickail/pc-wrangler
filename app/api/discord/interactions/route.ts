import { NextResponse } from "next/server";
import { createPublicKey, verify as edVerify } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Discord interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
// Discord response types
const PONG = 1;
const CHANNEL_MESSAGE_WITH_SOURCE = 4;
const EPHEMERAL = 64;

// Discord permission bits
const ADMINISTRATOR = BigInt(1) << BigInt(3);
const MANAGE_GUILD = BigInt(1) << BigInt(5);

// SPKI DER prefix for a raw 32-byte Ed25519 public key.
const DER_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function verifySignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) return false;
  try {
    const der = Buffer.concat([DER_PREFIX, Buffer.from(publicKey, "hex")]);
    const key = createPublicKey({ key: der, format: "der", type: "spki" });
    return edVerify(null, Buffer.from(timestamp + rawBody, "utf8"), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function ephemeral(content: string) {
  return NextResponse.json({ type: CHANNEL_MESSAGE_WITH_SOURCE, data: { content, flags: EPHEMERAL } });
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  // Discord requires that an unverified request is rejected with 401.
  if (!verifySignature(rawBody, signature, timestamp)) {
    return new NextResponse("invalid request signature", { status: 401 });
  }

  let interaction: Record<string, unknown>;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return new NextResponse("bad request", { status: 400 });
  }

  // PING handshake: fires when you set the Interactions Endpoint URL, and as a keepalive.
  if (interaction.type === PING) {
    return NextResponse.json({ type: PONG });
  }

  if (interaction.type === APPLICATION_COMMAND) {
    const data = interaction.data as { name?: string; options?: Array<{ name: string; value: unknown }> } | undefined;
    if (data?.name === "setup") {
      return await handleSetup(interaction);
    }
    return ephemeral("Unknown command.");
  }

  return NextResponse.json({ type: PONG });
}

async function handleSetup(interaction: Record<string, unknown>) {
  const guildId = (interaction.guild_id as string | undefined) ?? null;
  if (!guildId) {
    return ephemeral("Run /setup inside the server channel where you want recaps posted.");
  }

  // Permission gate: only a server admin / manage-guild user can link a channel.
  const member = interaction.member as { permissions?: string } | undefined;
  let perms = BigInt(0);
  try { perms = BigInt(member?.permissions ?? "0"); } catch { perms = BigInt(0); }
  const isAdmin = (perms & ADMINISTRATOR) !== BigInt(0) || (perms & MANAGE_GUILD) !== BigInt(0);
  if (!isAdmin) {
    return ephemeral("You need the Manage Server permission to link recaps to this channel.");
  }

  const data = interaction.data as { options?: Array<{ name: string; value: unknown }> } | undefined;
  const code = String(data?.options?.find((o) => o.name === "code")?.value ?? "").trim();
  if (!code) {
    return ephemeral("Usage: /setup code:<your campaign share code>");
  }

  const channel = interaction.channel as { id?: string } | undefined;
  const channelId = (interaction.channel_id as string | undefined) ?? channel?.id ?? null;
  if (!channelId) {
    return ephemeral("Could not read the channel. Run /setup directly in the target channel.");
  }

  const sb = serviceClient();
  const { data: campaign, error } = await sb
    .from("campaigns")
    .select("id, name")
    .eq("share_code", code)
    .single();
  if (error || !campaign) {
    return ephemeral("No campaign found for that share code. Double-check the code from your app.");
  }

  const { error: upErr } = await sb
    .from("campaigns")
    .update({ discord_guild_id: guildId, discord_channel_id: channelId })
    .eq("id", campaign.id);
  if (upErr) {
    return ephemeral("Could not save the channel link. Try again in a moment.");
  }

  return ephemeral(`Linked. Recaps for "${campaign.name}" will now post in this channel.`);
}
