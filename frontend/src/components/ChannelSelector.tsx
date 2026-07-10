import { BadgeDollarSign, ChevronDown, Music2, Package, Settings2, Shirt, ShoppingBag, Tag } from "lucide-react";
import { useState } from "react";
import type { NormalizedChannel } from "../types";

type ChannelSelectorProps = {
  channels: NormalizedChannel[];
  value: string;
  onChange: (code: string) => void;
};

export function ChannelSelector({ channels, value, onChange }: ChannelSelectorProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedChannel = channels.find((channel) => channel.code === value);

  function selectChannel(code: string) {
    onChange(code);
    setMobileOpen(false);
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-ember dark:border-line dark:bg-slate-950/30 dark:text-slate-100 md:hidden"
        onClick={() => setMobileOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChannelIcon code={selectedChannel?.code ?? ""} />
          <span className="truncate">{selectedChannel?.name ?? "Canais"}</span>
        </span>
        <ChevronDown size={16} />
      </button>

      {mobileOpen ? (
        <div className="absolute left-0 right-0 top-12 z-40 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-line dark:bg-panel">
          <div className="grid gap-2">
            {channels.map((channel) => (
              <ChannelButton
                key={channel.code}
                channel={channel}
                selected={channel.code === value}
                onClick={() => selectChannel(channel.code)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="hidden min-w-0 flex-wrap gap-2 md:flex">
        {channels.map((channel) => (
          <ChannelButton
            key={channel.code}
            channel={channel}
            selected={channel.code === value}
            onClick={() => selectChannel(channel.code)}
          />
        ))}
      </div>
    </div>
  );
}

function ChannelButton({
  channel,
  selected,
  onClick
}: {
  channel: NormalizedChannel;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-9 min-w-0 items-center gap-2 rounded-md border px-3 text-sm font-bold transition md:w-auto",
        selected
          ? "border-ember bg-ember text-white shadow-glow"
          : "border-slate-200 bg-white text-slate-600 hover:border-ember hover:text-ember dark:border-line dark:bg-slate-950/30 dark:text-slate-300"
      ].join(" ")}
    >
      <ChannelIcon code={channel.code} />
      <span className="truncate">{channel.name}</span>
    </button>
  );
}

function ChannelIcon({ code }: { code: string }) {
  const iconClass = "h-4 w-4";
  if (code === "shopee") {
    return <ShoppingBag className={iconClass} />;
  }
  if (code === "temu") {
    return <Tag className={iconClass} />;
  }
  if (code === "tiktok_shop") {
    return <Music2 className={iconClass} />;
  }
  if (code === "shein") {
    return <Shirt className={iconClass} />;
  }
  if (code === "mercado_livre_classico" || code === "mercado_livre_premium") {
    return <BadgeDollarSign className={iconClass} />;
  }
  if (code === "amazon") {
    return <Package className={iconClass} />;
  }
  if (code === "manual") {
    return <Settings2 className={iconClass} />;
  }
  return <ShoppingBag className={iconClass} />;
}
