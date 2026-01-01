import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Camera, X, Flashlight, FlashlightOff, ZoomIn, RefreshCw, Smartphone, Image as ImageIcon, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScanSuccess, className }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanStats, setScanStats] = useState<{ startTime: number; attempts: number }>({ startTime: 0, attempts: 0 });
  const [scanMessage, setScanMessage] = useState<string>('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize audio for feedback
  useEffect(() => {
    audioRef.current = new Audio('/sounds/product-click.mp3');
  }, []);

  const playScanSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  };

  const logPerformanceMetrics = (success: boolean, duration: number, error?: any) => {
    console.log('[Scanner Metrics]', {
      success,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      error: error || 'none'
    });
  };

  // Fetch available cameras
  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        // Prefer back camera or environment camera
        const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        const selectedId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(selectedId);
        return selectedId;
      }
      return null;
    } catch (err) {
      console.error("Error getting cameras", err);
      toast.error("Could not access camera devices");
      return null;
    }
  }, []);

  const startScanning = useCallback(async (cameraId: string) => {
    if (!scannerRef.current || !cameraId) return;

    setIsLoading(true);
    setScanMessage('Initializing camera...');
    setScanStats({ startTime: Date.now(), attempts: 0 });

    try {
      await scannerRef.current.start(
        cameraId,
        {
          fps: 15, // Increased FPS for lower latency
          aspectRatio: 1.0,
          qrbox: { width: 250, height: 250 }, // Restore qrbox for focused scanning
          videoConstraints: {
            focusMode: 'continuous',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'environment'
          }
        },
        (decodedText) => {
          // Success callback
          const duration = Date.now() - scanStats.startTime;
          logPerformanceMetrics(true, duration);
          
          playScanSound();
          onScanSuccess(decodedText);
          toast.success(`Scanned: ${decodedText}`);
          setScanMessage('Scan successful!');
          
          // Stop scanning and close - REMOVED for continuous scanning
          // if (scannerRef.current) {
          //   scannerRef.current.stop().then(() => {
          //       scannerRef.current?.clear();
          //       setIsOpen(false);
          //   }).catch(console.error);
          // }

          // Pause briefly to prevent duplicate scans
          if (scannerRef.current) {
             scannerRef.current.pause(true);
             setTimeout(() => {
                 if (scannerRef.current && isOpen) {
                     scannerRef.current.resume();
                     setScanMessage('Ready to scan');
                 }
             }, 1500); // 1.5s delay
          }
        },
        (errorMessage) => {
          // Error callback - ignore frame errors but track stats if needed
          // We don't want to log every frame error as it floods the console
        }
      );

      // Check capabilities after starting
      const track = scannerRef.current.getRunningTrackCameraCapabilities();
      const capabilities = scannerRef.current.getRunningTrackCapabilities();
      
      setHasTorch(!!capabilities.torch);
      setHasZoom(!!capabilities.zoom);
      setScanMessage('Ready to scan');

    } catch (err) {
      console.error("Error starting scanner", err);
      logPerformanceMetrics(false, Date.now() - scanStats.startTime, err);
      toast.error("Failed to start camera");
      setScanMessage('Camera initialization failed');
    } finally {
      setIsLoading(false);
    }
  }, [onScanSuccess, scanStats.startTime]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error("Only JPEG and PNG images are supported");
      return;
    }

    setIsLoading(true);
    setScanMessage('Processing image...');
    const startTime = Date.now();

    try {
      // If scanner is not initialized, we need to initialize it without starting camera
      if (!scannerRef.current) {
         // This might happen if dialog just opened, but useEffect handles init
         // We'll wait a tiny bit if needed, or rely on existing instance
      }

      if (scannerRef.current) {
         // If scanning is running, stop it first to process file
         if (scannerRef.current.isScanning) {
             await scannerRef.current.stop();
         }
         
         const decodedText = await scannerRef.current.scanFileV2(file, true);
         if (decodedText) {
             const duration = Date.now() - startTime;
             logPerformanceMetrics(true, duration);
             playScanSound();
             onScanSuccess(decodedText as string);
             toast.success(`Scanned from image: ${decodedText}`);
             setIsOpen(false);
         }
      }
    } catch (err) {
      console.error("Error scanning file", err);
      logPerformanceMetrics(false, Date.now() - startTime, err);
      toast.error("No barcode found in image");
      setScanMessage('No barcode detected');
      
      // Restart camera scanning if it was running before? 
      // User might want to try another file or go back to camera.
      // For now, let's restart camera
      if (selectedCameraId) {
          startScanning(selectedCameraId);
      }
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isOpen) {
      // Delay initialization to ensure Dialog content is mounted
      timeoutId = setTimeout(() => {
        const elementId = "html5-qrcode-reader";
        const element = document.getElementById(elementId);
        
        if (!element) {
          console.error(`Element ${elementId} not found`);
          return;
        }

        // Initialize scanner instance
        const scanner = new Html5Qrcode(elementId, { 
          verbose: false,
          formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.PDF_417,
              Html5QrcodeSupportedFormats.AZTEC,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.RSS_14,
              Html5QrcodeSupportedFormats.RSS_EXPANDED
          ]
        });
        scannerRef.current = scanner;

        getCameras().then((cameraId) => {
          if (cameraId) {
              startScanning(cameraId);
          }
        });
      }, 100); // 100ms delay for DOM mounting
    }

    return () => {
      clearTimeout(timeoutId);
      stopScanning();
    };
  }, [isOpen, getCameras]); // Don't include selectedCameraId here to prevent restart loop, handled by explicit change

  // Restart when camera changes
  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    await stopScanning();
    await startScanning(newCameraId);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !isTorchOn }]
      });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      console.error("Error toggling torch", err);
      toast.error("Failed to toggle flashlight");
    }
  };

  const handleZoomChange = async (value: number[]) => {
    if (!scannerRef.current || !hasZoom) return;
    try {
      const zoom = value[0];
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ zoom: zoom }]
      });
      setZoomLevel(zoom);
    } catch (err) {
      console.error("Error zooming", err);
    }
  };

  const handleClose = async () => {
      await stopScanning();
      setIsOpen(false);
  };

  const handleDone = async () => {
    handleClose();
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={className}
        type="button"
      >
        <Camera className="mr-2 h-4 w-4" />
        Scan
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md bg-black text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
                <span>Scan Product</span>
                {cameras.length > 0 && (
                     <Select value={selectedCameraId} onValueChange={handleCameraChange}>
                     <SelectTrigger className="w-[180px] h-8 text-xs bg-zinc-900 border-zinc-700">
                       <SelectValue placeholder="Select Camera" />
                     </SelectTrigger>
                     <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                       {cameras.map(cam => (
                         <SelectItem key={cam.id} value={cam.id}>{cam.label}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                )}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
                Center the barcode or QR code in the frame.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative flex flex-col items-center justify-center bg-zinc-900 rounded-lg overflow-hidden min-h-[400px]">
            <div id="html5-qrcode-reader" className="w-full h-full" style={{ minHeight: '300px' }}></div>
            
            {/* Done Button for Continuous Scanning */}
            <div className="absolute top-4 right-4 z-20">
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDone}
                    className="h-8 px-3 text-xs"
                >
                    Done
                </Button>
            </div>
            
            <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
            />

            {/* Status Message */}
            {scanMessage && (
                <div className="absolute top-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                    <div className="bg-black/60 px-4 py-2 rounded-full text-white text-sm backdrop-blur-md border border-white/10 shadow-lg">
                        {scanMessage}
                    </div>
                </div>
            )}
            
            {/* Visual Guide Overlay */}
            {!isLoading && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[250px] h-[250px] border-2 border-white/20 rounded-lg relative">
                   <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1 rounded-tl-lg"></div>
                   <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1 rounded-tr-lg"></div>
                   <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1 rounded-bl-lg"></div>
                   <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1 rounded-br-lg"></div>
                   
                   {/* Scanning line animation */}
                   <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/50 animate-[scan_2s_ease-in-out_infinite]"></div>
                   
                   <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-zinc-400">
                      Hold steady • Good lighting
                   </div>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-zinc-400">{scanMessage || 'Processing...'}</span>
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            {!isLoading && (
                <div className="absolute bottom-4 left-0 right-0 px-6 flex flex-col gap-4 z-10">
                    {/* Zoom Control */}
                    {hasZoom && (
                        <div className="flex items-center gap-2 bg-black/50 p-2 rounded-full backdrop-blur-sm">
                            <ZoomIn className="h-4 w-4 text-zinc-300" />
                            <Slider 
                                value={[zoomLevel]} 
                                min={1} 
                                max={5} 
                                step={0.1} 
                                onValueChange={handleZoomChange}
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                        {hasTorch && (
                            <Button 
                                size="icon" 
                                variant={isTorchOn ? "default" : "secondary"}
                                className="rounded-full h-12 w-12"
                                onClick={toggleTorch}
                            >
                                {isTorchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
                            </Button>
                        )}
                        
                        <Button 
                            size="icon" 
                            variant="secondary"
                            className="rounded-full h-12 w-12"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload Barcode Image"
                        >
                            <ImageIcon className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
