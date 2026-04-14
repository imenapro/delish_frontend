import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface POSCartItemRowProps {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
  currency: string;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function POSCartItemRow({
  id,
  name,
  price,
  quantity,
  unit,
  subtotal,
  currency,
  onUpdateQuantity,
  onRemove
}: POSCartItemRowProps) {
  const [inputValue, setInputValue] = useState(quantity.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const allowsDecimals = ['kg', 'grams', 'liter', 'ml'].includes(unit);

  useEffect(() => {
    // Sync local state when prop changes, BUT only if not currently editing (focused)
    // This handles cases where parent updates quantity (e.g. +/- buttons)
    // AND cases where parent rejects an update (e.g. stock limit), resetting our local value
    const currentValue = allowsDecimals ? quantity.toString() : quantity.toString();
    if (document.activeElement !== inputRef.current && inputValue !== currentValue) {
        setInputValue(currentValue);
    }
  }, [quantity, inputValue, allowsDecimals]);

  const commitChange = () => {
    let newQty: number;
    if (allowsDecimals) {
      newQty = parseFloat(inputValue);
      if (isNaN(newQty) || newQty <= 0) {
        newQty = 0.1;
        setInputValue("0.1");
      }
    } else {
      newQty = parseInt(inputValue);
      if (isNaN(newQty) || newQty < 1) {
        newQty = 1;
        setInputValue("1");
      }
    }
    // Notify parent only if changed
    if (newQty !== quantity) {
      onUpdateQuantity(newQty);
    } else {
        // If value was "01" or something that parses to same quantity, normalize display
        setInputValue(newQty.toString());
    }
  };

  const handleBlur = () => {
    commitChange();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string (for clearing input) or valid numbers
    if (allowsDecimals) {
      if (val === '' || /^\d*\.?\d*$/.test(val)) {
        setInputValue(val);
      }
    } else {
      if (val === '' || /^\d*$/.test(val)) {
        setInputValue(val);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    // Stop propagation for Delete/Backspace to prevent global handlers (like item removal)
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.stopPropagation();
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 mb-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{name}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(price, currency)} each
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(allowsDecimals ? Math.max(0.1, quantity - (unit === 'kg' ? 0.1 : 0.1)) : Math.max(1, quantity - 1))}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          ref={inputRef}
          type="text" 
          inputMode="numeric"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-12 h-8 text-center p-0"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(allowsDecimals ? quantity + (unit === 'kg' ? 0.1 : 0.1) : quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="font-semibold text-sm">
          {formatCurrency(subtotal, currency)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
