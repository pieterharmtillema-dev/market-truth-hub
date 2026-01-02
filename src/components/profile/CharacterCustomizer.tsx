import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CharacterConfig, CHARACTER_PRESETS, checkUnlocks } from "./characterConfig";
import { CharacterRenderer } from "./CharacterRenderer";
import { RotateCw, User, Shirt, Watch, Sparkles, LayoutGrid, Lock, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CharacterCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CharacterConfig;
  onSave: (config: CharacterConfig) => Promise<void>;
  avatarUrl?: string | null;
  displayName?: string | null;
  totalTrades?: number;
  winRate?: number;
  streak?: number;
}

const SKIN_TONES = [
  '#F5D0A9', '#E3B778', '#D1A684', '#C68642',
  '#8D5524', '#6B4423', '#4A2511', '#2D1606'
];

const HAIR_COLORS = [
  '#2D1B0E', '#4A3728', '#8B4513', '#D2691E',
  '#FFD700', '#FFA500', '#C0C0C0', '#1a1a1a'
];

const EYE_COLORS = [
  '#4A90D9', '#2E5A88', '#6B8E23', '#8B4513',
  '#2F4F4F', '#4B0082', '#808080', '#000000'
];

const PRESET_COLORS = [
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Yellow', value: '#FBB F24' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#6B7280' },
];

export function CharacterCustomizer({
  open,
  onOpenChange,
  config,
  onSave,
  avatarUrl,
  displayName,
  totalTrades = 0,
  winRate = 0,
  streak = 0,
}: CharacterCustomizerProps) {
  const [previewConfig, setPreviewConfig] = useState<CharacterConfig>(config);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("body");
  const characterPreviewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const unlocks = checkUnlocks(totalTrades, winRate, streak);

  // Sync preview config when the config prop changes
  useEffect(() => {
    setPreviewConfig(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(previewConfig);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save character:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPreviewConfig(config);
  };

  const updateConfig = (updates: Partial<CharacterConfig>) => {
    setPreviewConfig(prev => ({ ...prev, ...updates }));
  };

  const loadPreset = (presetKey: string) => {
    const preset = CHARACTER_PRESETS[presetKey];
    if (preset) {
      setPreviewConfig(preset);
    }
  };

  const handleExport = async () => {
    if (!characterPreviewRef.current) return;

    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(characterPreviewRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${displayName || 'trader'}-character.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Character exported!",
          description: "Your character has been downloaded as an image.",
        });
      });
    } catch (error) {
      console.error('Failed to export character:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your character. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-cyan-400" />
            Customize Your Character
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Live Preview */}
          <div className="order-1 lg:order-2">
            <div className="sticky top-0">
              <div className="text-sm text-gray-400 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCw className="w-4 h-4" />
                  Live Preview
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              </div>
              <div
                ref={characterPreviewRef}
                className="bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-2xl border-2 border-cyan-400/30 p-8 flex items-center justify-center min-h-[400px]"
              >
                <div className="w-48 h-64">
                  <CharacterRenderer
                    config={previewConfig}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Customization Tabs */}
          <div className="order-2 lg:order-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="body" className="text-xs">Body</TabsTrigger>
                <TabsTrigger value="clothing" className="text-xs">Clothing</TabsTrigger>
                <TabsTrigger value="accessories" className="text-xs">Accessories</TabsTrigger>
                <TabsTrigger value="special" className="text-xs">Special</TabsTrigger>
                <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
              </TabsList>

              {/* Body Tab */}
              <TabsContent value="body" className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {/* Skin Tone */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Skin Tone</Label>
                  <div className="grid grid-cols-8 gap-2 mb-3">
                    {SKIN_TONES.map(tone => (
                      <button
                        key={tone}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all hover:scale-110",
                          previewConfig.skinTone === tone ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-gray-600"
                        )}
                        style={{ backgroundColor: tone }}
                        onClick={() => updateConfig({ skinTone: tone })}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewConfig.skinTone}
                      onChange={(e) => updateConfig({ skinTone: e.target.value })}
                      className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
                    />
                    <span className="text-xs text-gray-400">Custom hex: {previewConfig.skinTone}</span>
                  </div>
                </div>

                {/* Hair Style */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Hair Style</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['short', 'medium', 'long', 'buzz', 'bald', 'mohawk', 'ponytail', 'afro'] as const).map(style => (
                      <button
                        key={style}
                        className={cn(
                          "p-2 rounded-lg border-2 transition-all text-xs capitalize",
                          previewConfig.face?.hairStyle === style
                            ? "border-cyan-400 bg-cyan-400/10"
                            : "border-gray-700 hover:border-gray-600"
                        )}
                        onClick={() => updateConfig({ 
                          face: { ...previewConfig.face, hairStyle: style } as CharacterConfig['face']
                        })}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair Color */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Hair Color</Label>
                  <div className="grid grid-cols-8 gap-2 mb-3">
                    {HAIR_COLORS.map(color => (
                      <button
                        key={color}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all hover:scale-110",
                          previewConfig.face?.hairColor === color ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-gray-600"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => updateConfig({ 
                          face: { ...previewConfig.face, hairColor: color } as CharacterConfig['face']
                        })}
                      />
                    ))}
                  </div>
                </div>

                {/* Eye Color */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Eye Color</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {EYE_COLORS.map(color => (
                      <button
                        key={color}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all hover:scale-110",
                          previewConfig.face?.eyeColor === color ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-gray-600"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => updateConfig({ 
                          face: { ...previewConfig.face, eyeColor: color } as CharacterConfig['face']
                        })}
                      />
                    ))}
                  </div>
                </div>

                {/* Facial Hair */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Facial Hair</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['none', 'stubble', 'beard', 'goatee', 'mustache'] as const).map(style => (
                      <button
                        key={style}
                        className={cn(
                          "p-2 rounded-lg border-2 transition-all text-xs capitalize",
                          previewConfig.face?.facialHair === style
                            ? "border-cyan-400 bg-cyan-400/10"
                            : "border-gray-700 hover:border-gray-600"
                        )}
                        onClick={() => updateConfig({ 
                          face: { ...previewConfig.face, facialHair: style } as CharacterConfig['face']
                        })}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Type */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Body Type</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['slim', 'athletic', 'broad'] as const).map(type => (
                      <button
                        key={type}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          previewConfig.bodyType === type
                            ? "border-cyan-400 bg-cyan-400/10"
                            : "border-gray-700 hover:border-gray-600"
                        )}
                        onClick={() => updateConfig({ bodyType: type })}
                      >
                        <div className="text-sm font-medium capitalize">{type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Height: {previewConfig.height.toFixed(2)}x
                  </Label>
                  <Slider
                    value={[previewConfig.height]}
                    onValueChange={([value]) => updateConfig({ height: value })}
                    min={0.85}
                    max={1.15}
                    step={0.05}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Short (0.85x)</span>
                    <span>Tall (1.15x)</span>
                  </div>
                </div>
              </TabsContent>

              {/* Clothing Tab */}
              <TabsContent value="clothing" className="space-y-6">
                {/* Tops */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                    <Shirt className="w-4 h-4" />
                    Top
                  </Label>
                  <div className="space-y-3">
                    <Select
                      value={previewConfig.top.type}
                      onValueChange={(value: any) => updateConfig({ top: { ...previewConfig.top, type: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tshirt">T-Shirt</SelectItem>
                        <SelectItem value="hoodie">Hoodie</SelectItem>
                        <SelectItem value="business">Business Shirt</SelectItem>
                        <SelectItem value="suit">Suit Jacket</SelectItem>
                        <SelectItem value="tank">Tank Top</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>

                    <ColorPicker
                      label="Color"
                      value={previewConfig.top.color}
                      onChange={(color) => updateConfig({ top: { ...previewConfig.top, color } })}
                    />

                    {previewConfig.top.type === 'tshirt' && (
                      <div>
                        <Label className="text-xs text-gray-400 mb-2 block">Graphic</Label>
                        <Select
                          value={previewConfig.top.graphic || 'none'}
                          onValueChange={(value: any) => updateConfig({ top: { ...previewConfig.top, graphic: value } })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="bull">Bull</SelectItem>
                            <SelectItem value="bear">Bear</SelectItem>
                            <SelectItem value="moon">Moon</SelectItem>
                            <SelectItem value="diamond">Diamond</SelectItem>
                            <SelectItem value="chart">Chart</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottoms */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Bottom</Label>
                  <div className="space-y-3">
                    <Select
                      value={previewConfig.bottom.type}
                      onValueChange={(value: any) => updateConfig({ bottom: { ...previewConfig.bottom, type: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jeans">Jeans</SelectItem>
                        <SelectItem value="dress">Dress Pants</SelectItem>
                        <SelectItem value="shorts">Shorts</SelectItem>
                        <SelectItem value="joggers">Joggers</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>

                    <ColorPicker
                      label="Color"
                      value={previewConfig.bottom.color}
                      onChange={(color) => updateConfig({ bottom: { ...previewConfig.bottom, color } })}
                    />
                  </div>
                </div>

                {/* Shoes */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Shoes</Label>
                  <div className="space-y-3">
                    <Select
                      value={previewConfig.shoes.type}
                      onValueChange={(value: any) => updateConfig({ shoes: { ...previewConfig.shoes, type: value } })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sneakers">Sneakers</SelectItem>
                        <SelectItem value="dress">Dress Shoes</SelectItem>
                        <SelectItem value="boots">Boots</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>

                    <ColorPicker
                      label="Color"
                      value={previewConfig.shoes.color}
                      onChange={(color) => updateConfig({ shoes: { ...previewConfig.shoes, color } })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Accessories Tab */}
              <TabsContent value="accessories" className="space-y-4">
                {/* Sunglasses */}
                <AccessoryCard
                  title="Sunglasses"
                  enabled={previewConfig.accessories.sunglasses?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      sunglasses: enabled ? {
                        enabled: true,
                        style: previewConfig.accessories.sunglasses?.style || 'round',
                        color: previewConfig.accessories.sunglasses?.color || '#000000'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.sunglasses?.enabled && (
                    <div className="space-y-3 mt-3">
                      <Select
                        value={previewConfig.accessories.sunglasses.style}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            sunglasses: { ...previewConfig.accessories.sunglasses!, style: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aviator">Aviator</SelectItem>
                          <SelectItem value="round">Round</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="sport">Sport</SelectItem>
                        </SelectContent>
                      </Select>
                      <ColorPicker
                        value={previewConfig.accessories.sunglasses.color}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            sunglasses: { ...previewConfig.accessories.sunglasses!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Watch */}
                <AccessoryCard
                  title="Watch"
                  enabled={previewConfig.accessories.watch?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      watch: enabled ? {
                        enabled: true,
                        style: previewConfig.accessories.watch?.style || 'analog',
                        color: previewConfig.accessories.watch?.color || '#C0C0C0'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.watch?.enabled && (
                    <div className="space-y-3 mt-3">
                      <Select
                        value={previewConfig.accessories.watch.style}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            watch: { ...previewConfig.accessories.watch!, style: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="digital">Digital</SelectItem>
                          <SelectItem value="analog">Analog</SelectItem>
                          <SelectItem value="smart">Smart Watch</SelectItem>
                        </SelectContent>
                      </Select>
                      <ColorPicker
                        value={previewConfig.accessories.watch.color}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            watch: { ...previewConfig.accessories.watch!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Necklace */}
                <AccessoryCard
                  title="Necklace"
                  enabled={previewConfig.accessories.necklace?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      necklace: enabled ? {
                        enabled: true,
                        type: previewConfig.accessories.necklace?.type || 'chain',
                        color: previewConfig.accessories.necklace?.color || '#FFD700'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.necklace?.enabled && (
                    <div className="space-y-3 mt-3">
                      <Select
                        value={previewConfig.accessories.necklace.type}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            necklace: { ...previewConfig.accessories.necklace!, type: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chain">Chain</SelectItem>
                          <SelectItem value="pendant">Pendant</SelectItem>
                        </SelectContent>
                      </Select>
                      <ColorPicker
                        value={previewConfig.accessories.necklace.color || '#FFD700'}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            necklace: { ...previewConfig.accessories.necklace!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Backpack */}
                <AccessoryCard
                  title="Backpack"
                  enabled={previewConfig.accessories.backpack?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      backpack: enabled ? {
                        enabled: true,
                        color: previewConfig.accessories.backpack?.color || '#06B6D4'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.backpack?.enabled && (
                    <div className="mt-3">
                      <ColorPicker
                        value={previewConfig.accessories.backpack.color}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            backpack: { ...previewConfig.accessories.backpack!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Headset */}
                <AccessoryCard
                  title="Headset"
                  enabled={previewConfig.accessories.headset?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      headset: enabled ? {
                        enabled: true,
                        style: previewConfig.accessories.headset?.style || 'over-ear'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.headset?.enabled && (
                    <div className="mt-3">
                      <Select
                        value={previewConfig.accessories.headset.style}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            headset: { ...previewConfig.accessories.headset!, style: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="over-ear">Over-Ear</SelectItem>
                          <SelectItem value="earbuds">Earbuds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </AccessoryCard>

                {/* Belt */}
                <AccessoryCard
                  title="Belt"
                  enabled={previewConfig.accessories.belt?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      belt: enabled ? {
                        enabled: true,
                        color: previewConfig.accessories.belt?.color || '#000000'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.belt?.enabled && (
                    <div className="mt-3">
                      <ColorPicker
                        value={previewConfig.accessories.belt.color}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            belt: { ...previewConfig.accessories.belt!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>
              </TabsContent>

              {/* Special Tab */}
              <TabsContent value="special" className="space-y-4">
                <div className="text-sm text-gray-400 mb-4">
                  Unlock special items by achieving trading milestones!
                </div>

                <SpecialItemCard
                  title="Bull Horns"
                  description="Win streak of 5+"
                  unlocked={unlocks.bullHorns}
                  enabled={previewConfig.special?.bullHorns || false}
                  onToggle={(enabled) => updateConfig({
                    special: { ...previewConfig.special, bullHorns: enabled }
                  })}
                />

                <SpecialItemCard
                  title="Bear Ears"
                  description="Always available"
                  unlocked={unlocks.bearEars}
                  enabled={previewConfig.special?.bearEars || false}
                  onToggle={(enabled) => updateConfig({
                    special: { ...previewConfig.special, bearEars: enabled }
                  })}
                />

                <SpecialItemCard
                  title="Diamond Hands"
                  description="Complete 100+ trades"
                  unlocked={unlocks.diamondHands}
                  enabled={previewConfig.special?.diamondHands || false}
                  onToggle={(enabled) => updateConfig({
                    special: { ...previewConfig.special, diamondHands: enabled }
                  })}
                />

                <SpecialItemCard
                  title="Rocket Boots"
                  description="Achieve 50%+ win rate"
                  unlocked={unlocks.rocketBoots}
                  enabled={previewConfig.special?.rocketBoots || false}
                  onToggle={(enabled) => updateConfig({
                    special: { ...previewConfig.special, rocketBoots: enabled }
                  })}
                />

                <SpecialItemCard
                  title="Chart Hat"
                  description="Complete 1000+ trades"
                  unlocked={unlocks.chartHat}
                  enabled={previewConfig.special?.chartHat || false}
                  onToggle={(enabled) => updateConfig({
                    special: { ...previewConfig.special, chartHat: enabled }
                  })}
                />
              </TabsContent>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <PresetCard
                    title="Classic Trader"
                    onSelect={() => loadPreset('classicTrader')}
                  />
                  <PresetCard
                    title="Day Trader"
                    onSelect={() => loadPreset('dayTrader')}
                  />
                  <PresetCard
                    title="Bull Gang"
                    onSelect={() => loadPreset('bullGang')}
                  />
                  <PresetCard
                    title="Bear Mode"
                    onSelect={() => loadPreset('bearMode')}
                  />
                  <PresetCard
                    title="Crypto Degen"
                    onSelect={() => loadPreset('cryptoDegen')}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Character"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for color picker
function ColorPicker({
  label,
  value,
  onChange,
  compact = false
}: {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      {label && <Label className="text-xs text-gray-400 mb-2 block">{label}</Label>}
      <div className="space-y-2">
        <div className="grid grid-cols-9 gap-1">
          {PRESET_COLORS.map(({ name, value: presetValue }) => (
            <button
              key={presetValue}
              className={cn(
                compact ? "w-6 h-6" : "w-8 h-8",
                "rounded border-2 transition-all hover:scale-110",
                value === presetValue ? "border-cyan-400 ring-2 ring-cyan-400/50" : "border-gray-600"
              )}
              style={{ backgroundColor: presetValue }}
              onClick={() => onChange(presetValue)}
              title={name}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-8 rounded border border-gray-600 cursor-pointer"
          />
          <span className="text-xs text-gray-400">{value}</span>
        </div>
      </div>
    </div>
  );
}

// Helper component for accessory cards
function AccessoryCard({
  title,
  enabled,
  onToggle,
  children
}: {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "p-4 rounded-lg border-2 transition-all",
      enabled ? "border-cyan-400/50 bg-cyan-400/5" : "border-gray-700"
    )}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {children}
    </div>
  );
}

// Helper component for special item cards
function SpecialItemCard({
  title,
  description,
  unlocked,
  enabled,
  onToggle
}: {
  title: string;
  description: string;
  unlocked: boolean;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className={cn(
      "p-4 rounded-lg border-2 transition-all",
      !unlocked && "opacity-50",
      enabled && unlocked ? "border-cyan-400/50 bg-cyan-400/5" : "border-gray-700"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{title}</Label>
          {!unlocked && <Lock className="w-4 h-4 text-gray-500" />}
          {unlocked && <Sparkles className="w-4 h-4 text-cyan-400" />}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={!unlocked}
        />
      </div>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

// Helper component for preset cards
function PresetCard({
  title,
  onSelect
}: {
  title: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="p-4 rounded-lg border-2 border-gray-700 hover:border-cyan-400/50 hover:bg-cyan-400/5 transition-all text-left"
    >
      <div className="text-sm font-medium mb-2">{title}</div>
      <Button size="sm" variant="outline" className="w-full">
        Select
      </Button>
    </button>
  );
}
