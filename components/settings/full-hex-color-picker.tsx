"use client";

import * as React from "react";
import { HexColorPicker } from "react-colorful";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function normalizeHex6(raw: string): string {
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return `#${t.slice(1).toLowerCase()}`;
  if (/^[0-9A-Fa-f]{6}$/i.test(t)) return `#${t.toLowerCase()}`;
  return "#000000";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex6(hex).slice(1);
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(Number.isFinite(n) ? n : 0)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

type Format = "hex" | "rgb";

/** Margines + mniejszy pointer — kółko nie wychodzi poza obcinanie popovera / narożniki saturacji. */
const pickerShell = cn(
  "[&_.react-colorful]:relative [&_.react-colorful]:box-border [&_.react-colorful]:flex [&_.react-colorful]:w-full [&_.react-colorful]:max-w-none [&_.react-colorful]:flex-col [&_.react-colorful]:gap-2.5 [&_.react-colorful]:overflow-visible",
  "[&_.react-colorful__saturation]:mt-2 [&_.react-colorful__saturation]:overflow-visible",
  "[&_.react-colorful__hue]:mx-1.5 mb-1.5 overflow-visible",
  "[&_.react-colorful__pointer]:!box-border [&_.react-colorful__pointer]:!h-5 [&_.react-colorful__pointer]:!w-5 [&_.react-colorful__pointer]:!border-2",
);

type PickerBodyProps = {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
};

/** Treść pickera (sat + podgląd + hue + HEX/RGB + kopiuj) — używana w popoverze i opcjonalnie inline. */
export function FullHexColorPicker({ value, onChange, disabled, className }: PickerBodyProps & { className?: string }) {
  const safe = normalizeHex6(value);
  const [fmt, setFmt] = React.useState<Format>("hex");
  const rgb = hexToRgb(safe);

  const setRgbPart = (key: "r" | "g" | "b", num: number) => {
    const next = { ...rgb, [key]: num };
    onChange(rgbToHex(next.r, next.g, next.b));
  };

  const copy = async () => {
    const text = fmt === "hex" ? safe : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        "text-popover-foreground w-[min(100vw-1.5rem,20.5rem)] space-y-3.5 px-4 pb-4 pt-3.5",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <div className="flex gap-3">
        <div className={cn("min-w-0 flex-1 pb-0.5", pickerShell)}>
          <HexColorPicker color={safe} onChange={(c) => onChange(normalizeHex6(c))} />
        </div>
        <div
          className="border-border/60 relative w-[4.25rem] shrink-0 self-stretch overflow-hidden rounded-2xl border bg-clip-padding shadow-inner ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
          style={{ backgroundColor: safe }}
          aria-hidden
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Wartość
          </Label>
          {fmt === "hex" ? (
            <Input
              spellCheck={false}
              className="border-border/70 bg-background/80 h-10 font-mono text-sm tracking-tight shadow-sm"
              value={safe}
              onChange={(e) => onChange(normalizeHex6(e.target.value))}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {(["r", "g", "b"] as const).map((k) => (
                <div key={k} className="space-y-1">
                  <Label className="text-muted-foreground text-[10px] font-medium uppercase">{k}</Label>
                  <Input
                    inputMode="numeric"
                    className="border-border/70 bg-background/80 h-9 font-mono text-xs tabular-nums shadow-sm"
                    value={String(rgb[k])}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      setRgbPart(k, Number.isFinite(n) ? n : 0);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[6.5rem]">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              Format
            </Label>
            <Select value={fmt} onValueChange={(v) => setFmt(v as Format)}>
              <SelectTrigger className="border-border/70 bg-background/80 h-10 font-mono text-xs shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value="hex">HEX</SelectItem>
                <SelectItem value="rgb">RGB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="border-border/60 bg-muted/80 hover:bg-muted h-10 gap-2 font-medium shadow-sm"
            onClick={() => void copy()}
          >
            <Copy className="size-3.5 opacity-80" />
            Kopiuj
          </Button>
        </div>
      </div>
    </div>
  );
}

const swatchSizeClass = (size: "sm" | "md" | "lg") =>
  size === "lg"
    ? "size-16 min-h-16 min-w-16 rounded-2xl"
    : size === "md"
      ? "size-12 min-h-12 min-w-12 rounded-xl"
      : "size-10 min-h-10 min-w-10 rounded-lg";

type SwatchPopoverProps = {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  /** Etykieta dla czytników ekranu */
  label: string;
  className?: string;
};

/**
 * Kwadrat z kolorem — po kliknięciu otwiera popover z pełnym pickerem (jak w odniesieniu UI).
 */
export function ColorPickerSwatchPopover({
  value,
  onChange,
  disabled,
  size = "md",
  label,
  className,
}: SwatchPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const safe = normalizeHex6(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          className={cn(
            "group border-border/80 focus-visible:ring-ring relative shrink-0 overflow-hidden border-2 bg-card shadow-sm transition-[box-shadow,transform] hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
            "ring-1 ring-black/[0.04] dark:ring-white/[0.08]",
            "hover:scale-[1.02] active:scale-[0.98]",
            swatchSizeClass(size),
            className,
          )}
        >
          <span
            className="pointer-events-none absolute inset-[3px] rounded-[inherit] ring-1 ring-inset ring-black/10 dark:ring-white/15"
            style={{ backgroundColor: safe }}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "border-border/80 bg-popover/95 text-popover-foreground w-auto max-w-[calc(100vw-1rem)] overflow-visible rounded-2xl border p-2 shadow-2xl backdrop-blur-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <FullHexColorPicker
          value={value}
          onChange={(hex) => {
            onChange(hex);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
