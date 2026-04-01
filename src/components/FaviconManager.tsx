import { useEffect, useRef } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';

type FaviconSet = {
  ico: string;
  png16: string;
  png32: string;
  apple180: string;
};

const TRANSPARENT_PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const faviconCache = new Map<string, FaviconSet>();

function trimCache(maxEntries: number) {
  if (faviconCache.size <= maxEntries) return;
  const keys = [...faviconCache.keys()];
  for (let i = 0; i < keys.length - maxEntries; i += 1) {
    faviconCache.delete(keys[i]);
  }
}

function getOrCreateLink(selector: string, create: () => HTMLLinkElement): HTMLLinkElement {
  const existing = document.querySelector(selector);
  if (existing && existing instanceof HTMLLinkElement) return existing;
  const link = create();
  document.head.appendChild(link);
  return link;
}

function upsertFaviconLinks(set: FaviconSet) {
  const icon16 = getOrCreateLink(
    `link[data-favicon-managed="true"][rel="icon"][sizes="16x16"]`,
    () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.sizes = '16x16';
      link.dataset.faviconManaged = 'true';
      return link;
    }
  );

  const icon32 = getOrCreateLink(
    `link[data-favicon-managed="true"][rel="icon"][sizes="32x32"]`,
    () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.sizes = '32x32';
      link.dataset.faviconManaged = 'true';
      return link;
    }
  );

  const shortcut = getOrCreateLink(
    `link[data-favicon-managed="true"][rel="shortcut icon"]`,
    () => {
      const link = document.createElement('link');
      link.rel = 'shortcut icon';
      link.type = 'image/x-icon';
      link.dataset.faviconManaged = 'true';
      return link;
    }
  );

  const appleTouch = getOrCreateLink(
    `link[data-favicon-managed="true"][rel="apple-touch-icon"][sizes="180x180"]`,
    () => {
      const link = document.createElement('link');
      link.rel = 'apple-touch-icon';
      link.sizes = '180x180';
      link.dataset.faviconManaged = 'true';
      return link;
    }
  );

  icon16.href = set.png16;
  icon32.href = set.png32;
  shortcut.href = set.ico;
  appleTouch.href = set.apple180;
}

function pngDataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createIcoDataUrlFromPngDataUrls(pngs: Array<{ size: number; dataUrl: string }>): string {
  const images = pngs
    .filter((p) => p.size === 16 || p.size === 32 || p.size === 48 || p.size === 64 || p.size === 128 || p.size === 256)
    .slice(0, 8)
    .map((p) => ({ size: p.size, bytes: pngDataUrlToBytes(p.dataUrl) }));

  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + images.length * entrySize;

  const header = new Uint8Array(dirSize);
  header[0] = 0;
  header[1] = 0;
  header[2] = 1;
  header[3] = 0;
  header[4] = images.length & 0xff;
  header[5] = (images.length >> 8) & 0xff;

  let offset = dirSize;
  images.forEach((img, index) => {
    const entryOffset = headerSize + index * entrySize;
    header[entryOffset + 0] = img.size === 256 ? 0 : img.size;
    header[entryOffset + 1] = img.size === 256 ? 0 : img.size;
    header[entryOffset + 2] = 0;
    header[entryOffset + 3] = 0;
    header[entryOffset + 4] = 1;
    header[entryOffset + 5] = 0;
    header[entryOffset + 6] = 32;
    header[entryOffset + 7] = 0;

    const size = img.bytes.length;
    header[entryOffset + 8] = size & 0xff;
    header[entryOffset + 9] = (size >> 8) & 0xff;
    header[entryOffset + 10] = (size >> 16) & 0xff;
    header[entryOffset + 11] = (size >> 24) & 0xff;

    header[entryOffset + 12] = offset & 0xff;
    header[entryOffset + 13] = (offset >> 8) & 0xff;
    header[entryOffset + 14] = (offset >> 16) & 0xff;
    header[entryOffset + 15] = (offset >> 24) & 0xff;

    offset += size;
  });

  const bytes = concatBytes([header, ...images.map((i) => i.bytes)]);
  return `data:image/x-icon;base64,${bytesToBase64(bytes)}`;
}

function renderToPngDataUrl(img: HTMLImageElement, size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

function createPlaceholderSet(): FaviconSet {
  const png16 = TRANSPARENT_PNG_1X1;
  const png32 = TRANSPARENT_PNG_1X1;
  const apple180 = TRANSPARENT_PNG_1X1;
  const ico = createIcoDataUrlFromPngDataUrls([{ size: 16, dataUrl: png16 }]);
  return { ico, png16, png32, apple180 };
}

async function createFaviconSetFromLogoUrl(logoUrl: string): Promise<FaviconSet> {
  const cached = faviconCache.get(logoUrl);
  if (cached) return cached;

  const img = await loadImage(logoUrl);
  const png16 = renderToPngDataUrl(img, 16);
  const png32 = renderToPngDataUrl(img, 32);
  const apple180 = renderToPngDataUrl(img, 180);
  const ico = createIcoDataUrlFromPngDataUrls([
    { size: 16, dataUrl: png16 },
    { size: 32, dataUrl: png32 },
  ]);

  const set: FaviconSet = { ico, png16, png32, apple180 };
  faviconCache.set(logoUrl, set);
  trimCache(20);
  return set;
}

function applyRawLogoFallback(logoUrl: string) {
  const set: FaviconSet = {
    ico: logoUrl,
    png16: logoUrl,
    png32: logoUrl,
    apple180: logoUrl,
  };
  upsertFaviconLinks(set);
}

export const FaviconManager = () => {
  const { store } = useStoreContext();
  const lastApplied = useRef<string | null>(null);

  useEffect(() => {
    const logoUrl = store?.logoUrl?.trim();
    if (logoUrl === lastApplied.current) return;
    lastApplied.current = logoUrl || null;

    let cancelled = false;

    if (!logoUrl) {
      upsertFaviconLinks(createPlaceholderSet());
      return () => {
        cancelled = true;
      };
    }

    applyRawLogoFallback(logoUrl);

    (async () => {
      try {
        const set = await createFaviconSetFromLogoUrl(logoUrl);
        if (cancelled) return;
        upsertFaviconLinks(set);
      } catch {
        if (cancelled) return;
        applyRawLogoFallback(logoUrl);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.logoUrl]);

  return null;
};
