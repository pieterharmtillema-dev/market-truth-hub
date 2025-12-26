import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Undo2, Redo2, Shuffle, ChevronLeft, ChevronRight, 
  User, Eye, Scissors, Shirt, Glasses, Palette 
} from 'lucide-react';
import { PremiumAvatarRenderer } from './PremiumAvatarRenderer';
import {
  PremiumAvatarConfig,
  DEFAULT_PREMIUM_CONFIG,
  SKIN_TONES,
  IRIS_COLORS,
  HAIR_COLORS,
  OUTFIT_COLORS,
  BACKGROUND_COLORS,
  EditorStep,
  EDITOR_STEPS,
  stringifyPremiumConfig,
  parsePremiumConfig,
} from './types';

interface PremiumAvatarEditorProps {
  initialConfig?: PremiumAvatarConfig;
  onConfigChange: (config: PremiumAvatarConfig) => void;
  onSave?: (configString: string) => void;
}

export function PremiumAvatarEditor({ 
  initialConfig, 
  onConfigChange,
  onSave 
}: PremiumAvatarEditorProps) {
  const [config, setConfig] = useState<PremiumAvatarConfig>(initialConfig || DEFAULT_PREMIUM_CONFIG);
  const [currentStep, setCurrentStep] = useState<EditorStep>('face');
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
      // Add to history
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
      hairColor: randomChoice(HAIR_COLORS.slice(0, 10)).color, // Natural colors only
      hairHighlights: Math.random() > 0.7,
      facialHair: randomChoice(['none', 'none', 'stubble', 'beard', 'goatee', 'mustache']),
      facialHairDensity: 0.5 + Math.random() * 0.5,
      
      outfit: randomChoice(['hoodie', 'jacket', 'tee', 'blazer', 'sweater', 'polo']),
      outfitColor: randomChoice(OUTFIT_COLORS).color,
      brandAccent: Math.random() > 0.5,
      
      glasses: randomChoice(['none', 'none', 'none', 'clear', 'dark', 'metal']),
      headphones: Math.random() > 0.85,
      earring: randomChoice(['none', 'none', 'none', 'left', 'right', 'both']),
      cap: false, // Caps tend to look busy, disable for random
      watch: Math.random() > 0.5,
      
      background: randomChoice(['solid', 'gradient', 'glow']),
      backgroundColor: randomChoice(BACKGROUND_COLORS).color,
    };
    
    setConfig(newConfig);
    setHistory(h => [...h.slice(0, historyIndex + 1), newConfig]);
    setHistoryIndex(i => i + 1);
  }, [historyIndex]);

  const stepIndex = EDITOR_STEPS.findIndex(s => s.id === currentStep);
  const canGoBack = stepIndex > 0;
  const canGoForward = stepIndex < EDITOR_STEPS.length - 1;

  const goToStep = (step: EditorStep) => setCurrentStep(step);
  const goBack = () => canGoBack && setCurrentStep(EDITOR_STEPS[stepIndex - 1].id);
  const goForward = () => canGoForward && setCurrentStep(EDITOR_STEPS[stepIndex + 1].id);

  const stepIcons: Record<EditorStep, React.ReactNode> = {
    face: <User className="w-4 h-4" />,
    eyes: <Eye className="w-4 h-4" />,
    hair: <Scissors className="w-4 h-4" />,
    clothing: <Shirt className="w-4 h-4" />,
    accessories: <Glasses className="w-4 h-4" />,
    background: <Palette className="w-4 h-4" />,
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Live Preview */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse-glow" />
            <PremiumAvatarRenderer config={config} size={140} animated />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={undo}
                  disabled={historyIndex === 0}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8"
                  onClick={redo}
                  disabled={historyIndex === history.length - 1}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={randomize}
              >
                <Shuffle className="w-4 h-4" />
                Randomize
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate random professional avatar</TooltipContent>
          </Tooltip>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {EDITOR_STEPS.map((step) => (
            <Tooltip key={step.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => goToStep(step.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md transition-all text-xs font-medium",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  {stepIcons[step.id]}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>{step.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Step Content */}
        <ScrollArea className="h-[260px] pr-3">
          <div className="space-y-4 pb-2">
            {currentStep === 'face' && (
              <FaceEditor config={config} updateConfig={updateConfig} />
            )}
            {currentStep === 'eyes' && (
              <EyesEditor config={config} updateConfig={updateConfig} />
            )}
            {currentStep === 'hair' && (
              <HairEditor config={config} updateConfig={updateConfig} />
            )}
            {currentStep === 'clothing' && (
              <ClothingEditor config={config} updateConfig={updateConfig} />
            )}
            {currentStep === 'accessories' && (
              <AccessoriesEditor config={config} updateConfig={updateConfig} />
            )}
            {currentStep === 'background' && (
              <BackgroundEditor config={config} updateConfig={updateConfig} />
            )}
          </div>
        </ScrollArea>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={!canGoBack}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            {canGoBack && EDITOR_STEPS[stepIndex - 1].label}
          </Button>
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} / {EDITOR_STEPS.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goForward}
            disabled={!canGoForward}
            className="gap-1"
          >
            {canGoForward && EDITOR_STEPS[stepIndex + 1].label}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Face Editor Component
function FaceEditor({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const faceShapes = [
    { id: 'round', label: 'Round', desc: 'Soft, circular shape' },
    { id: 'oval', label: 'Oval', desc: 'Classic balanced shape' },
    { id: 'angular', label: 'Angular', desc: 'Sharp, defined features' },
    { id: 'square', label: 'Square', desc: 'Strong jawline' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Face Shape</Label>
        <div className="grid grid-cols-4 gap-2">
          {faceShapes.map((shape) => (
            <Tooltip key={shape.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateConfig('faceShape', shape.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    config.faceShape === shape.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  )}
                >
                  {shape.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{shape.desc}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skin Tone</Label>
        <div className="flex flex-wrap gap-2">
          {SKIN_TONES.map((tone) => (
            <Tooltip key={tone.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    updateConfig('skinTone', tone.color);
                    updateConfig('skinUndertone', tone.undertone);
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    config.skinTone === tone.color
                      ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "border-border hover:border-primary/50 hover:scale-105"
                  )}
                  style={{ backgroundColor: tone.color }}
                />
              </TooltipTrigger>
              <TooltipContent className="capitalize">{tone.undertone} undertone</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</Label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateConfig('freckles', !config.freckles)}
            className={cn(
              "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
              config.freckles
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            )}
          >
            Freckles
          </button>
          {(['none', 'left', 'right'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => updateConfig('beautyMark', pos)}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                config.beautyMark === pos
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              {pos === 'none' ? 'No Mark' : `Mark ${pos}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Eyes Editor Component
function EyesEditor({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const eyeShapes = [
    { id: 'focused', label: 'Focused', desc: 'Intense, determined look' },
    { id: 'relaxed', label: 'Relaxed', desc: 'Calm, approachable eyes' },
    { id: 'sharp', label: 'Sharp', desc: 'Alert, attentive gaze' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm, welcoming eyes' },
  ] as const;

  const eyebrowShapes = [
    { id: 'natural', label: 'Natural' },
    { id: 'arched', label: 'Arched' },
    { id: 'straight', label: 'Straight' },
    { id: 'thick', label: 'Thick' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Eye Shape</Label>
        <div className="grid grid-cols-4 gap-2">
          {eyeShapes.map((shape) => (
            <Tooltip key={shape.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateConfig('eyeShape', shape.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    config.eyeShape === shape.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  )}
                >
                  {shape.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{shape.desc}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Iris Color</Label>
        <div className="flex flex-wrap gap-2">
          {IRIS_COLORS.map((color) => (
            <Tooltip key={color.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateConfig('irisColor', color.color)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    config.irisColor === color.color
                      ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "border-border hover:border-primary/50 hover:scale-105"
                  )}
                  style={{ backgroundColor: color.color }}
                />
              </TooltipTrigger>
              <TooltipContent>{color.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Eyebrow Shape</Label>
        <div className="grid grid-cols-4 gap-2">
          {eyebrowShapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => updateConfig('eyebrowShape', shape.id)}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                config.eyebrowShape === shape.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              {shape.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Eyebrow Thickness
        </Label>
        <Slider
          value={[config.eyebrowThickness]}
          onValueChange={([v]) => updateConfig('eyebrowThickness', v)}
          min={0.5}
          max={1.5}
          step={0.1}
          className="w-full"
        />
      </div>
    </div>
  );
}

// Hair Editor Component
function HairEditor({ 
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

  const facialHairStyles = [
    { id: 'none', label: 'None' },
    { id: 'stubble', label: 'Stubble' },
    { id: 'beard', label: 'Beard' },
    { id: 'goatee', label: 'Goatee' },
    { id: 'mustache', label: 'Mustache' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hair Style</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {hairStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => updateConfig('hairStyle', style.id)}
              className={cn(
                "py-1.5 px-2 rounded-lg text-xs font-medium transition-all",
                config.hairStyle === style.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {config.hairStyle !== 'none' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hair Color</Label>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((color) => (
                <Tooltip key={color.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => updateConfig('hairColor', color.color)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        config.hairColor === color.color
                          ? "border-primary ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                          : "border-border hover:border-primary/50 hover:scale-105"
                      )}
                      style={{ backgroundColor: color.color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{color.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateConfig('hairHighlights', !config.hairHighlights)}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                config.hairHighlights
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              ✨ Highlights
            </button>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Facial Hair</Label>
        <div className="flex flex-wrap gap-1.5">
          {facialHairStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => updateConfig('facialHair', style.id)}
              className={cn(
                "py-1.5 px-3 rounded-lg text-xs font-medium transition-all",
                config.facialHair === style.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {config.facialHair !== 'none' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Facial Hair Density
          </Label>
          <Slider
            value={[config.facialHairDensity]}
            onValueChange={([v]) => updateConfig('facialHairDensity', v)}
            min={0.3}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

// Clothing Editor Component
function ClothingEditor({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const outfits = [
    { id: 'hoodie', label: 'Hoodie', desc: 'Casual comfort' },
    { id: 'jacket', label: 'Jacket', desc: 'Smart casual' },
    { id: 'tee', label: 'T-Shirt', desc: 'Relaxed style' },
    { id: 'blazer', label: 'Blazer', desc: 'Professional look' },
    { id: 'sweater', label: 'Sweater', desc: 'Cozy and refined' },
    { id: 'polo', label: 'Polo', desc: 'Business casual' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outfit Style</Label>
        <div className="grid grid-cols-3 gap-2">
          {outfits.map((outfit) => (
            <Tooltip key={outfit.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateConfig('outfit', outfit.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    config.outfit === outfit.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  )}
                >
                  {outfit.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{outfit.desc}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outfit Color</Label>
        <div className="flex flex-wrap gap-2">
          {OUTFIT_COLORS.map((color) => (
            <Tooltip key={color.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateConfig('outfitColor', color.color)}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 transition-all",
                    config.outfitColor === color.color
                      ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "border-border hover:border-primary/50 hover:scale-105"
                  )}
                  style={{ backgroundColor: color.color }}
                />
              </TooltipTrigger>
              <TooltipContent>{color.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => updateConfig('brandAccent', !config.brandAccent)}
          className={cn(
            "py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-2",
            config.brandAccent
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          )}
        >
          <span className="w-3 h-3 rounded-full bg-[#10B981]" />
          TRAX Accent
        </button>
      </div>
    </div>
  );
}

// Accessories Editor Component
function AccessoriesEditor({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const glassesOptions = [
    { id: 'none', label: 'None' },
    { id: 'clear', label: 'Clear' },
    { id: 'dark', label: 'Sunglasses' },
    { id: 'metal', label: 'Metal Frames' },
  ] as const;

  const earringOptions = [
    { id: 'none', label: 'None' },
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
    { id: 'both', label: 'Both' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Glasses</Label>
        <div className="grid grid-cols-4 gap-2">
          {glassesOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => updateConfig('glasses', option.id)}
              className={cn(
                "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                config.glasses === option.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Earrings</Label>
        <div className="grid grid-cols-4 gap-2">
          {earringOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => updateConfig('earring', option.id)}
              className={cn(
                "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                config.earring === option.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Other Accessories</Label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateConfig('headphones', !config.headphones)}
            className={cn(
              "py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
              config.headphones
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            )}
          >
            🎧 Headphones
          </button>
          <button
            onClick={() => updateConfig('cap', !config.cap)}
            className={cn(
              "py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
              config.cap
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            )}
          >
            🧢 Cap
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => updateConfig('watch', !config.watch)}
                className={cn(
                  "py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                  config.watch
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                )}
              >
                ⌚ Watch
              </button>
            </TooltipTrigger>
            <TooltipContent>Trader's essential timepiece</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// Background Editor Component
function BackgroundEditor({ 
  config, 
  updateConfig 
}: { 
  config: PremiumAvatarConfig; 
  updateConfig: <K extends keyof PremiumAvatarConfig>(key: K, value: PremiumAvatarConfig[K]) => void;
}) {
  const bgStyles = [
    { id: 'none', label: 'None', desc: 'Transparent/dark background' },
    { id: 'solid', label: 'Solid', desc: 'Clean solid color' },
    { id: 'gradient', label: 'Gradient', desc: 'Subtle color gradient' },
    { id: 'glow', label: 'Glow', desc: 'Brand glow effect' },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Background Style</Label>
        <div className="grid grid-cols-4 gap-2">
          {bgStyles.map((style) => (
            <Tooltip key={style.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => updateConfig('background', style.id)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                    config.background === style.id
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  )}
                >
                  {style.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{style.desc}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {config.background !== 'none' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Background Color</Label>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_COLORS.map((color) => (
              <Tooltip key={color.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => updateConfig('backgroundColor', color.color)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all relative overflow-hidden",
                      config.backgroundColor === color.color
                        ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "border-border hover:border-primary/50 hover:scale-105"
                    )}
                    style={{ backgroundColor: color.color }}
                  >
                    {color.id === 'brand' && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                        T
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{color.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export helpers
export { stringifyPremiumConfig, parsePremiumConfig };
