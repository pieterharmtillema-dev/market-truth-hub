import { useState, useRef, useCallback, useEffect } from "react";
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
  currentAvatarUrl: string | null; // ✅ ADD THIS
  currentBio: string | null;
  onProfileUpdated: (data: { display_name: string; avatar_url: string; bio: string }) => void;
}

export function ProfileEditDialog({
  userId,
  currentName,
  currentAvatarUrl,
  currentBio,
  onProfileUpdated,
}: ProfileEditDialogProps) {
  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */

  const [open, setOpen] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [premiumConfig, setPremiumConfig] = useState<PremiumAvatarConfig>(DEFAULT_PREMIUM_CONFIG);

  const [avatarEditorKey, setAvatarEditorKey] = useState(0);

  const [editingName, setEditingName] = useState(false);
  const [password, setPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const deriveAvatarState = (url: string | null) => {
    if (url?.startsWith("premium:")) {
      return {
        premiumConfig: parsePremiumConfig(url),
      };
    }

    return {
      premiumConfig: DEFAULT_PREMIUM_CONFIG,
    };
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  /* ------------------------------------------------------------------ */
  /* Reset dialog state on open                                          */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (open) return;

    // Reset text fields
    setDisplayName(currentName ?? "");
    setBio(currentBio ?? "");

    // Reset avatar state from saved profile
    const derived = deriveAvatarState(currentAvatarUrl);
    setPremiumConfig(derived.premiumConfig);

    // Force avatar editor to fully remount
    setAvatarEditorKey((prev) => prev + 1);
  }, [open, currentName, currentBio, currentAvatarUrl]);

  /* ------------------------------------------------------------------ */
  /* Handlers                                                           */
  /* ------------------------------------------------------------------ */

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
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const finalAvatarUrl = stringifyPremiumConfig(premiumConfig);

      // ❗ Prevent empty name
      if (editingName && !displayName.trim()) {
        toast.error("Display name cannot be empty");
        setIsSaving(false);
        return;
      }

      // 🔐 Re-auth only if name changed
      if (editingName && displayName !== currentName) {
        if (!password) {
          toast.error("Enter your password to change your name");
          setIsSaving(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
          toast.error("Authentication error");
          setIsSaving(false);
          return;
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });

        if (authError) {
          toast.error("Incorrect password");
          setIsSaving(false);
          return;
        }
      }

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

  /* ------------------------------------------------------------------ */
  /* JSX                                                                */
  /* ------------------------------------------------------------------ */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent
        className="
    w-[90vw]
    max-w-[1000px]
    h-[85vh]
    p-0
    overflow-hidden
  "
      >
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

       
            <div>
              <PremiumAvatarEditor
                key={avatarEditorKey}
                initialConfig={premiumConfig}
                onConfigChange={handlePremiumConfigChange}
              />

              <div className="mt-2 text-xs text-muted-foreground opacity-70 text-center">
                🖼 NFT avatars coming soon
              </div>
            </div>
          

          {/* Display Name */}
          <div className="space-y-2">
            <Label>Display Name</Label>

            {!editingName ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">{displayName || "No name set"}</span>
                <Button size="sm" variant="outline" onClick={() => setEditingName(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <Input
                  type="password"
                  placeholder="Enter password to confirm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingName(false);
                    setDisplayName(currentName || "");
                    setPassword("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Bio */}
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
