import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Undo2, Redo2, Shuffle } from 'lucide-react';
import { PremiumAvatarRenderer } from './PremiumAvatarRenderer';
import {
  PremiumAvatarConfig,
  DEFAULT_PREMIUM_CONFIG,
  SKIN_TONES,
  IRIS_COLORS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  BACKGROUND_COLORS,
  stringifyPremiumConfig,
  parsePremiumConfig,
} from './types';

interface PremiumAvatarEditorProps {
  initialConfig?: PremiumAvatarConfig;
  onConfigChange: (config: PremiumAvatarConfig) => void;
  onSave?: (configString: string) => void;
}

type TabId = 'appearance' | 'style' | 'extras';

export function PremiumAvatarEditor({ 
  initialConfig, 
  onConfigChange,
}: PremiumAvatarEditorProps) {
  const [config, setConfig] = useState<PremiumAvatarConfig>(initialConfig || DEFAULT_PREMIUM_CONFIG);
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const [history, setHistory] = useState<PremiumAvatarConfig[]>([initialConfig || DEFAULT_PREMIUM_CONFIG]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedo = useRef(false);

  useEffect(() => {
    if (!isUndoRedo.current) {
      onConfigChange(config);
    }
    isUndoRedo.current = false;
  }, [config, onConfigChange]);

  const updateConfig = useCallback(<K extends keyof PremiumAvatarConfig>(
    key: K, 
    value: PremiumAvatarConfig[K]
  ) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      setHistory(h => [...h.slice(0, historyIndex + 1), newConfig]);
      setHistoryIndex(i => i + 1);
      return newConfig;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      setHistoryIndex(i => i - 1);
      setConfig(history[historyIndex - 1]);
      onConfigChange(history[historyIndex - 1]);
    }
  }, [historyIndex, history, onConfigChange]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      setHistoryIndex(i => i + 1);
      setConfig(history[historyIndex + 1]);
      onConfigChange(history[historyIndex + 1]);
    }
  }, [historyIndex, history, onConfigChange]);

  const randomize = useCallback(() => {
    const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    const newConfig: PremiumAvatarConfig = {
      faceShape: randomChoice(['round', 'oval', 'angular', 'square']),
      skinTone: randomChoice(SKIN_TONES).color,
      skinUndertone: randomChoice(['warm', 'neutral', 'cool']),
      freckles: Math.random() > 0.7,
      beautyMark: randomChoice(['none', 'none', 'none', 'left', 'right']),
      eyeShape: randomChoice(['focused', 'relaxed', 'sharp', 'friendly']),
      irisColor: randomChoice(IRIS_COLORS).color,
      eyebrowShape: randomChoice(['natural', 'arched', 'straight', 'thick']),
      eyebrowThickness: 0.8 + Math.random() * 0.4,
      hairStyle: randomChoice(['short', 'fade', 'undercut', 'waves', 'bun', 'curls', 'buzz', 'slick']),
      hairColor: randomChoice(HAIR_COLORS.slice(0, 10)).color,
      hairHighlights: Math.random() > 0.7,
      facialHair: randomChoice(['none', 'none', 'stubble', 'beard', 'goatee', 'mustache']),
      facialHairDensity: 0.5 + Math.random() * 0.5,
      outfit: randomChoice(['hoodie', 'jacket', 'tee', 'blazer', 'sweater', 'polo']),
      outfitColor: randomChoice(OUTFIT_COLORS).color,
      brandAccent: Math.random() > 0.5,
      glasses: randomChoice(['none', 'none', 'none', 'clear', 'dark', 'metal']),
      headphones: Math.random() > 0.85,
      earring: randomChoice(['none', 'none', 'none', 'left', 'right', 'both']),
      cap: false,
      watch: Math.random() > 0.5,
      background: randomChoice(['solid', 'gradient', 'glow']),
      backgroundColor: randomChoice(BACKGROUND_COLORS).color,
    };
    
    setConfig(newConfig);
    setHistory(h => [...h.slice(0, historyIndex + 1), newConfig]);
    setHistoryIndex(i => i + 1);
  }, [historyIndex]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'appearance', label: 'Face & Body' },
    { id: 'style', label: 'Style' },
    { id: 'extras', label: 'Extras' },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Preview + Controls Row */}
        <div className="flex items-center gap-4">
          {/* Avatar Preview */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <PremiumAvatarRenderer config={config} size={100} animated />
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            {/* Tabs */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={undo} disabled={historyIndex === 0}>
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={redo} disabled={historyIndex === history.length - 1}>
                    <Redo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs ml-auto" onClick={randomize}>
                <Shuffle className="w-3.5 h-3.5" />
                Random
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
          {activeTab === 'appearance' && (
            <AppearanceTab config={config} updateConfig={updateConfig} />
          )}
          {activeTab === 'style' && (
            <StyleTab config={config} updateConfig={updateConfig} />
          )}
          {activeTab === 'extras' && (
            <ExtrasTab config={config} updateConfig={updateConfig} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Option Group Component
function OptionGroup({ 
  label, 
  children 
}: { 
  label: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

// Pill Button Component
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
        className
      )}
    >
      {children}
    </button>
  );
}

// Color Swatch Component
function ColorSwatch({ 
  color, 
  selected, 
  onClick, 
  size = 'md',
  tooltip,
}: { 
  color: string; 
  selected: boolean; 
  onClick: () => void;
  size?: 'sm' | 'md';
  tooltip?: string;
}) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  
  const swatch = (
    <button
      onClick={onClick}
      className={cn(
        sizeClasses,
        "rounded-full border-2 transition-all shrink-0",
        selected
          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
          : "border-border/50 hover:border-primary/50 hover:scale-105"
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

// Appearance Tab
function AppearanceTab({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Face Shape */}
      <OptionGroup label="Face Shape">
        <div className="grid grid-cols-4 gap-2">
          {(['round', 'oval', 'angular', 'square'] as const).map((shape) => (
            <PillButton
              key={shape}
              selected={config.faceShape === shape}
              onClick={() => updateConfig('faceShape', shape)}
            >
              {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Skin Tone */}
      <OptionGroup label="Skin Tone">
        <div className="flex flex-wrap gap-2">
          {SKIN_TONES.map((tone) => (
            <ColorSwatch
              key={tone.id}
              color={tone.color}
              selected={config.skinTone === tone.color}
              onClick={() => {
                updateConfig('skinTone', tone.color);
                updateConfig('skinUndertone', tone.undertone);
              }}
              tooltip={`${tone.undertone} undertone`}
            />
          ))}
        </div>
      </OptionGroup>

      {/* Eyes */}
      <OptionGroup label="Eye Style">
        <div className="grid grid-cols-4 gap-2">
          {(['focused', 'relaxed', 'sharp', 'friendly'] as const).map((shape) => (
            <PillButton
              key={shape}
              selected={config.eyeShape === shape}
              onClick={() => updateConfig('eyeShape', shape)}
            >
              {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Eye Color */}
      <OptionGroup label="Eye Color">
        <div className="flex flex-wrap gap-2">
          {IRIS_COLORS.map((color) => (
            <ColorSwatch
              key={color.id}
              color={color.color}
              selected={config.irisColor === color.color}
              onClick={() => updateConfig('irisColor', color.color)}
              tooltip={color.name}
              size="sm"
            />
          ))}
        </div>
      </OptionGroup>

      {/* Face Details */}
      <OptionGroup label="Face Details">
        <div className="flex flex-wrap gap-2">
          <PillButton
            selected={config.freckles}
            onClick={() => updateConfig('freckles', !config.freckles)}
          >
            Freckles
          </PillButton>
          <PillButton
            selected={config.beautyMark === 'left'}
            onClick={() => updateConfig('beautyMark', config.beautyMark === 'left' ? 'none' : 'left')}
          >
            Mark Left
          </PillButton>
          <PillButton
            selected={config.beautyMark === 'right'}
            onClick={() => updateConfig('beautyMark', config.beautyMark === 'right' ? 'none' : 'right')}
          >
            Mark Right
          </PillButton>
        </div>
      </OptionGroup>
    </div>
  );
}

// Style Tab
function StyleTab({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const hairStyles = [
    { id: 'none', label: 'Bald' },
    { id: 'buzz', label: 'Buzz' },
    { id: 'short', label: 'Short' },
    { id: 'fade', label: 'Fade' },
    { id: 'undercut', label: 'Undercut' },
    { id: 'slick', label: 'Slick' },
    { id: 'waves', label: 'Waves' },
    { id: 'curls', label: 'Curls' },
    { id: 'bun', label: 'Bun' },
    { id: 'ponytail', label: 'Ponytail' },
  ] as const;

  const outfits = [
    { id: 'hoodie', label: 'Hoodie' },
    { id: 'jacket', label: 'Jacket' },
    { id: 'tee', label: 'T-Shirt' },
    { id: 'blazer', label: 'Blazer' },
    { id: 'sweater', label: 'Sweater' },
    { id: 'polo', label: 'Polo' },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Hair Style */}
      <OptionGroup label="Hair Style">
        <div className="grid grid-cols-5 gap-1.5">
          {hairStyles.map((style) => (
            <PillButton
              key={style.id}
              selected={config.hairStyle === style.id}
              onClick={() => updateConfig('hairStyle', style.id)}
              className="px-2"
            >
              {style.label}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Hair Color */}
      {config.hairStyle !== 'none' && (
        <OptionGroup label="Hair Color">
          <div className="flex flex-wrap gap-2">
            {HAIR_COLORS.map((color) => (
              <ColorSwatch
                key={color.id}
                color={color.color}
                selected={config.hairColor === color.color}
                onClick={() => updateConfig('hairColor', color.color)}
                tooltip={color.name}
                size="sm"
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <PillButton
              selected={config.hairHighlights}
              onClick={() => updateConfig('hairHighlights', !config.hairHighlights)}
            >
              ✨ Add Highlights
            </PillButton>
          </div>
        </OptionGroup>
      )}

      {/* Facial Hair */}
      <OptionGroup label="Facial Hair">
        <div className="flex flex-wrap gap-2">
          {(['none', 'stubble', 'beard', 'goatee', 'mustache'] as const).map((style) => (
            <PillButton
              key={style}
              selected={config.facialHair === style}
              onClick={() => updateConfig('facialHair', style)}
            >
              {style === 'none' ? 'None' : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
        {config.facialHair !== 'none' && (
          <div className="pt-2">
            <Label className="text-[10px] text-muted-foreground">Density</Label>
            <Slider
              value={[config.facialHairDensity]}
              onValueChange={([v]) => updateConfig('facialHairDensity', v)}
              min={0.3}
              max={1}
              step={0.1}
              className="w-full mt-1"
            />
          </div>
        )}
      </OptionGroup>

      {/* Outfit */}
      <OptionGroup label="Outfit">
        <div className="grid grid-cols-3 gap-2">
          {outfits.map((outfit) => (
            <PillButton
              key={outfit.id}
              selected={config.outfit === outfit.id}
              onClick={() => updateConfig('outfit', outfit.id)}
            >
              {outfit.label}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Outfit Color */}
      <OptionGroup label="Outfit Color">
        <div className="flex flex-wrap gap-2">
          {OUTFIT_COLORS.map((color) => (
            <ColorSwatch
              key={color.id}
              color={color.color}
              selected={config.outfitColor === color.color}
              onClick={() => updateConfig('outfitColor', color.color)}
              tooltip={color.name}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <PillButton
            selected={config.brandAccent}
            onClick={() => updateConfig('brandAccent', !config.brandAccent)}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#10B981] mr-1.5" />
            TRAX Accent
          </PillButton>
        </div>
      </OptionGroup>
    </div>
  );
}

// Extras Tab  
function ExtrasTab({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Glasses */}
      <OptionGroup label="Glasses">
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'clear', 'dark', 'metal'] as const).map((style) => (
            <PillButton
              key={style}
              selected={config.glasses === style}
              onClick={() => updateConfig('glasses', style)}
            >
              {style === 'none' ? 'None' : style === 'dark' ? 'Shades' : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Accessories */}
      <OptionGroup label="Accessories">
        <div className="flex flex-wrap gap-2">
          <PillButton
            selected={config.headphones}
            onClick={() => updateConfig('headphones', !config.headphones)}
          >
            🎧 Headphones
          </PillButton>
          <PillButton
            selected={config.cap}
            onClick={() => updateConfig('cap', !config.cap)}
          >
            🧢 Cap
          </PillButton>
          <PillButton
            selected={config.watch}
            onClick={() => updateConfig('watch', !config.watch)}
          >
            ⌚ Watch
          </PillButton>
        </div>
      </OptionGroup>

      {/* Earrings */}
      <OptionGroup label="Earrings">
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'left', 'right', 'both'] as const).map((style) => (
            <PillButton
              key={style}
              selected={config.earring === style}
              onClick={() => updateConfig('earring', style)}
            >
              {style === 'none' ? 'None' : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Background */}
      <OptionGroup label="Background Style">
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'solid', 'gradient', 'glow'] as const).map((style) => (
            <PillButton
              key={style}
              selected={config.background === style}
              onClick={() => updateConfig('background', style)}
            >
              {style === 'none' ? 'None' : style.charAt(0).toUpperCase() + style.slice(1)}
            </PillButton>
          ))}
        </div>
      </OptionGroup>

      {/* Background Color */}
      {config.background !== 'none' && (
        <OptionGroup label="Background Color">
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_COLORS.map((color) => (
              <ColorSwatch
                key={color.id}
                color={color.color}
                selected={config.backgroundColor === color.color}
                onClick={() => updateConfig('backgroundColor', color.color)}
                tooltip={color.name}
              />
            ))}
          </div>
        </OptionGroup>
      )}

      {/* Eyebrows */}
      <OptionGroup label="Eyebrows">
        <div className="grid grid-cols-4 gap-2">
          {(['natural', 'arched', 'straight', 'thick'] as const).map((shape) => (
            <PillButton
              key={shape}
              selected={config.eyebrowShape === shape}
              onClick={() => updateConfig('eyebrowShape', shape)}
            >
              {shape.charAt(0).toUpperCase() + shape.slice(1)}
            </PillButton>
          ))}
        </div>
        <div className="pt-2">
          <Label className="text-[10px] text-muted-foreground">Thickness</Label>
          <Slider
            value={[config.eyebrowThickness]}
            onValueChange={([v]) => updateConfig('eyebrowThickness', v)}
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

export { stringifyPremiumConfig, parsePremiumConfig };
