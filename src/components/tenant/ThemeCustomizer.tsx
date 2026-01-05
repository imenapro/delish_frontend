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
import { Pencil, Loader2, Store, Image as ImageIcon, Upload, Palette, LayoutTemplate, Monitor } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStoreContext } from '@/contexts/StoreContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface ThemeCustomizerProps {
  currentPrimary: string;
  currentSecondary: string;
}

export function ThemeCustomizer({ currentPrimary, currentSecondary }: ThemeCustomizerProps) {
  const { store, refreshStore } = useStoreContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Colors
  const [primary, setPrimary] = useState(currentPrimary);
  const [secondary, setSecondary] = useState(currentSecondary);

  // Login Page Settings
  const [showLoginBackground, setShowLoginBackground] = useState(true);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [slogan, setSlogan] = useState('');

  // Initialize state from store
  useEffect(() => {
    if (open && store) {
      setPrimary(store.primaryColor);
      setSecondary(store.secondaryColor);
      setShowLoginBackground(store.showLoginBackground ?? true);
      setBgPreviewUrl(store.bgImageUrl || null);
      setLogoPreviewUrl(store.logoUrl || null);
      setSlogan(store.slogan || '');
      setBgImageFile(null);
      setLogoFile(null);
    }
  }, [open, store]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'bg' | 'logo') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic validation
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Image must be less than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return;
      }

      if (type === 'bg') {
        setBgImageFile(file);
        setBgPreviewUrl(URL.createObjectURL(file));
      } else {
        setLogoFile(file);
        setLogoPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${store?.id}/${path}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('business_assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('business_assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!store) return;

    if (!isValidHex(primary) || !isValidHex(secondary)) {
      toast({
        title: "Invalid Color",
        description: "Please enter valid hex color codes.",
        variant: "destructive",
      });
      return;
    }

    if (slogan.length > 100) {
      toast({
        title: "Slogan too long",
        description: "Slogan must be 100 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let bgUrl = store.bgImageUrl;
      let logoUrl = store.logoUrl;

      // Upload images if changed
      if (bgImageFile) {
        bgUrl = await uploadImage(bgImageFile, 'backgrounds');
      }

      if (logoFile) {
        logoUrl = await uploadImage(logoFile, 'logos');
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          primary_color: primary,
          secondary_color: secondary,
          show_login_background: showLoginBackground,
          bg_image_url: bgUrl,
          logo_url: logoUrl,
          slogan: slogan
        })
        .eq('id', store.id);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: "Your branding settings have been saved successfully.",
      });
      
      refreshStore();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
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
          <span className="sr-only">Edit branding</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Branding & Login Customization</DialogTitle>
          <DialogDescription>
            Customize your store's appearance and login experience.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <Tabs defaultValue="colors" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LayoutTemplate className="h-4 w-4" />
                  Login Page
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colors" className="space-y-4 pt-4">
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
                      maxLength={7}
                    />
                  </div>
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
                      maxLength={7}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="login" className="space-y-4 pt-4">
                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Background Image</Label>
                    <p className="text-sm text-muted-foreground">
                      Show background image on login page
                    </p>
                  </div>
                  <Switch
                    checked={showLoginBackground}
                    onCheckedChange={setShowLoginBackground}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Store Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreviewUrl && (
                      <div className="h-16 w-16 relative rounded-lg border overflow-hidden bg-muted/50">
                        <img 
                          src={logoPreviewUrl} 
                          alt="Logo preview" 
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <Label htmlFor="logo" className="sr-only">Upload Logo</Label>
                      <Input id="logo" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended: Square PNG, min 200x200px</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slogan">Business Slogan</Label>
                  <Input 
                    id="slogan" 
                    placeholder="e.g. Baking memories since 2024"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed below your store name on the login page.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <div className="flex flex-col gap-4">
                    {bgPreviewUrl && showLoginBackground && (
                      <div className="h-32 w-full relative rounded-lg border overflow-hidden bg-muted/50">
                        <img 
                          src={bgPreviewUrl} 
                          alt="Background preview" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <Input 
                      id="bg-image" 
                      type="file" 
                      accept="image/*" 
                      disabled={!showLoginBackground}
                      onChange={(e) => handleFileChange(e, 'bg')} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended: 1920x1080px JPG/PNG</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Live Preview
            </Label>
            
            {/* Preview Container */}
            <div className="rounded-xl border bg-background shadow-sm overflow-hidden h-[400px] flex flex-col">
              {/* Dashboard Preview */}
              <div className="p-4 border-b bg-muted/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                </div>
              </div>
              
              <div className="flex-1 relative">
                 {/* Login Page Simulation */}
                 <div className="absolute inset-0 flex">
                   {/* Left Side (Branding) */}
                   <div 
                     className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden transition-all duration-300"
                     style={{
                        background: showLoginBackground && bgPreviewUrl 
                          ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bgPreviewUrl}) center/cover`
                          : `linear-gradient(135deg, ${primary}dd, ${secondary}dd)`
                     }}
                   >
                     <div className="text-center text-white z-10 p-4">
                      {logoPreviewUrl && (
                        <img src={logoPreviewUrl} alt="Logo" className="h-12 w-12 mx-auto mb-2 rounded-full object-cover" />
                      )}
                      <div className="h-4 w-24 bg-white/20 rounded mx-auto mb-2" />
                      {slogan && (
                        <p className="text-xs text-white/80 max-w-[150px] mx-auto truncate">
                          {slogan}
                        </p>
                      )}
                      {!slogan && <div className="h-3 w-16 bg-white/20 rounded mx-auto" />}
                    </div>
                   </div>
                   
                   {/* Right Side (Form) */}
                   <div className="flex-1 bg-background p-6 flex flex-col justify-center">
                     <div className="space-y-4 max-w-[200px] mx-auto w-full">
                       <div className="h-6 w-32 bg-muted rounded" />
                       <div className="space-y-2">
                         <div className="h-8 w-full border rounded bg-muted/10" />
                         <div className="h-8 w-full border rounded bg-muted/10" />
                       </div>
                       <Button 
                         className="w-full h-8"
                         style={{ backgroundColor: primary, color: '#fff' }}
                       >
                         Sign In
                       </Button>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Preview of the login page experience
            </p>
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
