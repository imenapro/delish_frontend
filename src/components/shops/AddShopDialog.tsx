import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Upload, FileText } from 'lucide-react';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AddShopDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openHours, setOpenHours] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addShopMutation = useMutation({
    mutationFn: async () => {
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name,
          address,
          phone,
          open_hours: openHours,
        })
        .select()
        .single();

      if (shopError) throw shopError;

      for (const file of documents) {
        const filePath = `${shop.id}/${Date.now()}-${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('shop-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('shop-documents')
          .getPublicUrl(filePath);

        const { error: docError } = await supabase
          .from('shop_documents')
          .insert({
            shop_id: shop.id,
            document_type: 'legal',
            document_url: publicUrl,
            document_name: file.name,
          });

        if (docError) throw docError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      toast({ title: 'Shop added successfully!' });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add shop',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setOpenHours('');
    setDocuments([]);
  };

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Shop
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Shop</DialogTitle>
          <DialogDescription>Create a new bakery location</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Downtown Bakery"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Kigali"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Phone</Label>
            <Input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250788123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">Opening Hours</Label>
            <Input
              id="hours"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
              placeholder="Mon-Fri 8AM-8PM"
            />
          </div>
          <div className="space-y-2">
            <Label>Legal Documents</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {documents.length > 0 ? `${documents.length} file(s) selected` : 'Upload Documents'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              multiple
              className="hidden"
              onChange={handleDocumentsChange}
            />
            {documents.length > 0 && (
              <div className="space-y-1">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{doc.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => addShopMutation.mutate()}
            disabled={!name || !address || addShopMutation.isPending}
            className="w-full"
          >
            {addShopMutation.isPending ? 'Adding...' : 'Add Shop'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}