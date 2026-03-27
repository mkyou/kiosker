import { useState, useEffect } from "react";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onClose: () => void;
}

const keyLayout = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '\u2190'],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
  [' ', 'Enter', 'Esc']
];

export function VirtualKeyboard({ onKeyPress, onClose }: VirtualKeyboardProps) {
  const [isShiftActive, setIsShiftActive] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === 'shift') {
      setIsShiftActive(!isShiftActive);
      return;
    }

    if (key === '\u2190') {
      onKeyPress('Backspace');
      return;
    }

    if (key === 'Enter') {
      onKeyPress('Enter');
      return;
    }

    if (key === 'Esc') {
      onClose();
      return;
    }

    if (key === ' ') {
      onKeyPress(' ');
      return;
    }

    const char = isShiftActive ? key.toUpperCase() : key.toLowerCase();
    onKeyPress(char);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white z-300 p-4 rounded-t-2xl shadow-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold">Teclado Virtual</div>
        <button
          onClick={onClose}
          className="text-red-400 hover:text-red-300 transition-colors"
        >
          Fechar
        </button>
      </div>

      <div className="grid grid-cols-10 gap-2">
        {keyLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-between">
            {row.map((key, keyIndex) => (
              <button
                key={keyIndex}
                onPointerDown={e => e.preventDefault()}
                onClick={() => handleKeyPress(key)}
                className="bg-gray-700 hover:bg-gray-600 transition-colors rounded px-3 py-2 text-sm"
              >
                {key === 'shift' ? 'Shift' :
                 key === '\u2190' ? '⌫' :
                 key === 'Enter' ? 'Enter' :
                 key === 'Esc' ? 'Esc' :
                 key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
