'use client';

import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxDecimals?: number;
}

export function NumericKeypad({ value, onChange, maxDecimals = 3 }: NumericKeypadProps) {
  const handleNumberClick = (num: string) => {
    if (num === '.' && value.includes('.')) return;
    
    if (value.includes('.')) {
      const decimals = value.split('.')[1];
      if (decimals && decimals.length >= maxDecimals) return;
    }
    
    onChange(value + num);
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

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
                  onClick={handleDelete}
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
                onClick={() => handleNumberClick(key)}
                className="h-12 text-xl font-medium active:scale-95 transition-all"
              >
                {key}
              </Button>
            );
          })
        ))}
      </div>
    </div>
  );
}
