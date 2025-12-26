import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit2, User, Camera, Smile, Upload, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Available avatar icons - expanded character set
const avatarIcons = [
  '👤', '🧑‍💻', '👨‍💼', '👩‍💼', '🧙‍♂️', '🧙‍♀️', '🥷', '🦹', '🦸',
  '🦊', '🐱', '🐶', '🦁', '🐯', '🐻', '🐼', '🐨', '🐵', '🦄', '🐉', '🦅',
  '🎯', '🚀', '💎', '⚡', '🔥', '🌟', '👑', '🏆', '💰', '📈', '🎰', '🃏',
  '🤖', '👾', '🎮', '🕹️', '💀', '👽', '🧠', '👁️', '🌙', '☀️', '⭐', '✨'
];

interface ProfileEditDialogProps {
  userId: string;
  currentName: string | null;
  currentAvatarUrl: string | null;
  currentBio: string | null;
  onProfileUpdated: (data: { display_name: string; avatar_url: string; bio: string }) => void;
}

export function ProfileEditDialog({ 
  userId, 
  currentName, 
  currentAvatarUrl, 
  currentBio,
  onProfileUpdated 
}: ProfileEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(currentName || '');
  const [bio, setBio] = useState(currentBio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
  const [avatarType, setAvatarType] = useState<'icon' | 'url' | 'upload'>(
    currentAvatarUrl?.startsWith('emoji:') ? 'icon' : 'url'
  );
  const [selectedIcon, setSelectedIcon] = useState(
    currentAvatarUrl?.startsWith('emoji:') ? currentAvatarUrl.replace('emoji:', '') : '👤'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setAvatarType('upload');
      toast.success('Avatar uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalAvatarUrl = avatarType === 'icon' ? `emoji:${selectedIcon}` : avatarUrl || '';
      
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          bio: bio,
        })
        .eq('user_id', userId);

      if (error) throw error;

      onProfileUpdated({
        display_name: displayName,
        avatar_url: finalAvatarUrl,
        bio: bio,
      });
      
      toast.success('Profile updated successfully');
      setOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 gap-2">
          <Edit2 className="w-4 h-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label>Profile Picture</Label>
            
            {/* Avatar Preview */}
            <div className="flex justify-center">
              <Avatar className="w-24 h-24 border-4 border-border">
                {avatarType === 'icon' ? (
                  <AvatarFallback className="text-4xl bg-primary/10">
                    {selectedIcon}
                  </AvatarFallback>
                ) : avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {displayName ? getInitials(displayName) : <User className="w-8 h-8" />}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Avatar Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={avatarType === 'icon' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setAvatarType('icon')}
              >
                <Smile className="w-4 h-4" />
                Icon
              </Button>
              <Button
                type="button"
                variant={avatarType === 'upload' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                NFT / Upload
              </Button>
              <Button
                type="button"
                variant={avatarType === 'url' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => setAvatarType('url')}
              >
                <Image className="w-4 h-4" />
                URL
              </Button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Icon Picker */}
            {avatarType === 'icon' && (
              <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                {avatarIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all",
                      selectedIcon === icon
                        ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            {/* URL Input */}
            {avatarType === 'url' && (
              <div className="space-y-2">
                <Input
                  placeholder="https://example.com/avatar.jpg or NFT URL"
                  value={avatarUrl.startsWith('emoji:') ? '' : avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Paste any image URL, OpenSea NFT link, or IPFS URL
                </p>
              </div>
            )}

            {/* Upload preview info */}
            {avatarType === 'upload' && avatarUrl && !avatarUrl.startsWith('emoji:') && (
              <div className="text-xs text-muted-foreground text-center">
                ✓ Image uploaded successfully
              </div>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
