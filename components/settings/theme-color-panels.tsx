"use client";

import { cn } from "@/lib/utils";
import { ColorPickerSwatchPopover } from "@/components/settings/full-hex-color-picker";
import type { ParsedAccent } from "@/lib/accent-color";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AccentProps = {
  value: ParsedAccent;
  onChange: (next: ParsedAccent) => void;
};

/** Akcent: jednolity kolor lub gradient (2 kolory + kąt). */
export function AccentColorPanel({ value, onChange }: AccentProps) {
  const isGrad = value.kind === "gradient";

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
      <div>
        <Label className="text-sm font-medium">Kolor akcentu</Label>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Przyciski główne, fokus i kalendarz. Kliknij kwadrat z kolorem, aby otworzyć paletę. Dostępny jest też tryb
          gradientu.
        </p>
      </div>

      <div className="bg-background/80 flex rounded-lg border border-border/70 p-0.5 shadow-inner">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 flex-1 rounded-md text-xs font-medium",
            !isGrad && "bg-card text-foreground shadow-sm",
          )}
          onClick={() =>
            onChange(
              value.kind === "solid"
                ? value
                : { kind: "solid", hex: value.from },
            )
          }
        >
          Jednolity
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 flex-1 rounded-md text-xs font-medium",
            isGrad && "bg-card text-foreground shadow-sm",
          )}
          onClick={() =>
            onChange(
              value.kind === "gradient"
                ? value
                : {
                    kind: "gradient",
                    from: value.hex,
                    to: "#fafafa",
                    angle: 135,
                  },
            )
          }
        >
          Gradient
        </Button>
      </div>

      {value.kind === "solid" ? (
        <div className="flex flex-wrap items-end gap-4">
          <ColorPickerSwatchPopover
            size="lg"
            value={value.hex}
            onChange={(hex) => onChange({ kind: "solid", hex })}
            label="Otwórz paletę koloru akcentu"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground font-mono text-xs tracking-tight">{value.hex}</p>
            <p className="text-muted-foreground max-w-xs text-[11px] leading-relaxed">
              Saturacja, odcień, HEX / RGB i kopiowanie — wszystko w oknie po kliknięciu próbki.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div
            className="border-input h-14 w-full max-w-md rounded-xl border-2 shadow-inner ring-1 ring-black/5 dark:ring-white/10"
            style={{
              backgroundImage: `linear-gradient(${value.angle}deg, ${value.from}, ${value.to})`,
            }}
            aria-hidden
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/80 p-4">
              <Label className="text-xs font-medium">Kolor początkowy</Label>
              <div className="flex flex-wrap items-end gap-3">
                <ColorPickerSwatchPopover
                  size="md"
                  value={value.from}
                  onChange={(from) => onChange({ ...value, from })}
                  label="Wybierz kolor początkowy gradientu"
                />
                <span className="text-muted-foreground font-mono text-xs">{value.from}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">Kliknij kwadrat, aby zmienić kolor.</p>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/80 p-4">
              <Label className="text-xs font-medium">Kolor końcowy</Label>
              <div className="flex flex-wrap items-end gap-3">
                <ColorPickerSwatchPopover
                  size="md"
                  value={value.to}
                  onChange={(to) => onChange({ ...value, to })}
                  label="Wybierz kolor końcowy gradientu"
                />
                <span className="text-muted-foreground font-mono text-xs">{value.to}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">Drugi kolor przejścia gradientu.</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="accent-angle" className="text-xs font-medium">
                Kąt gradientu
              </Label>
              <span className="text-muted-foreground tabular-nums text-xs">{value.angle}°</span>
            </div>
            <input
              id="accent-angle"
              type="range"
              min={0}
              max={360}
              step={1}
              value={value.angle}
              onChange={(e) => onChange({ ...value, angle: Number(e.target.value) })}
              className="accent-primary h-2 w-full max-w-md cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}

type FontProps = {
  fontOverride: string | null;
  onChangeOverride: (next: string | null) => void;
};

/** Kolor głównej czcionki — tylko jednolity. */
export function FontColorPanel({ fontOverride, onChangeOverride }: FontProps) {
  const hex = fontOverride ?? "#1c1917";
  const active = fontOverride !== null;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
      <div>
        <Label className="text-sm font-medium">Kolor głównej czcionki</Label>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Tekst treści, nagłówki kart i paska bocznego. Pusty = domyślny z motywu. Po włączeniu kliknij próbkę, aby
          otworzyć paletę.
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        {active ? (
          <>
            <ColorPickerSwatchPopover
              size="lg"
              value={hex}
              onChange={(h) => onChangeOverride(h)}
              label="Otwórz paletę koloru czcionki"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-muted-foreground font-mono text-sm tracking-tight">{hex}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                HEX, RGB i kopiowanie w tym samym panelu co przy kolorze akcentu.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => onChangeOverride(null)}>
                Domyślny z motywu
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div
              className="text-muted-foreground flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50 text-xs font-medium tabular-nums shadow-inner"
              aria-hidden
            >
              —
            </div>
            <p className="text-muted-foreground text-xs">Najpierw włącz własny kolor poniżej.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => onChangeOverride("#1c1917")}>
              Ustaw kolor
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
