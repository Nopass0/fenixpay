"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CustomCalendar } from "@/components/ui/custom-calendar";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CustomCalendarPopoverProps {
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomCalendarPopover({
  value,
  onChange,
  placeholder = "Выберите дату",
  className,
  disabled = false,
}: CustomCalendarPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleApply = (date: Date) => {
    onChange?.(date);
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-12",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {value ? (
            format(value, "dd MMMM yyyy 'в' HH:mm", { locale: ru })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CustomCalendar
          value={value}
          onChange={onChange}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      </PopoverContent>
    </Popover>
  );
}