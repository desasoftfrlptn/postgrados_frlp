import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export default function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <div
        onClick={onChange}
        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
          checked
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-line bg-paper-surface text-transparent'
        }`}
      >
        <Check size={14} strokeWidth={3} />
      </div>
      <span className="text-sm text-ink-secondary">{label}</span>
    </label>
  );
}