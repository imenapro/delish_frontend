import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScanner({ onScanSuccess }: BarcodeScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Wait for DOM element to be fully mounted
      const timeoutId = setTimeout(() => {
        const element = document.getElementById("barcode-reader");
        if (!element) {
          console.error("Barcode reader element not found");
          return;
        }

        const scanner = new Html5QrcodeScanner(
          "barcode-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
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
            onScanSuccess(decodedText);
            toast.success('Barcode scanned: ' + decodedText);
            scanner.clear();
            setIsOpen(false);
          },
          (error) => {
            console.log(error);
          }
        );

        scannerRef.current = scanner;
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
        size="icon"
      >
        <Camera className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
          </DialogHeader>
          <div id="barcode-reader" className="w-full" />
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
