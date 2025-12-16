import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExplanationDialogProps {
  predictionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ExplanationDialog({ predictionId, open, onOpenChange, onSaved }: ExplanationDialogProps) {
  const [explanation, setExplanation] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!predictionId || !explanation.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("predictions")
        .update({
          explanation: explanation.trim(),
          explanation_public: isPublic,
        })
        .eq("id", predictionId);

      if (error) throw error;

      toast.success("Explanation saved");
      onOpenChange(false);
      setExplanation("");
      setIsPublic(false);
      onSaved();
    } catch (err) {
      console.error("Error saving explanation:", err);
      toast.error("Failed to save explanation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trade Explanation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="explanation">Your reasoning or analysis</Label>
            <Textarea
              id="explanation"
              placeholder="Explain your trade setup, reasoning, or lessons learned..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="mt-2 min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {explanation.length}/1000 characters
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="public-toggle" className="font-medium">
                Make Public
              </Label>
              <p className="text-xs text-muted-foreground">
                Others can see your explanation
              </p>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !explanation.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
