'use client';

import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NumericKeypadProps {
  onKeyClick: (key: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export function NumericKeypad({ onKeyClick, onDelete, onClear }: NumericKeypadProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'del'],
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((row, rowIndex) => (
          row.map((key, keyIndex) => {
            if (key === 'del') {
              return (
                <Button
                  key={`key-${rowIndex}-${keyIndex}`}
                  variant="outline"
                  size="lg"
                  onClick={onDelete}
                  className="h-12 text-lg hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all text-muted-foreground"
                >
                  <Delete className="h-5 w-5" />
                </Button>
              );
            }
            
            return (
              <Button
                key={`key-${rowIndex}-${keyIndex}`}
                variant="outline"
                size="lg"
                onClick={() => onKeyClick(key)}
                className="h-12 text-xl font-medium active:scale-95 transition-all"
              >
                {key}
              </Button>
            );
          })
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="col-span-3 h-8 text-[9px] font-black uppercase opacity-40 hover:opacity-100 transition-all tracking-widest mt-1"
        >
          Limpiar Campo (C)
        </Button>
      </div>
    </div>
  );
}
