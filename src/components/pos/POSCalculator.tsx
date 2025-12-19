import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Delete, Divide, Equal, Minus, Plus, X, 
  History, RotateCcw, Download, Trash2, 
  Search, Calculator, Percent, ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface POSCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
  status: 'success' | 'error';
}

export function POSCalculator({ open, onOpenChange }: POSCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [newNumber, setNewNumber] = useState(true);
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');
  const historyRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('pos_calculator_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse calculation history');
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('pos_calculator_history', JSON.stringify(history));
  }, [history]);

  const addToHistory = (expr: string, res: string, status: 'success' | 'error' = 'success') => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      expression: expr,
      result: res,
      timestamp: Date.now(),
      status
    };
    setHistory(prev => [newItem, ...prev].slice(0, 100)); // Limit to 100 items
  };

  const handleNumber = useCallback((num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(prev => prev === '0' ? num : prev + num);
    }
  }, [newNumber]);

  const handleOperator = useCallback((op: string) => {
    setExpression(`${display} ${op} `);
    setNewNumber(true);
  }, [display]);

  const handleScientific = (func: 'sqrt' | 'sqr' | 'inv') => {
    const current = parseFloat(display);
    let result = 0;
    let expr = '';

    try {
      switch (func) {
        case 'sqrt':
          if (current < 0) throw new Error('Invalid input');
          result = Math.sqrt(current);
          expr = `√(${current})`;
          break;
        case 'sqr':
          result = Math.pow(current, 2);
          expr = `sqr(${current})`;
          break;
        case 'inv':
          if (current === 0) throw new Error('Divide by zero');
          result = 1 / current;
          expr = `1/(${current})`;
          break;
      }
      
      const resStr = Number(result.toFixed(8)).toString(); // Avoid long decimals
      setDisplay(resStr);
      addToHistory(expr, resStr);
      setNewNumber(true);
    } catch (error) {
      setDisplay('Error');
      setNewNumber(true);
    }
  };

  const handlePercentage = () => {
    const current = parseFloat(display);
    const result = current / 100;
    setDisplay(String(result));
    setNewNumber(true);
  };

  const handleEqual = useCallback(() => {
    if (!expression) return;
    
    try {
      const fullExpression = expression + display;
      // Sanitize and replace visual operators
      const evalExpression = fullExpression
        .replace(/×/g, '*')
        .replace(/÷/g, '/');
      
      // Basic safety check - only allow numbers and math operators
      if (!/^[\d\.\s\+\-\*\/\(\)]+$/.test(evalExpression)) {
        throw new Error('Invalid expression');
      }

      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${evalExpression}`)();
      
      if (!isFinite(result) || isNaN(result)) {
        throw new Error('Math Error');
      }

      const resStr = String(Number(result.toFixed(10))); // Clean up floating point precision issues
      
      setDisplay(resStr);
      addToHistory(fullExpression, resStr, 'success');
      setExpression('');
      setNewNumber(true);
    } catch (error) {
      setDisplay('Error');
      addToHistory(expression + display, 'Error', 'error');
      setExpression('');
      setNewNumber(true);
    }
  }, [expression, display]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setNewNumber(true);
  }, []);

  const handleBackspace = useCallback(() => {
    if (newNumber) return;
    if (display.length > 1) {
      setDisplay(prev => prev.slice(0, -1));
    } else {
      setDisplay('0');
      setNewNumber(true);
    }
  }, [display, newNumber]);

  const handleDot = useCallback(() => {
    if (newNumber) {
      setDisplay('0.');
      setNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
    }
  }, [display, newNumber]);

  // Memory Functions
  const handleMemory = (op: 'MC' | 'MR' | 'M+' | 'M-') => {
    const current = parseFloat(display);
    switch (op) {
      case 'MC':
        setMemory(0);
        toast.info('Memory Cleared');
        break;
      case 'MR':
        setDisplay(String(memory));
        setNewNumber(true);
        toast.info(`Memory Recalled: ${memory}`);
        break;
      case 'M+':
        setMemory(prev => prev + current);
        setNewNumber(true);
        toast.success('Added to Memory');
        break;
      case 'M-':
        setMemory(prev => prev - current);
        setNewNumber(true);
        toast.success('Subtracted from Memory');
        break;
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      const key = e.key;
      
      if (/[0-9]/.test(key)) handleNumber(key);
      if (key === '.') handleDot();
      if (key === '+' || key === '-') handleOperator(key);
      if (key === '*') handleOperator('×');
      if (key === '/') handleOperator('÷');
      if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleEqual();
      }
      if (key === 'Backspace') handleBackspace();
      if (key === 'Escape') handleClear();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleNumber, handleDot, handleOperator, handleEqual, handleBackspace, handleClear]);

  const exportHistory = (formatType: 'csv') => {
    if (history.length === 0) {
      toast.error('No history to export');
      return;
    }

    if (formatType === 'csv') {
      const headers = ['Timestamp,Expression,Result,Status'];
      const rows = history.map(item => 
        `${new Date(item.timestamp).toISOString()},"${item.expression}","${item.result}",${item.status}`
      );
      const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `calculator_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('History exported to CSV');
    }
  };

  const filteredHistory = history.filter(item => 
    item.expression.includes(searchTerm) || 
    item.result.includes(searchTerm)
  );

  const buttonClass = "h-12 text-lg font-medium transition-all hover:scale-105 active:scale-95";
  const iconClass = "h-5 w-5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] w-full p-0 gap-0 overflow-hidden h-[600px] flex flex-col md:flex-row bg-background">
        
        {/* Main Calculator Section */}
        <div className={`flex-1 flex flex-col p-6 ${activeTab === 'history' ? 'hidden md:flex' : 'flex'}`}>
          <DialogHeader className="mb-4 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculator
            </DialogTitle>
            <div className="md:hidden">
               <Button variant="ghost" size="icon" onClick={() => setActiveTab('history')}>
                 <History className="h-5 w-5" />
               </Button>
            </div>
          </DialogHeader>

          {/* Display */}
          <div className="bg-muted p-4 rounded-xl text-right shadow-inner mb-4 flex flex-col justify-end h-32">
            <div className="text-sm text-muted-foreground font-medium h-6">{expression}</div>
            <div className="text-4xl font-bold truncate tracking-tight">{display}</div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-5 gap-2 flex-1">
             {/* Memory Row */}
             <Button variant="ghost" onClick={() => handleMemory('MC')} className="text-xs text-muted-foreground">MC</Button>
             <Button variant="ghost" onClick={() => handleMemory('MR')} className="text-xs text-muted-foreground">MR</Button>
             <Button variant="ghost" onClick={() => handleMemory('M+')} className="text-xs text-muted-foreground">M+</Button>
             <Button variant="ghost" onClick={() => handleMemory('M-')} className="text-xs text-muted-foreground">M-</Button>
             <Button variant="outline" onClick={handleBackspace} className="text-destructive"><Delete className={iconClass} /></Button>

             {/* Scientific & Functions */}
             <Button variant="secondary" onClick={() => handleScientific('sqrt')} className="text-xs">√</Button>
             <Button variant="secondary" onClick={() => handleScientific('sqr')} className="text-xs">x²</Button>
             <Button variant="secondary" onClick={() => handleScientific('inv')} className="text-xs">1/x</Button>
             <Button variant="secondary" onClick={handlePercentage} className="text-xs"><Percent className={iconClass} /></Button>
             <Button variant="outline" onClick={handleClear} className="text-destructive font-bold">C</Button>

             {/* Numbers & Operators */}
             <Button variant="outline" onClick={() => handleNumber('7')} className={buttonClass}>7</Button>
             <Button variant="outline" onClick={() => handleNumber('8')} className={buttonClass}>8</Button>
             <Button variant="outline" onClick={() => handleNumber('9')} className={buttonClass}>9</Button>
             <Button variant="secondary" onClick={() => handleOperator('÷')} className="bg-primary/10 text-primary"><Divide className={iconClass} /></Button>
             <Button variant="secondary" onClick={() => handleOperator('×')} className="bg-primary/10 text-primary"><X className={iconClass} /></Button>

             <Button variant="outline" onClick={() => handleNumber('4')} className={buttonClass}>4</Button>
             <Button variant="outline" onClick={() => handleNumber('5')} className={buttonClass}>5</Button>
             <Button variant="outline" onClick={() => handleNumber('6')} className={buttonClass}>6</Button>
             <Button variant="secondary" onClick={() => handleOperator('-')} className="bg-primary/10 text-primary"><Minus className={iconClass} /></Button>
             <Button variant="secondary" onClick={() => handleOperator('+')} className="bg-primary/10 text-primary row-span-2 h-full"><Plus className={iconClass} /></Button>

             <Button variant="outline" onClick={() => handleNumber('1')} className={buttonClass}>1</Button>
             <Button variant="outline" onClick={() => handleNumber('2')} className={buttonClass}>2</Button>
             <Button variant="outline" onClick={() => handleNumber('3')} className={buttonClass}>3</Button>
             <Button variant="secondary" onClick={() => handleNumber('0')} className={`${buttonClass} col-span-2`}>0</Button>
             
             <Button variant="outline" onClick={handleDot} className={buttonClass}>.</Button>
             <Button onClick={handleEqual} className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg col-span-2`}>
               <Equal className={iconClass} />
             </Button>
          </div>
        </div>

        {/* History Panel (Side on Desktop, Tab on Mobile) */}
        <div className={`w-full md:w-[300px] bg-muted/30 border-l flex-col ${activeTab === 'history' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 border-b flex items-center justify-between bg-background md:bg-transparent">
             <div className="flex items-center gap-2">
               <div className="md:hidden">
                 <Button variant="ghost" size="icon" onClick={() => setActiveTab('calculator')}>
                   <ChevronLeft className="h-4 w-4" />
                 </Button>
               </div>
               <h3 className="font-semibold flex items-center gap-2">
                 <History className="h-4 w-4" />
                 History
               </h3>
             </div>
             <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => exportHistory('csv')} title="Export CSV">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setHistory([])} title="Clear History" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
             </div>
          </div>
          
          <div className="p-3 border-b bg-background md:bg-transparent">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search history..." 
                className="pl-8 h-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 p-4" ref={historyRef}>
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No calculation history
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors group relative"
                    onClick={() => {
                      setDisplay(item.result);
                      setNewNumber(true);
                      if(window.innerWidth < 768) setActiveTab('calculator');
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-muted-foreground">
                        {format(item.timestamp, 'HH:mm:ss')}
                      </span>
                      {item.status === 'error' && (
                        <span className="text-xs text-destructive font-medium">Error</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground break-all">{item.expression}</div>
                    <div className="text-lg font-bold text-primary break-all text-right">= {item.result}</div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
