import { useEffect, useState } from "react";
import { centsToDecimalInput, decimalInputToCents, isDecimalMoneyInput } from "../utils/money";

type MoneyInputProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
};

export function MoneyInput({ label, value, onChange, placeholder = "0,00" }: MoneyInputProps) {
  const [draft, setDraft] = useState(centsToDecimalInput(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(centsToDecimalInput(value));
    }
  }, [isFocused, value]);

  function handleChange(rawValue: string) {
    const nextValue = rawValue.replace(",", ".");
    if (!isDecimalMoneyInput(nextValue)) {
      return;
    }

    setDraft(nextValue);
    onChange(decimalInputToCents(nextValue));
  }

  function handleBlur() {
    setIsFocused(false);
    setDraft(centsToDecimalInput(decimalInputToCents(draft)));
  }

  return (
    <label className="block space-y-2">
      <span className="field-label">{label}</span>
      <input
        type="number"
        className="input-base"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={draft}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          if (["e", "E", "+", "-"].includes(event.key)) {
            event.preventDefault();
          }
        }}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
      />
    </label>
  );
}
