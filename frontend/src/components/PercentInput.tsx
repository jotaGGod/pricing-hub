import { bpsToPercentInput, percentToBps } from "../utils/money";

type PercentInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hideLabel?: boolean;
};

export function PercentInput({ label, value, onChange, hideLabel = false }: PercentInputProps) {
  return (
    <div className={hideLabel ? "block" : "block space-y-1.5"}>
      {hideLabel ? null : <span className="field-label">{label}</span>}
      <div className="relative">
        <input
          className="input-base pr-10"
          aria-label={label}
          inputMode="decimal"
          value={bpsToPercentInput(value)}
          onChange={(event) => onChange(percentToBps(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          %
        </span>
      </div>
    </div>
  );
}
