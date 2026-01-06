import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UIPersistenceProvider } from "@/contexts/ui-persistence-context";
import { Button } from "@/components/ui/button";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";

// Mock DialogPrimitive to intercept props
vi.mock("@radix-ui/react-dialog", async () => {
  const actual = await vi.importActual("@radix-ui/react-dialog");
  return {
    ...actual,
    Content: React.forwardRef(({ onFocusOutside, ...props }: any, ref: any) => {
      return (
        <div 
          ref={ref} 
          role="dialog" 
          data-testid="radix-dialog-content"
        >
          <div 
            data-testid="trigger-focus-outside"
            onClick={(e) => {
               // Access the originalEvent attached to the native event
               const originalEvent = (e.nativeEvent as any).originalEvent;
               
               // Create a mock event object that resembles CustomEvent
               const event = {
                 type: "focusoutside",
                 detail: { originalEvent },
                 preventDefault: vi.fn(),
                 defaultPrevented: false
               };
               
               // Store it globally so test can inspect it
               (window as any).__lastFocusOutsideEvent = event;
               
               onFocusOutside?.(event);
            }} 
          />
          {props.children}
        </div>
      );
    }),
  };
});

// Mock SelectPrimitive
vi.mock("@radix-ui/react-select", async () => {
  const actual = await vi.importActual("@radix-ui/react-select");
  return {
    ...actual,
    Content: React.forwardRef(({ onFocusOutside, ...props }: any, ref: any) => {
      return (
        <div ref={ref} data-testid="radix-select-content">
          <div 
            data-testid="select-trigger-focus-outside"
            onClick={(e) => {
               const originalEvent = (e.nativeEvent as any).originalEvent;
               const event = {
                 type: "focusoutside",
                 detail: { originalEvent },
                 preventDefault: vi.fn(),
                 defaultPrevented: false
               };
               (window as any).__lastFocusOutsideEvent = event;
               onFocusOutside?.(event);
            }} 
          />
          {props.children}
        </div>
      );
    }),
    Portal: ({ children }: any) => <div>{children}</div>,
    ScrollUpButton: () => <div data-testid="scroll-up" />,
    ScrollDownButton: () => <div data-testid="scroll-down" />,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: () => null,
  };
});

// Mock ResizeObserver for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PointerCapture for Radix UI
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn();

describe("UI Persistence Integration", () => {
  const TestComponent = () => (
    <UIPersistenceProvider>
      <Dialog defaultOpen={true}>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          <div>Dialog Content</div>
          <button>Action</button>
        </DialogContent>
      </Dialog>
    </UIPersistenceProvider>
  );

  it("should prevent closing dialog when window blurs (tab switch)", async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    render(<TestComponent />);

    const trigger = screen.getByTestId("trigger-focus-outside");
    const originalBlurEvent = new FocusEvent("blur", { relatedTarget: null });
    
    // Attach originalEvent to the click event so our mock can read it
    const clickEvent = new MouseEvent("click", { bubbles: true });
    (clickEvent as any).originalEvent = originalBlurEvent;
    
    fireEvent(trigger, clickEvent);

    const eventSpy = (window as any).__lastFocusOutsideEvent;
    expect(eventSpy.preventDefault).toHaveBeenCalled();
  });

  it("should allow closing dialog when clicking outside (focus moves to body)", async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    render(<TestComponent />);

    const trigger = screen.getByTestId("trigger-focus-outside");
    const originalBlurEvent = new FocusEvent("blur", { relatedTarget: document.body });
    
    const clickEvent = new MouseEvent("click", { bubbles: true });
    (clickEvent as any).originalEvent = originalBlurEvent;
    
    fireEvent(trigger, clickEvent);

    const eventSpy = (window as any).__lastFocusOutsideEvent;
    expect(eventSpy.preventDefault).not.toHaveBeenCalled();
  });

  it("should prevent closing Select when window blurs", async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    render(
      <UIPersistenceProvider>
        <Select defaultOpen={true}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="1">Item 1</SelectItem>
            </SelectContent>
        </Select>
      </UIPersistenceProvider>
    );

    const trigger = screen.getByTestId("select-trigger-focus-outside");
    const originalBlurEvent = new FocusEvent("blur", { relatedTarget: null });
    
    const clickEvent = new MouseEvent("click", { bubbles: true });
    (clickEvent as any).originalEvent = originalBlurEvent;
    
    fireEvent(trigger, clickEvent);

    const eventSpy = (window as any).__lastFocusOutsideEvent;
    expect(eventSpy.preventDefault).toHaveBeenCalled();
  });
});
