'use client'

import * as React from "react";
import { cn } from "@/utils/lib";

type TabsContextType = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [internal, setInternal] = React.useState<string>(defaultValue || "");
  const isControlled = value !== undefined;
  const current = isControlled ? (value as string) : internal;

  const setValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({
    left: 0,
    width: 0,
  });
  // Avoid animating on first paint to prevent jank
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const container = listRef.current;
    if (!container || !ctx?.value) return;

    const activeButton = container.querySelector(
      `[data-value="${ctx.value}"]`
    ) as HTMLElement | null;
    if (!activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    setIndicatorStyle({
      left: buttonRect.left - containerRect.left,
      width: buttonRect.width,
    });
    // Enable animation after first measurement
    if (!ready) setReady(true);
  }, [ctx?.value, ready]);

  return (
    <div
      ref={listRef}
      className={cn(
        "relative inline-flex items-center justify-center rounded-[14px] bg-base-200/50 p-1.5 text-muted backdrop-blur-sm border border-base-300/50",
        className
      )}
      {...props}
    >
      {/* Sliding highlight indicator */}
      <div
        className={cn(
          "absolute bg-white shadow-sm rounded-[10px] pointer-events-none",
          ready
            ? "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            : "transition-none"
        )}
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          height: "calc(100% - 12px)",
          top: "6px",
        }}
      />
      {children}
    </div>
  );
});
TabsList.displayName = "TabsList";

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    const active = ctx?.value === value;
    return (
      <button
        ref={ref}
        data-value={value}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap rounded-[10px] px-5 py-2.5 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 z-10",
          active
            ? "text-base-content"
            : "text-muted hover:text-base-content/80",
          className
        )}
        onClick={(e) => {
          onClick?.(e);
          ctx?.setValue(value);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    if (ctx?.value !== value) return null;
    return (
      <div ref={ref} className={cn("mt-6", className)} {...props}>
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
