import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileEditDialogProps {
  userId: string;
  currentName: string | null;
  currentAvatarUrl: string | null;
  currentBio: string | null;
  onProfileUpdated: (data: { display_name: string; avatar_url: string; bio: string }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProfileEditDialog({
  userId,
  currentName,
  currentAvatarUrl,
  currentBio,
  onProfileUpdated,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ProfileEditDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset dialog state when closed
  useEffect(() => {
    if (open) return;

    setDisplayName(currentName ?? "");
    setBio(currentBio ?? "");
    setEditingName(false);
    setPassword("");
  }, [open, currentName, currentBio]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Prevent empty name
      if (editingName && !displayName.trim()) {
        toast.error("Display name cannot be empty");
        setIsSaving(false);
        return;
      }

      // Re-auth only if name changed
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
          bio,
        })
        .eq("user_id", userId);

      if (error) throw error;

      onProfileUpdated({
        display_name: displayName,
        avatar_url: currentAvatarUrl || "",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button
            variant="default"
            className="gap-1 sm:gap-1.5 bg-primary hover:bg-primary/90 h-7 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-xs"
          >
            <Edit2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
            Edit Profile
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>

            {!editingName ? (
              <div className="flex items-center justify-between p-3 rounded-md border bg-muted/50">
                <span className="text-sm font-medium">{displayName || "No name set"}</span>
                <Button size="sm" variant="outline" onClick={() => setEditingName(true)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
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
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about yourself..."
              className="resize-none"
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
