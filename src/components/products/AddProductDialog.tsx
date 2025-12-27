import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Package } from 'lucide-react';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
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

export function AddProductDialog({ open, onOpenChange, businessId, onSuccess }: AddProductDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [promotionDescription, setPromotionDescription] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const addProductMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = '';
      
      if (imageFile) {
        const filePath = `products/${Date.now()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase.from('products').insert({
        name,
        description: description || null,
        category,
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        promotion_description: promotionDescription || null,
        barcode: barcode || null,
        image_url: imageUrl || null,
        business_id: businessId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['businessProducts'] });
      toast.success('Product added successfully!');
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add product');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setPrice('');
    setDiscountPrice('');
    setPromotionDescription('');
    setBarcode('');
    setImageFile(null);
    setImagePreview('');
  };

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
    // Generate a random 12-digit number
    const random = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    setBarcode(random);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Product
          </DialogTitle>
          <DialogDescription>
            Create a new product in your catalog
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
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

          <div className="space-y-2">
            <Label htmlFor="price">Base Price (RWF) *</Label>
            <Input
              id="price"
              type="number"
              step="1"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-price">Discount Price (Optional)</Label>
              <Input
                id="discount-price"
                type="number"
                step="1"
                min="0"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="Discounted price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotion">Promotion (Optional)</Label>
              <Input
                id="promotion"
                value={promotionDescription}
                onChange={(e) => setPromotionDescription(e.target.value)}
                placeholder="e.g. Buy 1 Get 1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={generateBarcode}>
                Generate
              </Button>
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
            />
          </div>

          <div className="space-y-2">
            <Label>Product Image (Optional)</Label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
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
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="mt-2 h-24 w-24 object-cover rounded-lg border"
              />
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => addProductMutation.mutate()} 
              disabled={!name || !category || !price || addProductMutation.isPending}
              className="flex-1"
            >
              {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}