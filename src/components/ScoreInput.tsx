import { useState, useEffect } from 'react';

interface Props {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  disabled?: boolean;
}

export function ScoreInput({ value, onChange, disabled }: Props) {
  const [raw, setRaw] = useState(value !== undefined ? String(value) : '');

  useEffect(() => {
    setRaw(value !== undefined ? String(value) : '');
  }, [value]);

  const handleChange = (s: string) => {
    setRaw(s);
    if (s === '') { onChange(undefined); return; }
    const n = parseInt(s, 10);
    if (!isNaN(n) && n >= 0 && n <= 30) onChange(n);
  };

  const handleBlur = () => {
    if (raw === '' || isNaN(parseInt(raw, 10))) {
      setRaw('');
      onChange(undefined);
    }
  };

  return (
    <input
      type="number"
      min={0}
      max={30}
      value={raw}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="–"
      className="w-8 h-7 bg-slate-700 border border-slate-600 text-center text-white rounded text-sm font-bold focus:outline-none focus:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
