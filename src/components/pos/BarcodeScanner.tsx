import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  className?: string;
}

export function BarcodeScanner({ onScanSuccess, className }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Wait for DOM element to be fully mounted
      const timeoutId = setTimeout(() => {
        const element = document.getElementById("barcode-reader");
        if (!element) {
          console.error("Barcode reader element not found");
          setIsLoading(false);
          return;
        }

        const scanner = new Html5QrcodeScanner(
          "barcode-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0, 1], // 0: CAMERA, 1: FILE
            formatsToSupport: [
              0, // QR_CODE
              5, // EAN_13
              6, // EAN_8
              7, // UPC_A
              8, // UPC_E
              12, // CODE_128
              13, // CODE_39
            ]
          },
          false
        );

        scanner.render(
          (decodedText) => {
            if (decodedText && decodedText.length > 0) {
              onScanSuccess(decodedText);
              toast.success('Barcode scanned: ' + decodedText);
              scanner.clear();
              setIsOpen(false);
            } else {
              toast.error('Invalid barcode scanned');
            }
          },
          (error) => {
            // console.log(error); // Ignore scan errors as they happen every frame
          }
        );

        scannerRef.current = scanner;
        setIsLoading(false);
      }, 100); // Small delay to ensure DOM is ready

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isOpen, onScanSuccess]);

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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <div className="relative min-h-[300px] flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <div id="barcode-reader" className="w-full" />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Point camera at a barcode or upload an image
          </p>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
