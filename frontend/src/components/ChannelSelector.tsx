import type { NormalizedChannel } from "../types";

type ChannelSelectorProps = {
  channels: NormalizedChannel[];
  value: string;
  onChange: (code: string) => void;
};

export function ChannelSelector({ channels, value, onChange }: ChannelSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {channels.map((channel) => {
        const selected = channel.code === value;
        return (
          <button
            type="button"
            key={channel.code}
            onClick={() => onChange(channel.code)}
            className={[
              "h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition",
              selected
                ? "border-mint bg-mint text-slate-950 shadow-glow"
                : "border-slate-200 bg-white text-slate-600 hover:border-ember dark:border-line dark:bg-slate-950/30 dark:text-slate-300"
            ].join(" ")}
          >
            {channel.name}
          </button>
        );
      })}
    </div>
  );
}
