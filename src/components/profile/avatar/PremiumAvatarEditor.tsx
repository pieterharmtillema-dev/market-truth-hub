import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Redo2, Save, Shuffle, Undo2 } from "lucide-react";
import { PremiumAvatarRenderer } from "./PremiumAvatarRenderer";
import {
  PremiumAvatarConfig,
  DEFAULT_PREMIUM_CONFIG,
  SKIN_TONES,
  IRIS_COLORS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  BACKGROUND_COLORS,
  stringifyPremiumConfig,
} from "./types";

interface PremiumAvatarEditorProps {
  initialConfig?: PremiumAvatarConfig;
  onConfigChange: (config: PremiumAvatarConfig) => void;
  onSave?: (configString: string) => void;
}

type TabId = "appearance" | "style" | "extras";

/**
 * Single-file full rewrite:
 * - Keeps all features from your original file
 * - Upgrades layout (header, panel structure, spacing)
 * - Makes history/undo/redo more robust (avoids stale closures)
 * - Keeps tabs/components in the same file for easy drop-in
 */
export function PremiumAvatarEditor({ initialConfig, onConfigChange, onSave }: PremiumAvatarEditorProps) {
  const seed = initialConfig ?? DEFAULT_PREMIUM_CONFIG;

  const [config, setConfig] = useState<PremiumAvatarConfig>(seed);
  const [activeTab, setActiveTab] = useState<TabId>("appearance");

  // History: keep in state, but update with functional patterns to avoid stale references
  const [history, setHistory] = useState<PremiumAvatarConfig[]>([seed]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Avoid re-trigger loops on undo/redo
  const isUndoRedo = useRef(false);

  // If parent provides a new initialConfig later, reset editor to that config.
  // (Your original didn’t handle changes after mount.)
  useEffect(() => {
    const nextSeed = initialConfig ?? DEFAULT_PREMIUM_CONFIG;
    setConfig(nextSeed);
    setHistory([nextSeed]);
    setHistoryIndex(0);
    // still notify parent because "the editor has a new truth"
    onConfigChange(nextSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConfig]);

  // Push changes up, except when we explicitly undo/redo (we still notify in those handlers).
  useEffect(() => {
    if (!isUndoRedo.current) onConfigChange(config);
    isUndoRedo.current = false;
  }, [config, onConfigChange]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const updateConfig = useCallback(
    <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };

        setHistory((h) => {
          const sliced = h.slice(0, historyIndex + 1);
          return [...sliced, next];
        });
        setHistoryIndex((i) => i + 1);

        return next;
      });
    },
    [historyIndex],
  );

  const applyConfig = useCallback(
    (next: PremiumAvatarConfig) => {
      setConfig(next);
      setHistory((h) => {
        const sliced = h.slice(0, historyIndex + 1);
        return [...sliced, next];
      });
      setHistoryIndex((i) => i + 1);
    },
    [historyIndex],
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedo.current = true;

    setHistoryIndex((i) => {
      const nextIndex = i - 1;
      setConfig(history[nextIndex]);
      onConfigChange(history[nextIndex]);
      return nextIndex;
    });
  }, [canUndo, history, onConfigChange]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedo.current = true;

    setHistoryIndex((i) => {
      const nextIndex = i + 1;
      setConfig(history[nextIndex]);
      onConfigChange(history[nextIndex]);
      return nextIndex;
    });
  }, [canRedo, history, onConfigChange]);

  const randomize = useCallback(() => {
    const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const next: PremiumAvatarConfig = {
      faceShape: randomChoice(["round", "oval", "angular", "square"]),
      skinTone: randomChoice(SKIN_TONES).color,
      skinUndertone: randomChoice(["warm", "neutral", "cool"]),
      freckles: Math.random() > 0.7,
      beautyMark: randomChoice(["none", "none", "none", "left", "right"]),
      eyeShape: randomChoice(["focused", "relaxed", "sharp", "friendly"]),
      irisColor: randomChoice(IRIS_COLORS).color,
      eyebrowShape: randomChoice(["natural", "arched", "straight", "thick"]),
      eyebrowThickness: 0.8 + Math.random() * 0.4,
      hairStyle: randomChoice(["short", "fade", "undercut", "waves", "bun", "curls", "buzz", "slick"]),
      hairColor: randomChoice(HAIR_COLORS.slice(0, 10)).color,
      hairHighlights: Math.random() > 0.7,
      facialHair: randomChoice(["none", "none", "stubble", "beard", "goatee", "mustache"]),
      facialHairDensity: 0.5 + Math.random() * 0.5,
      outfit: randomChoice(["hoodie", "jacket", "tee", "blazer", "sweater", "polo"]),
      outfitColor: randomChoice(OUTFIT_COLORS).color,
      brandAccent: Math.random() > 0.5,
      glasses: randomChoice(["none", "none", "none", "clear", "dark", "metal"]),
      headphones: Math.random() > 0.85,
      earring: randomChoice(["none", "none", "none", "left", "right", "both"]),
      cap: false,
      watch: Math.random() > 0.5,
      background: randomChoice(["solid", "gradient", "glow"]),
      backgroundColor: randomChoice(BACKGROUND_COLORS).color,
    };

    applyConfig(next);
  }, [applyConfig]);

  const tabs = useMemo<{ id: TabId; label: string; hint: string }[]>(
    () => [
      { id: "appearance", label: "Face & Body", hint: "Shape, tone, eyes, details" },
      { id: "style", label: "Style", hint: "Hair, facial hair, outfit" },
      { id: "extras", label: "Extras", hint: "Accessories, background" },
    ],
    [],
  );

  const handleSave = useCallback(() => {
    if (!onSave) return;
    try {
      onSave(stringifyPremiumConfig(config));
    } catch {
      onSave(JSON.stringify(config));
    }
  }, [config, onSave]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold leading-none">Avatar Customization</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted/30 text-muted-foreground">
                BETA
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Personalize how you appear across TRA-X. Changes update live in the preview.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSave && (
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6">
          {/* LEFT: Avatar Preview */}
          <aside className="sticky top-4 self-start space-y-4">
            <div className="rounded-2xl border bg-card p-5">
              <div className="relative flex items-center justify-center py-4">
                <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
                <PremiumAvatarRenderer config={config} size={200} animated />
              </div>

              {/* Preview Actions */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo}>
                        <Undo2 className="w-4 h-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Undo</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo}>
                        <Redo2 className="w-4 h-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Redo</TooltipContent>
                </Tooltip>

                <Button variant="secondary" size="sm" onClick={randomize} className="gap-1">
                  <Shuffle className="w-4 h-4" />
                  Random
                </Button>
              </div>
            </div>

            {/* Optional: small helper card */}
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tip: Use <span className="text-foreground font-medium">Random</span> to discover combinations fast, then
                fine-tune in tabs.
              </p>
            </div>
          </aside>

          {/* RIGHT: Controls */}
          <section className="space-y-4">
            {/* Tabs */}
            <div className="rounded-2xl border bg-card p-2">
              <div className="flex gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition flex flex-col items-center justify-center",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn("text-[10px] opacity-80", activeTab === tab.id ? "text-primary-foreground" : "")}
                    >
                      {tab.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel */}
            <div className="rounded-2xl border bg-card p-5 space-y-6 max-h-[560px] overflow-y-auto">
              {activeTab === "appearance" && <AppearanceTab config={config} updateConfig={updateConfig} />}
              {activeTab === "style" && <StyleTab config={config} updateConfig={updateConfig} />}
              {activeTab === "extras" && <ExtrasTab config={config} updateConfig={updateConfig} />}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ----------------------------- UI Primitives ----------------------------- */

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function PillButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "py-2 px-3 rounded-lg text-xs font-medium transition-all border",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card hover:bg-secondary border-border text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ColorSwatch({
  color,
  selected,
  onClick,
  size = "md",
  tooltip,
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  tooltip?: string;
}) {
  const sizeClasses = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  const swatch = (
    <button
      onClick={onClick}
      className={cn(
        sizeClasses,
        "rounded-full border-2 transition-all shrink-0",
        selected
          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
          : "border-border/50 hover:border-primary/50 hover:scale-105",
      )}
      style={{ backgroundColor: color }}
    />
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{swatch}</TooltipTrigger>
        <TooltipContent className="text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return swatch;
}

/* ------------------------------- Tabs ----------------------------------- */

function AppearanceTab({
  config,
  updateConfig,
}: {
  config: PremiumAvatarConfig;
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <OptionGroup label="Face Shape">
        <div className="grid grid-cols-4 gap-2">
          {(["round", "oval", "angular", "square"] as const).map((shape) => (
            <PillButton
              key={shape}
              selected={config.faceShape === shape}
              onClick={() => updateConfig("faceShape", shape)}
            >
              {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Skin Tone">
        <div className="flex flex-wrap gap-2">
          {SKIN_TONES.map((tone) => (
            <ColorSwatch
              key={tone.id}
              color={tone.color}
              selected={config.skinTone === tone.color}
              onClick={() => {
                updateConfig("skinTone", tone.color);
                updateConfig("skinUndertone", tone.undertone);
              }}
              tooltip={`${tone.undertone} undertone`}
            />
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Eye Style">
        <div className="grid grid-cols-4 gap-2">
          {(["focused", "relaxed", "sharp", "friendly"] as const).map((shape) => (
            <PillButton
              key={shape}
              selected={config.eyeShape === shape}
              onClick={() => updateConfig("eyeShape", shape)}
            >
              {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Eye Color">
        <div className="flex flex-wrap gap-2">
          {IRIS_COLORS.map((color) => (
            <ColorSwatch
              key={color.id}
              color={color.color}
              selected={config.irisColor === color.color}
              onClick={() => updateConfig("irisColor", color.color)}
              tooltip={color.name}
              size="sm"
            />
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Face Details">
        <div className="flex flex-wrap gap-2">
          <PillButton selected={config.freckles} onClick={() => updateConfig("freckles", !config.freckles)}>
            Freckles
          </PillButton>

          <PillButton
            selected={config.beautyMark === "left"}
            onClick={() => updateConfig("beautyMark", config.beautyMark === "left" ? "none" : "left")}
          >
            Mark Left
          </PillButton>

          <PillButton
            selected={config.beautyMark === "right"}
            onClick={() => updateConfig("beautyMark", config.beautyMark === "right" ? "none" : "right")}
          >
            Mark Right
          </PillButton>
        </div>
      </OptionGroup>
    </div>
  );
}

function StyleTab({
  config,
  updateConfig,
}: {
  config: PremiumAvatarConfig;
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const hairStyles = [
    { id: "none", label: "Bald" },
    { id: "buzz", label: "Buzz" },
    { id: "short", label: "Short" },
    { id: "fade", label: "Fade" },
    { id: "undercut", label: "Undercut" },
    { id: "slick", label: "Slick" },
    { id: "waves", label: "Waves" },
    { id: "curls", label: "Curls" },
    { id: "bun", label: "Bun" },
    { id: "ponytail", label: "Ponytail" },
  ] as const;

  const outfits = [
    { id: "hoodie", label: "Hoodie" },
    { id: "jacket", label: "Jacket" },
    { id: "tee", label: "T-Shirt" },
    { id: "blazer", label: "Blazer" },
    { id: "sweater", label: "Sweater" },
    { id: "polo", label: "Polo" },
  ] as const;

  return (
    <div className="space-y-5">
      <OptionGroup label="Hair Style">
        <div className="grid grid-cols-5 gap-1.5">
          {hairStyles.map((style) => (
            <PillButton
              key={style.id}
              selected={config.hairStyle === style.id}
              onClick={() => updateConfig("hairStyle", style.id)}
              className="px-2"
            >
              {style.label}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {config.hairStyle !== "none" && (
        <OptionGroup label="Hair Color">
          <div className="flex flex-wrap gap-2">
            {HAIR_COLORS.map((color) => (
              <ColorSwatch
                key={color.id}
                color={color.color}
                selected={config.hairColor === color.color}
                onClick={() => updateConfig("hairColor", color.color)}
                tooltip={color.name}
                size="sm"
              />
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <PillButton
              selected={config.hairHighlights}
              onClick={() => updateConfig("hairHighlights", !config.hairHighlights)}
            >
              ✨ Add Highlights
            </PillButton>
          </div>
        </OptionGroup>
      )}

      <OptionGroup label="Facial Hair">
        <div className="flex flex-wrap gap-2">
          {(["none", "stubble", "beard", "goatee", "mustache"] as const).map((style) => (
            <PillButton
              key={style}
              selected={config.facialHair === style}
              onClick={() => updateConfig("facialHair", style)}
            >
              {style === "none" ? "None" : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>

        {config.facialHair !== "none" && (
          <div className="pt-2">
            <Label className="text-[10px] text-muted-foreground">Density</Label>
            <Slider
              value={[config.facialHairDensity]}
              onValueChange={([v]) => updateConfig("facialHairDensity", v)}
              min={0.3}
              max={1}
              step={0.1}
              className="w-full mt-1"
            />
          </div>
        )}
      </OptionGroup>

      <OptionGroup label="Outfit">
        <div className="grid grid-cols-3 gap-2">
          {outfits.map((outfit) => (
            <PillButton
              key={outfit.id}
              selected={config.outfit === outfit.id}
              onClick={() => updateConfig("outfit", outfit.id)}
            >
              {outfit.label}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Outfit Color">
        <div className="flex flex-wrap gap-2">
          {OUTFIT_COLORS.map((color) => (
            <ColorSwatch
              key={color.id}
              color={color.color}
              selected={config.outfitColor === color.color}
              onClick={() => updateConfig("outfitColor", color.color)}
              tooltip={color.name}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <PillButton selected={config.brandAccent} onClick={() => updateConfig("brandAccent", !config.brandAccent)}>
            <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
            TRAX Accent
          </PillButton>
        </div>
      </OptionGroup>
    </div>
  );
}

function ExtrasTab({
  config,
  updateConfig,
}: {
  config: PremiumAvatarConfig;
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <OptionGroup label="Glasses">
        <div className="grid grid-cols-4 gap-2">
          {(["none", "clear", "dark", "metal"] as const).map((style) => (
            <PillButton key={style} selected={config.glasses === style} onClick={() => updateConfig("glasses", style)}>
              {style === "none" ? "None" : style === "dark" ? "Shades" : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Accessories">
        <div className="flex flex-wrap gap-2">
          <PillButton selected={config.headphones} onClick={() => updateConfig("headphones", !config.headphones)}>
            🎧 Headphones
          </PillButton>
          <PillButton selected={config.cap} onClick={() => updateConfig("cap", !config.cap)}>
            🧢 Cap
          </PillButton>
          <PillButton selected={config.watch} onClick={() => updateConfig("watch", !config.watch)}>
            ⌚ Watch
          </PillButton>
        </div>
      </OptionGroup>

      <OptionGroup label="Earrings">
        <div className="grid grid-cols-4 gap-2">
          {(["none", "left", "right", "both"] as const).map((style) => (
            <PillButton key={style} selected={config.earring === style} onClick={() => updateConfig("earring", style)}>
              {style === "none" ? "None" : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      <OptionGroup label="Background Style">
        <div className="grid grid-cols-4 gap-2">
          {(["none", "solid", "gradient", "glow"] as const).map((style) => (
            <PillButton
              key={style}
              selected={config.background === style}
              onClick={() => updateConfig("background", style)}
            >
              {style === "none" ? "None" : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {config.background !== "none" && (
        <OptionGroup label="Background Color">
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_COLORS.map((color) => (
              <ColorSwatch
                key={color.id}
                color={color.color}
                selected={config.backgroundColor === color.color}
                onClick={() => updateConfig("backgroundColor", color.color)}
                tooltip={color.name}
              />
            ))}
          </div>
        </OptionGroup>
      )}

      <OptionGroup label="Eyebrows">
        <div className="grid grid-cols-4 gap-2">
          {(["natural", "arched", "straight", "thick"] as const).map((shape) => (
            <PillButton
              key={shape}
              selected={config.eyebrowShape === shape}
              onClick={() => updateConfig("eyebrowShape", shape)}
            >
              {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </PillButton>
          ))}
        </div>

        <div className="pt-2">
          <Label className="text-[10px] text-muted-foreground">Thickness</Label>
          <Slider
            value={[config.eyebrowThickness]}
            onValueChange={([v]) => updateConfig("eyebrowThickness", v)}
            min={0.5}
            max={1.5}
            step={0.1}
            className="w-full mt-1"
          />
        </div>
      </OptionGroup>
    </div>
  );
}
