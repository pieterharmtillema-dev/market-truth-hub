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

const NOSE_SHAPES = [
  { value: 'soft', label: 'Soft' },
  { value: 'straight', label: 'Straight' },
  { value: 'sharp', label: 'Sharp' },
];

const MOUTH_SHAPES = [
  { value: 'thin', label: 'Thin' },
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
];

const EXPRESSIONS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'focused', label: 'Focused' },
  { value: 'smile', label: 'Smile' },
  { value: 'smirk', label: 'Smirk' },
];

const HAIR_PARTS = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const HAIR_TEXTURES = [
  { value: 'straight', label: 'Straight' },
  { value: 'wavy', label: 'Wavy' },
  { value: 'curly', label: 'Curly' },
];

const HAIR_ACCESSORIES = [
  { value: 'none', label: 'None' },
  { value: 'clip', label: 'Clip' },
  { value: 'bandana', label: 'Bandana' },
];

const TOP_PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'pinstripe', label: 'Pinstripe' },
  { value: 'grid', label: 'Grid' },
  { value: 'wave', label: 'Wave' },
];

const PATCH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'bull', label: 'Bull' },
  { value: 'bear', label: 'Bear' },
  { value: 'trax', label: 'TRAX' },
];

const TIE_STYLES = [
  { value: 'classic', label: 'Classic' },
  { value: 'slim', label: 'Slim' },
];

const POCKET_FOLDS = [
  { value: 'flat', label: 'Flat' },
  { value: 'point', label: 'Point' },
];

const OUTERWEAR_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'jacket', label: 'Jacket' },
  { value: 'vest', label: 'Vest' },
];

const OUTERWEAR_PATTERNS = [
  { value: 'none', label: 'None' },
  { value: 'pinstripe', label: 'Pinstripe' },
  { value: 'grid', label: 'Grid' },
];

const LAPEL_PIN_STYLES = [
  { value: 'bull', label: 'Bull' },
  { value: 'bear', label: 'Bear' },
  { value: 'trax', label: 'TRAX' },
];

const LANYARD_BADGES = [
  { value: 'id', label: 'ID' },
  { value: 'vip', label: 'VIP' },
  { value: 'press', label: 'Press' },
];

const HANDHELD_TYPES = [
  { value: 'phone', label: 'Phone' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'coffee', label: 'Coffee' },
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

  const updateFace = (updates: Partial<CharacterConfig['face']>) => {
    updateConfig({
      face: { ...previewConfig.face, ...updates } as CharacterConfig['face'],
    });
  };

  const updateTop = (updates: Partial<CharacterConfig['top']>) => {
    updateConfig({
      top: { ...previewConfig.top, ...updates },
    });
  };

  const updateOuterwear = (updates: Partial<CharacterConfig['outerwear']>) => {
    updateConfig({
      outerwear: { ...previewConfig.outerwear, ...updates } as CharacterConfig['outerwear'],
    });
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

                {/* Hair Details */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Hair Details</Label>
                  <div className="space-y-3">
                    <Select
                      value={previewConfig.face?.hairPart || 'none'}
                      onValueChange={(value: any) => updateFace({ hairPart: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Part" />
                      </SelectTrigger>
                      <SelectContent>
                        {HAIR_PARTS.map((part) => (
                          <SelectItem key={part.value} value={part.value}>{part.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={previewConfig.face?.hairTexture || 'straight'}
                      onValueChange={(value: any) => updateFace({ hairTexture: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Texture" />
                      </SelectTrigger>
                      <SelectContent>
                        {HAIR_TEXTURES.map((texture) => (
                          <SelectItem key={texture.value} value={texture.value}>{texture.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-400">Highlights</Label>
                      <Switch
                        checked={previewConfig.face?.hairHighlights || false}
                        onCheckedChange={(checked) => updateFace({ hairHighlights: checked })}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block">
                        Fade: {(previewConfig.face?.hairFade ?? 0).toFixed(2)}
                      </Label>
                      <Slider
                        value={[previewConfig.face?.hairFade ?? 0]}
                        onValueChange={([value]) => updateFace({ hairFade: value })}
                        min={0}
                        max={1}
                        step={0.05}
                        className="mb-2"
                      />
                    </div>

                    <Select
                      value={previewConfig.face?.hairAccessory?.type || 'none'}
                      onValueChange={(value: any) => updateFace({
                        hairAccessory: {
                          type: value,
                          color: previewConfig.face?.hairAccessory?.color || '#1a1a1a',
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Accessory" />
                      </SelectTrigger>
                      <SelectContent>
                        {HAIR_ACCESSORIES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {previewConfig.face?.hairAccessory?.type && previewConfig.face?.hairAccessory?.type !== 'none' && (
                      <ColorPicker
                        value={previewConfig.face?.hairAccessory?.color || '#1a1a1a'}
                        onChange={(color) => updateFace({
                          hairAccessory: { ...previewConfig.face?.hairAccessory, color }
                        })}
                        compact
                      />
                    )}
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

                {/* Eye Size */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Eye Size: {(previewConfig.face?.eyeSize ?? 1).toFixed(2)}x
                  </Label>
                  <Slider
                    value={[previewConfig.face?.eyeSize ?? 1]}
                    onValueChange={([value]) => updateFace({ eyeSize: value })}
                    min={0.8}
                    max={1.4}
                    step={0.05}
                  />
                </div>

                {/* Eyebrow Size */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Eyebrow Thickness: {(previewConfig.face?.eyebrowSize ?? 1).toFixed(2)}x
                  </Label>
                  <Slider
                    value={[previewConfig.face?.eyebrowSize ?? 1]}
                    onValueChange={([value]) => updateFace({ eyebrowSize: value })}
                    min={0.6}
                    max={1.6}
                    step={0.05}
                  />
                </div>

                {/* Nose Shape */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Nose Shape</Label>
                  <Select
                    value={previewConfig.face?.nose || 'straight'}
                    onValueChange={(value: any) => updateFace({ nose: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOSE_SHAPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mouth Shape */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Mouth Shape</Label>
                  <Select
                    value={previewConfig.face?.mouth || 'normal'}
                    onValueChange={(value: any) => updateFace({ mouth: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOUTH_SHAPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expression */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Expression</Label>
                  <Select
                    value={previewConfig.face?.expression || 'neutral'}
                    onValueChange={(value: any) => updateFace({ expression: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPRESSIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skin Details */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Skin Details</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center justify-between border border-gray-700 rounded-lg px-3 py-2">
                      <Label className="text-xs text-gray-400">Scars</Label>
                      <Switch
                        checked={previewConfig.face?.skinDetails?.scars || false}
                        onCheckedChange={(checked) => updateFace({
                          skinDetails: { ...previewConfig.face?.skinDetails, scars: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between border border-gray-700 rounded-lg px-3 py-2">
                      <Label className="text-xs text-gray-400">Wrinkles</Label>
                      <Switch
                        checked={previewConfig.face?.skinDetails?.wrinkles || false}
                        onCheckedChange={(checked) => updateFace({
                          skinDetails: { ...previewConfig.face?.skinDetails, wrinkles: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between border border-gray-700 rounded-lg px-3 py-2">
                      <Label className="text-xs text-gray-400">Blush</Label>
                      <Switch
                        checked={previewConfig.face?.skinDetails?.blush || false}
                        onCheckedChange={(checked) => updateFace({
                          skinDetails: { ...previewConfig.face?.skinDetails, blush: checked }
                        })}
                      />
                    </div>
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
                      onChange={(color) => updateTop({ color })}
                    />

                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block">Pattern</Label>
                      <Select
                        value={previewConfig.top.pattern || 'none'}
                        onValueChange={(value: any) => updateTop({ pattern: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOP_PATTERNS.map((pattern) => (
                            <SelectItem key={pattern.value} value={pattern.value}>{pattern.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block">Patch</Label>
                      <Select
                        value={previewConfig.top.patch || 'none'}
                        onValueChange={(value: any) => updateTop({ patch: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PATCH_TYPES.map((patch) => (
                            <SelectItem key={patch.value} value={patch.value}>{patch.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {previewConfig.top.patch && previewConfig.top.patch !== 'none' && (
                        <div className="mt-3">
                          <ColorPicker
                            value={previewConfig.top.patchColor || '#FBBF24'}
                            onChange={(color) => updateTop({ patchColor: color })}
                            compact
                          />
                        </div>
                      )}
                    </div>

                    {previewConfig.top.type === 'tshirt' && (
                      <div>
                        <Label className="text-xs text-gray-400 mb-2 block">Graphic</Label>
                        <Select
                          value={previewConfig.top.graphic || 'none'}
                          onValueChange={(value: any) => updateTop({ graphic: value })}
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

                    {(previewConfig.top.type === 'business' || previewConfig.top.type === 'suit') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-gray-400">Tie</Label>
                          <Switch
                            checked={previewConfig.top.tie?.enabled || false}
                            onCheckedChange={(checked) => updateTop({
                              tie: {
                                enabled: checked,
                                color: previewConfig.top.tie?.color || '#1a1a1a',
                                style: previewConfig.top.tie?.style || 'classic',
                              }
                            })}
                          />
                        </div>
                        {previewConfig.top.tie?.enabled && (
                          <>
                            <Select
                              value={previewConfig.top.tie?.style || 'classic'}
                              onValueChange={(value: any) => updateTop({
                                tie: { ...previewConfig.top.tie!, style: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIE_STYLES.map((style) => (
                                  <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <ColorPicker
                              value={previewConfig.top.tie?.color || '#1a1a1a'}
                              onChange={(color) => updateTop({ tie: { ...previewConfig.top.tie!, color } })}
                              compact
                            />
                          </>
                        )}
                      </div>
                    )}

                    {(previewConfig.top.type === 'suit' || (previewConfig.outerwear?.type && previewConfig.outerwear.type !== 'none')) && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-gray-400">Pocket Square</Label>
                          <Switch
                            checked={previewConfig.top.pocketSquare?.enabled || false}
                            onCheckedChange={(checked) => updateTop({
                              pocketSquare: {
                                enabled: checked,
                                color: previewConfig.top.pocketSquare?.color || '#FFFFFF',
                                fold: previewConfig.top.pocketSquare?.fold || 'flat',
                              }
                            })}
                          />
                        </div>
                        {previewConfig.top.pocketSquare?.enabled && (
                          <>
                            <Select
                              value={previewConfig.top.pocketSquare?.fold || 'flat'}
                              onValueChange={(value: any) => updateTop({
                                pocketSquare: { ...previewConfig.top.pocketSquare!, fold: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POCKET_FOLDS.map((fold) => (
                                  <SelectItem key={fold.value} value={fold.value}>{fold.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <ColorPicker
                              value={previewConfig.top.pocketSquare?.color || '#FFFFFF'}
                              onChange={(color) => updateTop({ pocketSquare: { ...previewConfig.top.pocketSquare!, color } })}
                              compact
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Outerwear */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Outerwear</Label>
                  <div className="space-y-3">
                    <Select
                      value={previewConfig.outerwear?.type || 'none'}
                      onValueChange={(value: any) => updateOuterwear({
                        type: value,
                        color: previewConfig.outerwear?.color || '#1a1a1a',
                        trimColor: previewConfig.outerwear?.trimColor || '#E5E7EB',
                        pattern: previewConfig.outerwear?.pattern || 'none',
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTERWEAR_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {previewConfig.outerwear?.type && previewConfig.outerwear.type !== 'none' && (
                      <>
                        <ColorPicker
                          label="Color"
                          value={previewConfig.outerwear.color || '#1a1a1a'}
                          onChange={(color) => updateOuterwear({ color })}
                        />
                        <ColorPicker
                          label="Trim"
                          value={previewConfig.outerwear.trimColor || '#E5E7EB'}
                          onChange={(color) => updateOuterwear({ trimColor: color })}
                          compact
                        />
                        <div>
                          <Label className="text-xs text-gray-400 mb-2 block">Pattern</Label>
                          <Select
                            value={previewConfig.outerwear.pattern || 'none'}
                            onValueChange={(value: any) => updateOuterwear({ pattern: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OUTERWEAR_PATTERNS.map((pattern) => (
                                <SelectItem key={pattern.value} value={pattern.value}>{pattern.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
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

                {/* Ring */}
                <AccessoryCard
                  title="Ring"
                  enabled={previewConfig.accessories.ring?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      ring: enabled ? {
                        enabled: true,
                        color: previewConfig.accessories.ring?.color || '#FFD700'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.ring?.enabled && (
                    <div className="mt-3">
                      <ColorPicker
                        value={previewConfig.accessories.ring?.color || '#FFD700'}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            ring: { ...previewConfig.accessories.ring!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Bracelet */}
                <AccessoryCard
                  title="Bracelet"
                  enabled={previewConfig.accessories.bracelet?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      bracelet: enabled ? {
                        enabled: true,
                        color: previewConfig.accessories.bracelet?.color || '#C0C0C0'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.bracelet?.enabled && (
                    <div className="mt-3">
                      <ColorPicker
                        value={previewConfig.accessories.bracelet?.color || '#C0C0C0'}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            bracelet: { ...previewConfig.accessories.bracelet!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Lapel Pin */}
                <AccessoryCard
                  title="Lapel Pin"
                  enabled={previewConfig.accessories.lapelPin?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      lapelPin: enabled ? {
                        enabled: true,
                        style: previewConfig.accessories.lapelPin?.style || 'bull',
                        color: previewConfig.accessories.lapelPin?.color || '#FBBF24'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.lapelPin?.enabled && (
                    <div className="space-y-3 mt-3">
                      <Select
                        value={previewConfig.accessories.lapelPin?.style || 'bull'}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            lapelPin: { ...previewConfig.accessories.lapelPin!, style: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LAPEL_PIN_STYLES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ColorPicker
                        value={previewConfig.accessories.lapelPin?.color || '#FBBF24'}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            lapelPin: { ...previewConfig.accessories.lapelPin!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Lanyard */}
                <AccessoryCard
                  title="Lanyard"
                  enabled={previewConfig.accessories.lanyard?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      lanyard: enabled ? {
                        enabled: true,
                        color: previewConfig.accessories.lanyard?.color || '#06B6D4',
                        badge: previewConfig.accessories.lanyard?.badge || 'id'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.lanyard?.enabled && (
                    <div className="space-y-3 mt-3">
                      <Select
                        value={previewConfig.accessories.lanyard.badge || 'id'}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            lanyard: { ...previewConfig.accessories.lanyard!, badge: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANYARD_BADGES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ColorPicker
                        value={previewConfig.accessories.lanyard?.color || '#06B6D4'}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            lanyard: { ...previewConfig.accessories.lanyard!, color }
                          }
                        })}
                        compact
                      />
                    </div>
                  )}
                </AccessoryCard>

                {/* Handheld */}
                <AccessoryCard
                  title="Handheld"
                  enabled={previewConfig.accessories.handheld?.enabled || false}
                  onToggle={(enabled) => updateConfig({
                    accessories: {
                      ...previewConfig.accessories,
                      handheld: enabled ? {
                        enabled: true,
                        type: previewConfig.accessories.handheld?.type || 'phone',
                        color: previewConfig.accessories.handheld?.color || '#1a1a1a'
                      } : undefined
                    }
                  })}
                >
                  {previewConfig.accessories.handheld?.enabled && (
                    <div className="space-y-3 mt-3">
                      <Select
                        value={previewConfig.accessories.handheld?.type || 'phone'}
                        onValueChange={(value: any) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            handheld: { ...previewConfig.accessories.handheld!, type: value }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HANDHELD_TYPES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ColorPicker
                        value={previewConfig.accessories.handheld?.color || '#1a1a1a'}
                        onChange={(color) => updateConfig({
                          accessories: {
                            ...previewConfig.accessories,
                            handheld: { ...previewConfig.accessories.handheld!, color }
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
