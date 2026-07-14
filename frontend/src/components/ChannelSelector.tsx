import { BadgeDollarSign, ChevronDown, Music2, Package, Settings2, Shirt, ShoppingBag, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const mobileMenu = mobileOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[80] bg-slate-950/65 px-3 pb-3 pt-16 backdrop-blur-md md:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMobileOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar canal"
            className="mx-auto flex max-h-[calc(100dvh-5rem)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-2xl dark:border-line dark:bg-panel"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-line">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">Canais</span>
              <button
                type="button"
                aria-label="Fechar canais"
                className="grid h-11 w-11 place-items-center rounded-[10px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-3">
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
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-ember/60 dark:border-line dark:bg-white/[0.035] dark:text-slate-100 md:hidden"
        onClick={() => setMobileOpen((current) => !current)}
        aria-expanded={mobileOpen}
        aria-haspopup="dialog"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChannelIcon code={selectedChannel?.code ?? ""} />
          <span className="truncate">{selectedChannel ? `Canais: ${selectedChannel.name}` : "Canais"}</span>
        </span>
        <ChevronDown size={16} />
      </button>

      {mobileMenu}

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
        "flex h-11 min-w-0 items-center gap-2 rounded-[10px] border px-3 text-sm font-semibold transition md:h-9 md:w-auto",
        selected
          ? "border-ember bg-ember text-white shadow-glow"
          : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-ember/60 hover:text-ember dark:border-line dark:bg-white/[0.035] dark:text-slate-300"
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
