import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStoreContext } from '@/contexts/StoreContext';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  discount_price?: number | null;
  promotion_description?: string | null;
  barcode?: string | null;
  image_url?: string | null;
}

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: () => void;
}

const PRODUCT_CATEGORIES = [
  'Food & Beverages',
  'Electronics',
  'Clothing',
  'Health & Beauty',
  'Home & Garden',
  'Sports & Outdoors',
  'Toys & Games',
  'Books & Media',
  'Automotive',
  'Other',
];

export function EditProductDialog({ open, onOpenChange, product, onSuccess }: EditProductDialogProps) {
  const { store } = useStoreContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setCategory(product.category || '');
      setPrice(String(product.price ?? ''));
      setBarcode(product.barcode || '');
      setImagePreview(product.image_url || '');
      setImageFile(null);
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateBarcode = () => {
    const random = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    setBarcode(random);
  };

  const handleSave = async () => {
    if (!product) return;
    if (!name || !category || !price) {
      toast.error('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = product.image_url || null;
      if (imageFile) {
        const filePath = `products/${product.id}-${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('products')
        .update({
          name,
          description: description || null,
          category,
          price: parseFloat(price),
          barcode: barcode || null,
          image_url: imageUrl,
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Product updated successfully!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] md:w-[60vw] max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edit Product
          </DialogTitle>
          <DialogDescription>Update product details</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name *</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter product name"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="price">Base Price ({store?.currency || DEFAULT_SYSTEM_CURRENCY}) *</Label>
              <Input
                id="price"
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-32"
              />
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="barcode">Barcode (Optional)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or enter barcode"
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <BarcodeScanner onScanSuccess={(code) => setBarcode(code)} className="flex-1 sm:flex-none" />
                  <Button type="button" variant="outline" onClick={generateBarcode} className="flex-1 sm:flex-none">
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Product Image (Optional)</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {imageFile ? 'Change Image' : 'Upload Image'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              {imagePreview && (
                <div className="relative w-24 h-24 flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-background flex-shrink-0 flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || !category || !price} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
