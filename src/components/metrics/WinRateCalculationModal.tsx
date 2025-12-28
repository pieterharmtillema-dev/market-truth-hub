import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3 } from "lucide-react";

interface WinRateCalculationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WinRateCalculationModal({ open, onOpenChange }: WinRateCalculationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[550px] bg-[#1a2028] border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#4dd4ac]/10 border border-[#4dd4ac]/20">
              <BarChart3 className="h-5 w-5 text-[#4dd4ac]" />
            </div>
            <DialogTitle className="text-xl font-semibold text-white">
              How Win Rate is Calculated
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Step 1 */}
          <CalculationStep
            stepNumber={1}
            title="Set Your Risk Per Trade"
            description="Define how much you risk on each trade (e.g., $100). This becomes 1R."
          />

          {/* Step 2 */}
          <CalculationStep
            stepNumber={2}
            title="Measure Each Trade Outcome"
            description="Win = profit more than your risk (positive R). Loss = less than your risk (negative R)."
            formula="Example: +$200 profit with $100 risk = +2R (Win)"
          />

          {/* Step 3 */}
          <CalculationStep
            stepNumber={3}
            title="Calculate Win Rate"
            description="Divide winning trades by total trades, then multiply by 100."
            formula="Win Rate = (Wins ÷ Total Trades) × 100%"
          />

          {/* Step 4 */}
          <CalculationStep
            stepNumber={4}
            title="Unlock Official Rating at 30 Trades"
            description="You need 30+ trades for a verified rating. Pre-rating shows your current progress."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Component
interface CalculationStepProps {
  stepNumber: number;
  title: string;
  description: string;
  formula?: string;
}

function CalculationStep({ stepNumber, title, description, formula }: CalculationStepProps) {
  return (
    <div className="space-y-2">
      {/* Step Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-[#4dd4ac]/20 border border-[#4dd4ac]/30">
          <span className="text-xs font-bold text-[#4dd4ac]">{stepNumber}</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Formula Box */}
      {formula && (
        <div className="ml-9 mt-2 bg-[#4dd4ac]/5 border-l-2 border-[#4dd4ac] rounded-r px-3 py-2">
          <code className="text-xs font-mono text-[#4dd4ac]">
            {formula}
          </code>
        </div>
      )}
    </div>
  );
}
