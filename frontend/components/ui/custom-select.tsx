"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";
import { createPortal } from "react-dom";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children?: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  selectedLabel?: string;
  setSelectedLabel?: (label: string) => void;
}>({
  open: false,
  setOpen: () => {},
  triggerRef: React.createRef(),
});

export function Select({ value, onValueChange, children, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<string>("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <SelectContext.Provider 
      value={{ 
        value, 
        onValueChange, 
        open, 
        setOpen, 
        triggerRef,
        selectedLabel,
        setSelectedLabel
      }}
    >
      <div className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className }: SelectTriggerProps) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext);

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")} />
    </button>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, selectedLabel } = React.useContext(SelectContext);
  
  return (
    <span className="block truncate">
      {selectedLabel || value || placeholder || "Select..."}
    </span>
  );
}

export function SelectContent({ children, className }: SelectContentProps) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open || !triggerRef.current || !mounted) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      setPosition({
        top: rect.bottom + scrollTop + 4,
        left: rect.left + scrollLeft,
        width: rect.width,
      });
    };

    updatePosition();
    
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();
    
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, triggerRef, mounted]);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current && 
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        "fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        open ? "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2" : "",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: "300px",
        overflowY: "auto"
      }}
    >
      <div role="listbox">
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  const isSelected = context.value === value;

  const handleClick = () => {
    context.onValueChange?.(value);
    context.setSelectedLabel?.(children?.toString() || value);
    context.setOpen(false);
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent text-accent-foreground",
        className
      )}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      {children}
    </div>
  );
}