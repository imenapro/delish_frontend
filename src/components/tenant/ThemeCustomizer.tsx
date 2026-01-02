import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Pencil, Loader2, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStoreContext } from '@/contexts/StoreContext';

interface ThemeCustomizerProps {
  currentPrimary: string;
  currentSecondary: string;
}

export function ThemeCustomizer({ currentPrimary, currentSecondary }: ThemeCustomizerProps) {
  const { store, refreshStore } = useStoreContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [primary, setPrimary] = useState(currentPrimary);
  const [secondary, setSecondary] = useState(currentSecondary);

  // Reset local state when props change or dialog opens
  useEffect(() => {
    if (open) {
      setPrimary(currentPrimary);
      setSecondary(currentSecondary);
    }
  }, [open, currentPrimary, currentSecondary]);

  const handleSave = async () => {
    if (!store) return;

    // Basic validation
    if (!isValidHex(primary) || !isValidHex(secondary)) {
      toast({
        title: "Invalid Color",
        description: "Please enter valid hex color codes (e.g., #FF0000).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          primary_color: primary,
          secondary_color: secondary
        })
        .eq('id', store.id);

      if (error) throw error;

      toast({
        title: "Theme updated",
        description: "Your store's colors have been updated successfully.",
      });
      
      refreshStore();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update theme colors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit brand colors</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Brand Colors</DialogTitle>
          <DialogDescription>
            Update your store's primary and secondary colors. These changes will be visible to your customers immediately.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
                <Label htmlFor="primary">Primary Color</Label>
                <div className="flex gap-2">
                    <div className="relative h-10 w-12 overflow-hidden rounded-md border shadow-sm">
                        <Input 
                            id="primary" 
                            type="color" 
                            value={primary} 
                            onChange={(e) => setPrimary(e.target.value)}
                            className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer p-0 border-0"
                        />
                    </div>
                    <Input 
                        value={primary} 
                        onChange={(e) => setPrimary(e.target.value)}
                        className="flex-1 font-mono uppercase"
                        placeholder="#000000"
                        maxLength={7}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Used for main buttons, links, and active states.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="secondary">Secondary Color</Label>
                <div className="flex gap-2">
                     <div className="relative h-10 w-12 overflow-hidden rounded-md border shadow-sm">
                        <Input 
                            id="secondary" 
                            type="color" 
                            value={secondary} 
                            onChange={(e) => setSecondary(e.target.value)}
                            className="absolute -top-2 -left-2 h-16 w-16 cursor-pointer p-0 border-0"
                        />
                    </div>
                    <Input 
                        value={secondary} 
                        onChange={(e) => setSecondary(e.target.value)}
                        className="flex-1 font-mono uppercase"
                        placeholder="#000000"
                        maxLength={7}
                    />
                </div>
                <p className="text-xs text-muted-foreground">Used for accents, highlights, and secondary actions.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Live Preview</Label>
            <div className="rounded-xl border bg-background p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: primary }}
                    >
                        <Store className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="h-4 w-24 rounded bg-muted animate-pulse mb-1" />
                        <div className="h-3 w-16 rounded bg-muted/50 animate-pulse" />
                    </div>
                </div>
                
                <div className="space-y-3">
                    <Button 
                        className="w-full shadow-sm"
                        style={{ 
                            backgroundColor: primary, 
                            color: '#ffffff',
                            borderColor: primary
                        }}
                    >
                        Primary Action
                    </Button>
                    
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            className="flex-1"
                            style={{ 
                                color: primary, 
                                borderColor: primary 
                            }}
                        >
                            Secondary
                        </Button>
                        <div 
                            className="flex-1 rounded-md flex items-center justify-center text-sm font-medium border"
                            style={{ 
                                backgroundColor: secondary,
                                color: primary,
                                borderColor: secondary
                            }}
                        >
                            Accent Box
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
