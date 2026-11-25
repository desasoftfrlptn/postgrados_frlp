import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps {
  icon: React.ReactNode;
  type?: 'text' | 'password';
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Input({ icon, type = 'text', placeholder, value, onChange }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-paper-surface px-4 py-3 transition-shadow focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-1 focus-within:ring-offset-paper">
      <span className="text-ink-muted">{icon}</span>
      <input
        type={isPassword && showPassword ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 rounded-none border-0 bg-transparent p-0 text-sm text-ink outline-none focus:ring-0 placeholder:text-ink-muted"
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-ink-muted transition-colors hover:text-ink-secondary"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}