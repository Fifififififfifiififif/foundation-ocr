"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { updateAppearanceSettings } from "@/app/actions/foundation-settings";
import { AccentColorPanel, FontColorPanel } from "@/components/settings/theme-color-panels";
import { applyAccentVariables } from "@/lib/apply-appearance";
import { parseAccentStored, serializeAccent, type ParsedAccent } from "@/lib/accent-color";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardPrefs } from "@/lib/dashboard-prefs";

type Props = {
  appearanceTheme: string;
  sidebarStyle: string;
  uiDensity: string;
  dashboardPrefs: DashboardPrefs;
  accentColor: string;
  /** null = domyślny kolor tekstu z motywu */
  fontColor: string | null;
};

export function AppearanceSettingsForm({
  appearanceTheme,
  sidebarStyle,
  uiDensity,
  dashboardPrefs,
  accentColor: initialAccent,
  fontColor: initialFontColor,
}: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState(appearanceTheme);
  const [sidebar, setSidebar] = useState(sidebarStyle);
  const [density, setDensity] = useState(uiDensity);
  const [landing, setLanding] = useState(dashboardPrefs.defaultLanding);
  const [wKpi, setWKpi] = useState(dashboardPrefs.widgets.kpi);
  const [wCal, setWCal] = useState(dashboardPrefs.widgets.calendar);
  const [wCharts, setWCharts] = useState(dashboardPrefs.widgets.charts);
  const [wProj, setWProj] = useState(dashboardPrefs.widgets.projectsBreakdown);
  const [wRecent, setWRecent] = useState(dashboardPrefs.widgets.recent);
  const [accentUi, setAccentUi] = useState<ParsedAccent>(() => parseAccentStored(initialAccent));
  const [fontOverride, setFontOverride] = useState<string | null>(initialFontColor);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    applyAccentVariables(document.documentElement, serializeAccent(accentUi));
  }, [accentUi]);

  useEffect(() => {
    setTheme(appearanceTheme);
    setSidebar(sidebarStyle);
    setDensity(uiDensity);
    setLanding(dashboardPrefs.defaultLanding);
    setWKpi(dashboardPrefs.widgets.kpi);
    setWCal(dashboardPrefs.widgets.calendar);
    setWCharts(dashboardPrefs.widgets.charts);
    setWProj(dashboardPrefs.widgets.projectsBreakdown);
    setWRecent(dashboardPrefs.widgets.recent);
    setAccentUi(parseAccentStored(initialAccent));
    setFontOverride(initialFontColor);
  }, [
    appearanceTheme,
    sidebarStyle,
    uiDensity,
    dashboardPrefs.defaultLanding,
    dashboardPrefs.widgets.kpi,
    dashboardPrefs.widgets.calendar,
    dashboardPrefs.widgets.charts,
    dashboardPrefs.widgets.projectsBreakdown,
    dashboardPrefs.widgets.recent,
    initialAccent,
    initialFontColor,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateAppearanceSettings({
        appearanceTheme: theme,
        sidebarStyle: sidebar,
        uiDensity: density,
        defaultLanding: landing,
        widgetKpi: wKpi,
        widgetCalendar: wCal,
        widgetCharts: wCharts,
        widgetProjectsBreakdown: wProj,
        widgetRecent: wRecent,
        accentColor: serializeAccent(accentUi),
        fontColor: fontOverride === null ? "" : fontOverride,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Zapisano.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full min-w-0 max-w-2xl flex-col gap-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Wygląd</CardTitle>
          <CardDescription>Motyw, pasek boczny oraz gęstość treści w całej aplikacji.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Tryb kolorystyczny</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="border-border bg-card h-10 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Jasny</SelectItem>
                <SelectItem value="dark">Ciemny</SelectItem>
                <SelectItem value="system">Zgodny z systemem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Styl paska bocznego</Label>
            <Select value={sidebar} onValueChange={setSidebar}>
              <SelectTrigger className="border-border bg-card h-10 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Domyślny</SelectItem>
                <SelectItem value="soft">Miękki (zaokrąglony)</SelectItem>
                <SelectItem value="minimal">Minimalny</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gęstość interfejsu</Label>
            <Select value={density} onValueChange={setDensity}>
              <SelectTrigger className="border-border bg-card h-10 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Komfortowa</SelectItem>
                <SelectItem value="compact">Kompaktowa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-5 sm:grid-cols-1">
            <AccentColorPanel value={accentUi} onChange={setAccentUi} />
            <FontColorPanel fontOverride={fontOverride} onChangeOverride={setFontOverride} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Pulpit</CardTitle>
          <CardDescription>Strona startowa po zalogowaniu oraz widoczność modułów na dashboardzie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Domyślna strona po zalogowaniu</Label>
            <Select value={landing} onValueChange={(v) => setLanding(v as "/dashboard" | "/documents")}>
              <SelectTrigger className="border-border bg-card h-10 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/dashboard">Dashboard</SelectItem>
                <SelectItem value="/documents">Lista faktur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 space-y-3 rounded-lg border border-border/60 p-4">
            <p className="text-sm font-medium">Widoczność sekcji na pulpicie</p>
            <div className="flex items-center gap-2">
              <Checkbox id="wkpi" checked={wKpi} onCheckedChange={(c) => setWKpi(c === true)} />
              <Label htmlFor="wkpi" className="font-normal">
                Karty KPI (liczniki)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="wcal" checked={wCal} onCheckedChange={(c) => setWCal(c === true)} />
              <Label htmlFor="wcal" className="font-normal">
                Kalendarz faktur
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="wch" checked={wCharts} onCheckedChange={(c) => setWCharts(c === true)} />
              <Label htmlFor="wch" className="font-normal">
                Wykresy
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="wpr" checked={wProj} onCheckedChange={(c) => setWProj(c === true)} />
              <Label htmlFor="wpr" className="font-normal">
                Tabela wydatków wg projektu
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="wre" checked={wRecent} onCheckedChange={(c) => setWRecent(c === true)} />
              <Label htmlFor="wre" className="font-normal">
                Ostatnia aktywność
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="w-fit gap-2">
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Zapisz ustawienia
      </Button>
    </form>
  );
}
