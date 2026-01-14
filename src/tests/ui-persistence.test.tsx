import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UIPersistenceProvider, useUIPersistence } from "@/contexts/ui-persistence-context";
import { UIPersistenceSettings } from "@/components/settings/ui-persistence-settings";
import { Button } from "@/components/ui/button";

// Mock component to test hook usage
const TestComponent = () => {
  const { isEnabled, preventCloseOnWindowBlur } = useUIPersistence();
  
  const handleFocusOutside = (e: Event) => {
    preventCloseOnWindowBlur(e);
  };

  return (
    <div>
      <div data-testid="status">{isEnabled ? "enabled" : "disabled"}</div>
      <Button onClick={() => {
        // Simulate an event that would normally close the UI
        const event = new Event("focusoutside");
        handleFocusOutside(event);
      }}>
        Trigger Event
      </Button>
    </div>
  );
};

describe("UIPersistence System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides default enabled state", () => {
    render(
      <UIPersistenceProvider>
        <TestComponent />
      </UIPersistenceProvider>
    );
    expect(screen.getByTestId("status")).toHaveTextContent("enabled");
  });

  it("prevents default event behavior when enabled", () => {
    render(
      <UIPersistenceProvider>
        <TestComponent />
      </UIPersistenceProvider>
    );

    const { result } = renderHookWithProvider(() => useUIPersistence());
    
    // Create a mock original FocusEvent with null relatedTarget (simulating window blur)
    const originalEvent = new FocusEvent("blur", { relatedTarget: null });
    
    // Create the CustomEvent that Radix UI dispatches
    // We need to define detail property to match what the handler expects
    const event = new CustomEvent("focusoutside", {
      detail: { originalEvent },
      cancelable: true // Event must be cancelable for preventDefault to work
    });

    const spy = vi.spyOn(event, "preventDefault");
    
    act(() => {
      result.current.preventCloseOnWindowBlur(event);
    });

    expect(spy).toHaveBeenCalled();
  });

  it("allows toggling persistence setting via UI", () => {
    render(
      <UIPersistenceProvider>
        <UIPersistenceSettings />
        <TestComponent />
      </UIPersistenceProvider>
    );

    // Initial state
    expect(screen.getByTestId("status")).toHaveTextContent("enabled");
    const switchButton = screen.getByRole("switch");
    expect(switchButton).toBeChecked();

    // Toggle off
    fireEvent.click(switchButton);
    expect(screen.getByTestId("status")).toHaveTextContent("disabled");
    expect(switchButton).not.toBeChecked();
  });
});

// Helper to render hook with provider
import { renderHook } from "@testing-library/react";

function renderHookWithProvider<T>(callback: () => T) {
  return renderHook(callback, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <UIPersistenceProvider>{children}</UIPersistenceProvider>
    ),
  });
}
