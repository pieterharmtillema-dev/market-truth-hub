import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CharacterRenderer } from "./CharacterRenderer";
import {
  CharacterConfig,
  DEFAULT_CHARACTER_CONFIG,
  SKIN_TONES,
  CLOTHING_COLORS,
  PANTS_COLORS,
  TOP_TYPES,
  BOTTOM_TYPES,
  TOP_GRAPHICS,
  SUNGLASSES_STYLES,
  CHARACTER_PRESETS,
  BodyType,
  TopType,
  BottomType,
  TopGraphic,
  SunglassesStyle,
} from "./characterConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User,
  Shirt,
  Sparkles,
  Crown,
  Check,
  RotateCcw,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  avatarUrl?: string | null;
  displayName?: string;
  initialConfig?: CharacterConfig;
  onSave?: (config: CharacterConfig) => void;
}

export function CharacterCustomizer({
  open,
  onOpenChange,
  userId,
  avatarUrl,
  displayName,
  initialConfig,
  onSave,
}: CharacterCustomizerProps) {
  const [config, setConfig] = useState<CharacterConfig>(
    initialConfig || DEFAULT_CHARACTER_CONFIG
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("body");

  // Reset to initial config when dialog opens
  useEffect(() => {
    if (open) {
      setConfig(initialConfig || DEFAULT_CHARACTER_CONFIG);
    }
  }, [open, initialConfig]);

  const updateConfig = (updates: Partial<CharacterConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateTop = (updates: Partial<CharacterConfig['top']>) => {
    setConfig(prev => ({ ...prev, top: { ...prev.top, ...updates } }));
  };

  const updateBottom = (updates: Partial<CharacterConfig['bottom']>) => {
    setConfig(prev => ({ ...prev, bottom: { ...prev.bottom, ...updates } }));
  };

  const updateAccessories = (updates: Partial<CharacterConfig['accessories']>) => {
    setConfig(prev => ({ ...prev, accessories: { ...prev.accessories, ...updates } }));
  };

  const updateSpecialItems = (updates: Partial<NonNullable<CharacterConfig['specialItems']>>) => {
    setConfig(prev => ({ ...prev, specialItems: { ...prev.specialItems, ...updates } }));
  };

  const handlePresetSelect = (preset: typeof CHARACTER_PRESETS[0]) => {
    setConfig(preset.config);
    toast.success(`Applied "${preset.name}" preset`);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CHARACTER_CONFIG);
    toast.info("Reset to default character");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ character_config: JSON.parse(JSON.stringify(config)) })
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Character saved!");
      onSave?.(config);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving character:", error);
      toast.error("Failed to save character");
    } finally {
      setSaving(false);
    }
  };

  // Color swatch component
  const ColorSwatch = ({ 
    color, 
    selected, 
    onClick, 
    name 
  }: { 
    color: string; 
    selected: boolean; 
    onClick: () => void;
    name?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-lg border-2 transition-all hover:scale-110",
        selected ? "border-primary ring-2 ring-primary/50 scale-110" : "border-transparent"
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {selected && (
        <Check className="w-4 h-4 mx-auto text-white drop-shadow-md" />
      )}
    </button>
  );

  // Option button component
  const OptionButton = ({
    selected,
    onClick,
    children,
    className = "",
  }: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-lg border transition-all text-sm font-medium",
        selected
          ? "bg-primary/20 border-primary text-primary"
          : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Customize Your Character
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row h-[70vh]">
          {/* Preview Panel */}
          <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-border bg-gradient-to-b from-background to-card flex flex-col items-center justify-center">
            <div className="relative">
              {/* Scanline effect */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none rounded-3xl"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.1) 2px, rgba(34, 211, 238, 0.1) 4px)'
                }}
              />
              
              <div className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-3xl border-2 border-primary/30 p-4 relative overflow-hidden">
                <CharacterRenderer
                  config={config}
                  avatarUrl={avatarUrl}
                  displayName={displayName}
                  size="lg"
                  showGlow={true}
                />
              </div>
            </div>

            <p className="text-muted-foreground text-xs mt-4 text-center">
              Live Preview
            </p>
          </div>

          {/* Customization Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-6 mt-4 grid grid-cols-4 h-10">
                <TabsTrigger value="body" className="text-xs gap-1">
                  <User className="w-3 h-3" />
                  Body
                </TabsTrigger>
                <TabsTrigger value="clothing" className="text-xs gap-1">
                  <Shirt className="w-3 h-3" />
                  Clothing
                </TabsTrigger>
                <TabsTrigger value="accessories" className="text-xs gap-1">
                  <Sparkles className="w-3 h-3" />
                  Accessories
                </TabsTrigger>
                <TabsTrigger value="special" className="text-xs gap-1">
                  <Crown className="w-3 h-3" />
                  Special
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 px-6 py-4">
                {/* Body Tab */}
                <TabsContent value="body" className="mt-0 space-y-6">
                  {/* Skin Tone */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Skin Tone</Label>
                    <div className="flex flex-wrap gap-2">
                      {SKIN_TONES.map((tone) => (
                        <ColorSwatch
                          key={tone.color}
                          color={tone.color}
                          name={tone.name}
                          selected={config.skinTone === tone.color}
                          onClick={() => updateConfig({ skinTone: tone.color })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Body Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Body Type</Label>
                    <div className="flex gap-2">
                      {(['slim', 'athletic', 'broad'] as BodyType[]).map((type) => (
                        <OptionButton
                          key={type}
                          selected={config.bodyType === type}
                          onClick={() => updateConfig({ bodyType: type })}
                          className="flex-1"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  {/* Height */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-sm font-medium">Height Scale</Label>
                      <span className="text-sm text-muted-foreground">
                        {(config.height * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Slider
                      value={[config.height]}
                      onValueChange={([value]) => updateConfig({ height: value })}
                      min={0.8}
                      max={1.2}
                      step={0.05}
                      className="w-full"
                    />
                  </div>

                  {/* Presets */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <Label className="text-sm font-medium">Quick Presets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {CHARACTER_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => handlePresetSelect(preset)}
                          className="p-3 rounded-lg border border-border bg-card hover:bg-accent transition-all text-left"
                        >
                          <div className="font-medium text-sm">{preset.name}</div>
                          <div className="text-xs text-muted-foreground">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Clothing Tab */}
                <TabsContent value="clothing" className="mt-0 space-y-6">
                  {/* Top Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Top Style</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TOP_TYPES.map(({ type, name, description }) => (
                        <button
                          key={type}
                          onClick={() => updateTop({ type })}
                          className={cn(
                            "p-3 rounded-lg border transition-all text-left",
                            config.top.type === type
                              ? "bg-primary/20 border-primary"
                              : "bg-card border-border hover:bg-accent"
                          )}
                        >
                          <div className="font-medium text-sm">{name}</div>
                          <div className="text-xs text-muted-foreground">{description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Color */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Top Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {CLOTHING_COLORS.map((color) => (
                        <ColorSwatch
                          key={color.color}
                          color={color.color}
                          name={color.name}
                          selected={config.top.color === color.color}
                          onClick={() => updateTop({ color: color.color })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Top Graphic */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Shirt Graphic</Label>
                    <div className="flex flex-wrap gap-2">
                      {TOP_GRAPHICS.map(({ type, name, icon }) => (
                        <OptionButton
                          key={type}
                          selected={config.top.graphic === type}
                          onClick={() => updateTop({ graphic: type })}
                        >
                          {icon} {name}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border pt-6" />

                  {/* Bottom Type */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Bottom Style</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {BOTTOM_TYPES.map(({ type, name, description }) => (
                        <button
                          key={type}
                          onClick={() => updateBottom({ type })}
                          className={cn(
                            "p-3 rounded-lg border transition-all text-left",
                            config.bottom.type === type
                              ? "bg-primary/20 border-primary"
                              : "bg-card border-border hover:bg-accent"
                          )}
                        >
                          <div className="font-medium text-sm">{name}</div>
                          <div className="text-xs text-muted-foreground">{description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Color */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Bottom Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {PANTS_COLORS.map((color) => (
                        <ColorSwatch
                          key={color.color}
                          color={color.color}
                          name={color.name}
                          selected={config.bottom.color === color.color}
                          onClick={() => updateBottom({ color: color.color })}
                        />
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Accessories Tab */}
                <TabsContent value="accessories" className="mt-0 space-y-6">
                  {/* Sunglasses */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Sunglasses</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateAccessories({ sunglasses: undefined })}
                        className="h-7 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {SUNGLASSES_STYLES.map(({ style, name }) => (
                        <OptionButton
                          key={style}
                          selected={config.accessories.sunglasses?.style === style}
                          onClick={() => updateAccessories({ sunglasses: { style } })}
                          className="flex-1"
                        >
                          {name}
                        </OptionButton>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Accessories */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Other Accessories</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateAccessories({ watch: !config.accessories.watch })}
                        className={cn(
                          "p-3 rounded-lg border transition-all text-left flex items-center gap-2",
                          config.accessories.watch
                            ? "bg-primary/20 border-primary"
                            : "bg-card border-border hover:bg-accent"
                        )}
                      >
                        <span className="text-lg">⌚</span>
                        <div>
                          <div className="font-medium text-sm">Watch</div>
                          <div className="text-xs text-muted-foreground">Smart trader time</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => updateAccessories({ necklace: !config.accessories.necklace })}
                        className={cn(
                          "p-3 rounded-lg border transition-all text-left flex items-center gap-2",
                          config.accessories.necklace
                            ? "bg-primary/20 border-primary"
                            : "bg-card border-border hover:bg-accent"
                        )}
                      >
                        <span className="text-lg">📿</span>
                        <div>
                          <div className="font-medium text-sm">Chain</div>
                          <div className="text-xs text-muted-foreground">Gold chain drip</div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => updateAccessories({ headset: !config.accessories.headset })}
                        className={cn(
                          "p-3 rounded-lg border transition-all text-left flex items-center gap-2",
                          config.accessories.headset
                            ? "bg-primary/20 border-primary"
                            : "bg-card border-border hover:bg-accent"
                        )}
                      >
                        <span className="text-lg">🎧</span>
                        <div>
                          <div className="font-medium text-sm">Headset</div>
                          <div className="text-xs text-muted-foreground">Trading station ready</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </TabsContent>

                {/* Special Items Tab */}
                <TabsContent value="special" className="mt-0 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Trading Theme Items</Label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => updateSpecialItems({ 
                          bullHorns: !config.specialItems?.bullHorns,
                          bearEars: false 
                        })}
                        className={cn(
                          "p-4 rounded-lg border transition-all text-left flex items-center gap-3",
                          config.specialItems?.bullHorns
                            ? "bg-green-500/20 border-green-500"
                            : "bg-card border-border hover:bg-accent"
                        )}
                      >
                        <span className="text-2xl">🐂</span>
                        <div className="flex-1">
                          <div className="font-medium">Bull Horns</div>
                          <div className="text-sm text-muted-foreground">
                            Show your bullish spirit with golden horns
                          </div>
                        </div>
                        {config.specialItems?.bullHorns && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                            Equipped
                          </Badge>
                        )}
                      </button>
                      
                      <button
                        onClick={() => updateSpecialItems({ 
                          bearEars: !config.specialItems?.bearEars,
                          bullHorns: false 
                        })}
                        className={cn(
                          "p-4 rounded-lg border transition-all text-left flex items-center gap-3",
                          config.specialItems?.bearEars
                            ? "bg-red-500/20 border-red-500"
                            : "bg-card border-border hover:bg-accent"
                        )}
                      >
                        <span className="text-2xl">🐻</span>
                        <div className="flex-1">
                          <div className="font-medium">Bear Ears</div>
                          <div className="text-sm text-muted-foreground">
                            Embrace the bear market with fuzzy ears
                          </div>
                        </div>
                        {config.specialItems?.bearEars && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
                            Equipped
                          </Badge>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-start gap-3">
                      <Crown className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">More items coming soon!</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Unlock special items based on your trading achievements. 
                          Complete milestones to earn exclusive gear!
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Action Buttons */}
            <div className="p-4 border-t border-border flex justify-between">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Character
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
