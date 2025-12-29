import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Package, Scan, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useStoreContext } from '@/contexts/StoreContext';
import { DEFAULT_SYSTEM_CURRENCY } from '@/utils/currency';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const { store } = useStoreContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
<<<<<<< HEAD
  // Discount and Promotion fields removed as per requirement
=======
>>>>>>> development
  const [barcode, setBarcode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isScanning) {
      const timeoutId = setTimeout(() => {
        const element = document.getElementById("product-barcode-reader");
        if (!element) return;

        const scanner = new Html5QrcodeScanner(
          "product-barcode-reader",
          { 
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [
              0, // QR_CODE
              5, // CODE_128
              3, // CODE_39
              9, // EAN_13
              10, // EAN_8
              14, // UPC_A
              15, // UPC_E
            ]
          },
          false
        );

        scanner.render(
          (decodedText) => {
            setBarcode(decodedText);
            toast.success('Barcode scanned successfully');
            setIsScanning(false);
            scanner.clear();
          },
          (error) => {
            // Ignore scan errors as they happen frequently while scanning
            console.debug(error);
          }
        );

        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isScanning]);

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
<<<<<<< HEAD
=======
        discount_price: null,
        promotion_description: null,
>>>>>>> development
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
    setBarcode('');
    setImageFile(null);
    setImagePreview('');
    setIsScanning(false);
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
    const random = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    setBarcode(random);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
<<<<<<< HEAD
      <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
=======
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Package className="h-5 w-5 sm:h-6 sm:w-6" />
>>>>>>> development
            Add New Product
          </DialogTitle>
          <DialogDescription>
            Create a new product in your catalog
          </DialogDescription>
        </DialogHeader>
<<<<<<< HEAD

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4 pb-4">
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
              <Label htmlFor="price">Base Price ({store?.currency || DEFAULT_SYSTEM_CURRENCY}) *</Label>
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

            <div className="space-y-2">
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsScanning(true)}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <Scan className="h-4 w-4" />
                    Scan
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateBarcode}
                    className="flex-1 sm:flex-none"
                  >
                    Generate
                  </Button>
                </div>
              </div>
              
              {isScanning && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/50 relative">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="absolute right-2 top-2 z-10 bg-background/80 hover:bg-background"
                    onClick={() => setIsScanning(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div id="product-barcode-reader" className="w-full overflow-hidden rounded-lg min-h-[300px]" />
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Point camera at a barcode or upload an image
                  </p>
                </div>
              )}
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
                  className="w-full sm:w-auto"
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
=======
        <div className="flex-1 overflow-y-auto pr-2">
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
            <Label htmlFor="price">Base Price ({store?.currency || DEFAULT_SYSTEM_CURRENCY}) *</Label>
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
              <BarcodeScanner onScanSuccess={(code) => setBarcode(code)} />
              <Button type="button" variant="outline" onClick={generateBarcode}>
                Generate
              </Button>
>>>>>>> development
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="flex gap-2 p-6 border-t bg-background shrink-0">
=======
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
        </div>
        </div>

        <div className="flex gap-2 pt-4 flex-shrink-0 mt-auto border-t">
>>>>>>> development
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
      </DialogContent>
    </Dialog>
  );
}