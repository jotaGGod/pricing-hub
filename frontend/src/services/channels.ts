import { apiFetch } from "./api";
import type { Channel, NormalizedChannel } from "../types";

export async function listChannels(): Promise<NormalizedChannel[]> {
  const channels = await apiFetch<Channel[]>("/channels");
  return channels.map(normalizeChannel);
}

export function normalizeChannel(channel: Channel): NormalizedChannel {
  return {
    id: channel.ID ?? "",
    code: channel.Code ?? channel.code ?? "",
    name: channel.Name ?? channel.name ?? "",
    description: channel.Description ?? channel.description ?? "",
    enabled: channel.Enabled ?? channel.enabled ?? true,
    fee_rules: channel.FeeRules ?? channel.fee_rules ?? channel.fee_rules_json ?? {
      strategy: "fixed",
      default_commission_bps: 0,
      fixed_fee_cents: 0,
      min_commission_cents: 0,
      manual_adjustable: true,
      tiers: [],
      categories: [],
      options: []
    },
    last_verified_at: channel.LastVerifiedAt ?? channel.last_verified_at,
    source_note: channel.SourceNote ?? channel.source_note
  };
}
