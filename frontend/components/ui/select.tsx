import * as React from "react";
import { cn } from "@/utils/lib";

type SelectContextType = {
  value: string;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  registerItem: (val: string, label: string) => void;
  labels: Record<string, string>;
};

const SelectCtx = React.createContext<SelectContextType | null>(null);

interface SelectProps {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
}

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const registerItem = React.useCallback((val: string, label: string) => {
    setLabels((prev) => (prev[val] ? prev : { ...prev, [val]: label }));
  }, []);
  const setValue = (v: string) => onValueChange(v);
  return (
    <SelectCtx.Provider
      value={{ value, setValue, open, setOpen, registerItem, labels }}
    >
      <div className="dropdown">{children}</div>
    </SelectCtx.Provider>
  );
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);
  return (
    <button
      ref={ref}
      className={cn(
        "flex items-center gap-2 w-full justify-between",
        "px-4 py-2.5 rounded-[10px]",
        "bg-white/50 backdrop-blur-sm",
        "border border-base-300/50",
        "hover:bg-white/70 hover:border-base-300/70",
        "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
        "transition-all duration-200",
        "text-sm font-medium text-base-content",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        ctx?.setOpen(!ctx.open);
      }}
      {...props}
    >
      <span className="flex items-center gap-2 flex-1 text-left truncate">
        {children}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "h-4 w-4 text-muted transition-transform duration-200",
          ctx?.open && "rotate-180"
        )}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectCtx);
  return (
    <ul
      ref={ref}
      className={cn(
        "dropdown-content z-[1] menu mt-2 p-1.5 shadow-lg",
        "bg-white/95 backdrop-blur-xl",
        "border border-base-300/50",
        "rounded-[12px] w-full min-w-[200px]",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
        "duration-200",
        !ctx?.open && "hidden",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
});
SelectContent.displayName = "SelectContent";

interface SelectItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  value: string;
}

const SelectItem = React.forwardRef<HTMLLIElement, SelectItemProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const ctx = React.useContext(SelectCtx);
    // Capture label text
    const label = React.useMemo(() => {
      if (typeof children === "string") return children;
      return (
        React.Children.map(children, (c: any) =>
          typeof c === "string" ? c : null
        )?.join(" ") || String(value)
      );
    }, [children, value]);

    React.useEffect(() => {
      if (label) ctx?.registerItem(value, label);
    }, [ctx, value, label]);

    const selected = ctx?.value === value;
    return (
      <li
        ref={ref}
        className={cn(className)}
        onClick={(e) => {
          onClick?.(e);
          ctx?.setValue(value);
          ctx?.setOpen(false);
        }}
        {...props}
      >
        <a
          className={cn(
            "px-3 py-2 rounded-[8px]",
            "text-sm font-medium",
            "transition-all duration-150",
            "hover:bg-primary/10 hover:text-primary",
            selected && "bg-primary/15 text-primary font-semibold"
          )}
        >
          {children}
        </a>
      </li>
    );
  }
);
SelectItem.displayName = "SelectItem";

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    const ctx = React.useContext(SelectCtx);
    const label = ctx?.labels[ctx.value];
    return (
      <span ref={ref} className={cn("truncate", className)} {...props}>
        {label || placeholder}
      </span>
    );
  }
);
SelectValue.displayName = "SelectValue";

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
