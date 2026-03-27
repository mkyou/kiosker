import { useState } from "react";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onClose: () => void;
}

type Key = { key: string; label: string; cls?: string } | string;

const ROWS: Key[][] = [
  ['1','2','3','4','5','6','7','8','9','0',
    { key: 'Backspace', label: '⌫', cls: 'min-w-[3.5rem]' }],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  [
    { key: 'Shift', label: 'Shift', cls: 'min-w-[3.5rem]' },
    'z','x','c','v','b','n','m',',','.',
    { key: '?', label: '?' },
  ],
  [
    { key: ' ', label: ' ', cls: 'flex-1 max-w-xs' },
    { key: 'Enter', label: 'Enter', cls: 'min-w-[5rem] bg-dracula-green/10 border-dracula-green/30 text-dracula-green hover:bg-dracula-green/20 focus:bg-dracula-green/20' },
    { key: 'Escape', label: 'Esc', cls: 'min-w-[3.5rem] bg-dracula-red/10 border-dracula-red/30 text-dracula-red hover:bg-dracula-red/20 focus:bg-dracula-red/20' },
  ],
];

function resolveKey(k: Key): { key: string; label: string; cls?: string } {
  return typeof k === 'string' ? { key: k, label: k } : k;
}

export function VirtualKeyboard({ onKeyPress, onClose }: VirtualKeyboardProps) {
  const [shift, setShift] = useState(false);

  const handleKey = (key: string) => {
    if (key === 'Shift') { setShift(v => !v); return; }
    if (key === 'Backspace') { onKeyPress('Backspace'); return; }
    if (key === 'Enter') { onKeyPress('Enter'); return; }
    if (key === 'Escape') { onClose(); return; }
    const char = shift && key.length === 1 ? key.toUpperCase() : key;
    onKeyPress(char);
    if (shift) setShift(false);
  };

  const baseKey = "flex items-center justify-center rounded-xl border text-sm font-mono font-bold select-none cursor-pointer focus:outline-none transition-colors duration-75 px-2 py-3 min-w-[2.5rem]";
  const normalKey = `${baseKey} bg-white/5 border-white/10 text-dracula-fg hover:bg-white/15 focus:bg-dracula-purple/20 focus:border-dracula-purple/40`;
  const shiftActive = `${baseKey} bg-dracula-purple/30 border-dracula-purple/60 text-dracula-purple`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] bg-dracula-bg/97 backdrop-blur-2xl border-t border-white/10 shadow-2xl">
      <div className="max-w-3xl mx-auto px-4 pt-3 pb-5">

        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-dracula-fg/30">
            Teclado Virtual
          </span>
          <button
            onPointerDown={e => e.preventDefault()}
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-dracula-fg/30 hover:text-dracula-red transition-colors focus:outline-none"
          >
            Fechar
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1.5">
              {row.map((k) => {
                const { key, label, cls } = resolveKey(k);
                const isShiftKey = key === 'Shift';
                const keyClass = isShiftKey
                  ? (shift ? shiftActive : normalKey)
                  : (cls?.includes('bg-') ? `${baseKey} ${cls}` : `${normalKey} ${cls ?? ''}`);

                return (
                  <button
                    key={key + ri}
                    tabIndex={0}
                    onPointerDown={e => e.preventDefault()}
                    onClick={() => handleKey(key)}
                    className={keyClass.trim()}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
