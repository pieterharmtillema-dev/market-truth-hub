import { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2, Trash2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Attachment {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

interface TradeScreenshotsProps {
  positionId: number;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  disabled?: boolean;
}

export function TradeScreenshots({ 
  positionId, 
  attachments, 
  onAttachmentsChange,
  disabled 
}: TradeScreenshotsProps) {
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of Array.from(files)) {
        // Validate file type
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          toast({ 
            title: 'Invalid file type', 
            description: 'Only PNG, JPG, and WebP images are allowed',
            variant: 'destructive' 
          });
          continue;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({ 
            title: 'File too large', 
            description: 'Maximum file size is 5MB',
            variant: 'destructive' 
          });
          continue;
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = `${user.id}/${positionId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('trade-screenshots')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create attachment record
        const { error: dbError } = await supabase
          .from('trade_attachments')
          .insert({
            position_id: positionId,
            user_id: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type
          });

        if (dbError) throw dbError;
      }

      toast({ title: 'Screenshots uploaded successfully' });
      onAttachmentsChange();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: 'Upload failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    setDeleting(attachment.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('trade-screenshots')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('trade_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      toast({ title: 'Screenshot deleted' });
      onAttachmentsChange();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ 
        title: 'Delete failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setDeleting(null);
    }
  };

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('trade-screenshots')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  };

  const openLightbox = async (attachment: Attachment) => {
    try {
      const url = await getSignedUrl(attachment.file_path);
      setLightboxUrl(url);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast({ 
        title: 'Error', 
        description: 'Could not load image',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Screenshots</span>
        </div>
        {!disabled && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Attach charts or images to review trades visually and improve future decisions.
      </p>

      {/* Thumbnail grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((attachment) => (
            <ThumbnailCard
              key={attachment.id}
              attachment={attachment}
              onView={() => openLightbox(attachment)}
              onDelete={() => handleDelete(attachment)}
              deleting={deleting === attachment.id}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border">
          <Camera className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">No screenshots attached</p>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/90">
          <DialogTitle className="sr-only">Trade Screenshot</DialogTitle>
          <DialogDescription className="sr-only">Full size view of trade screenshot</DialogDescription>
          <button 
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxUrl && (
            <img 
              src={lightboxUrl} 
              alt="Trade screenshot"
              className="max-h-[80vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ThumbnailCardProps {
  attachment: Attachment;
  onView: () => void;
  onDelete: () => void;
  deleting: boolean;
  disabled?: boolean;
}

function ThumbnailCard({ attachment, onView, onDelete, deleting, disabled }: ThumbnailCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load thumbnail on mount
  useState(() => {
    const loadThumbnail = async () => {
      try {
        const { data } = await supabase.storage
          .from('trade-screenshots')
          .createSignedUrl(attachment.file_path, 3600);
        if (data) setThumbnailUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading thumbnail:', error);
      } finally {
        setLoading(false);
      }
    };
    loadThumbnail();
  });

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt={attachment.file_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera className="h-6 w-6 text-muted-foreground/50" />
        </div>
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20"
          onClick={onView}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        {!disabled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-red-500/50"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}