import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit2, User, Upload, Image, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PremiumAvatarEditor,
  PremiumAvatarConfig,
  DEFAULT_PREMIUM_CONFIG,
  stringifyPremiumConfig,
  parsePremiumConfig,
} from "./avatar";

interface ProfileEditDialogProps {
  userId: string;
  currentName: string | null;
  currentAvatarUrl: string | null;
  currentBio: string | null;
  onProfileUpdated: (data: { display_name: string; avatar_url: string; bio: string }) => void;
}

type AvatarType = "premium" | "upload" | "url";

export function ProfileEditDialog({
  userId,
  currentName,
  currentAvatarUrl,
  currentBio,
  onProfileUpdated,
}: ProfileEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(currentName || "");
  const [bio, setBio] = useState(currentBio || "");
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitialAvatarType = (): AvatarType => {
    if (currentAvatarUrl?.startsWith("avatar:")) return "premium";
    if (currentAvatarUrl?.startsWith("http")) return "upload";
    return "premium";
  };

  const [avatarType, setAvatarType] = useState<AvatarType>(getInitialAvatarType());

  const [premiumConfig, setPremiumConfig] = useState<PremiumAvatarConfig>(
    currentAvatarUrl?.startsWith("avatar:")
      ? parsePremiumConfig(currentAvatarUrl) || DEFAULT_PREMIUM_CONFIG
      : DEFAULT_PREMIUM_CONFIG,
  );

  const handlePremiumConfigChange = useCallback((config: PremiumAvatarConfig) => {
    setPremiumConfig(config);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setAvatarType("upload");
      toast.success("Avatar uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalAvatarUrl = avatarType === "premium" ? stringifyPremiumConfig(premiumConfig) : avatarUrl || "";

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          bio,
        })
        .eq("user_id", userId);

      if (error) throw error;

      onProfileUpdated({
        display_name: displayName,
        avatar_url: finalAvatarUrl,
        bio,
      });

      toast.success("Profile updated");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const renderAvatarPreview = () => {
    if ((avatarType === "upload" || avatarType === "url") && avatarUrl) {
      return (
        <Avatar className="w-24 h-24 border-4 border-border">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {displayName ? getInitials(displayName) : <User />}
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <Avatar className="w-24 h-24 border-4 border-border">
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
          {displayName ? getInitials(displayName) : <User />}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label>Avatar</Label>

            {avatarType !== "premium" && <div className="flex justify-center">{renderAvatarPreview()}</div>}

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={avatarType === "premium" ? "default" : "outline"}
                onClick={() => setAvatarType("premium")}
                className="gap-1"
              >
                <Sparkles className="w-4 h-4" />
                Premium
              </Button>

              <Button
                type="button"
                variant={avatarType === "upload" ? "default" : "outline"}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-1"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
              </Button>

              <Button
                type="button"
                variant={avatarType === "url" ? "default" : "outline"}
                onClick={() => setAvatarType("url")}
                className="gap-1"
              >
                <Image className="w-4 h-4" />
                NFT / URL
              </Button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            {avatarType === "premium" && (
              <PremiumAvatarEditor initialConfig={premiumConfig} onConfigChange={handlePremiumConfigChange} />
            )}

            {avatarType === "url" && (
              <div className="space-y-2">
                <Input
                  placeholder="NFT image URL or IPFS link"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Paste an NFT image URL, IPFS hash, or hosted image</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
