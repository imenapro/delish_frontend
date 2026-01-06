import React, { createContext, useContext, useState, useCallback } from "react";

interface UIPersistenceContextType {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  preventCloseOnWindowBlur: (event: Event) => void;
}

const UIPersistenceContext = createContext<UIPersistenceContextType | undefined>(undefined);

export function UIPersistenceProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(true);

  const preventCloseOnWindowBlur = useCallback((event: Event) => {
    if (!isEnabled) return;

    // Radix UI fires a CustomEvent with detail.originalEvent being the React/Native FocusEvent
    const customEvent = event as CustomEvent<{ originalEvent: FocusEvent }>;
    const originalEvent = customEvent.detail?.originalEvent;

    // Enhanced detection for window blur/tab switch:
    // 1. If document.hasFocus() is false, the window has lost focus (tab switch, minimize, etc.)
    // 2. If relatedTarget is null, focus has left the document context
    const isWindowBlur = !document.hasFocus() || (originalEvent && !originalEvent.relatedTarget);

    if (isWindowBlur) {
      event.preventDefault();
    }
  }, [isEnabled]);

  return (
    <UIPersistenceContext.Provider value={{ isEnabled, setIsEnabled, preventCloseOnWindowBlur }}>
      {children}
    </UIPersistenceContext.Provider>
  );
}

export function useUIPersistence() {
  const context = useContext(UIPersistenceContext);
  if (context === undefined) {
    throw new Error("useUIPersistence must be used within a UIPersistenceProvider");
  }
  return context;
}
