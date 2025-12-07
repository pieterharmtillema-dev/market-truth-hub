import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeVerificationBadgeProps {
  verified: boolean;
  authenticity_score: number;
  suspicious_flag: boolean;
  impossible_flag: boolean;
  verification_notes?: string;
  compact?: boolean;
}

export function TradeVerificationBadge({
  verified,
  authenticity_score,
  suspicious_flag,
  impossible_flag,
  verification_notes,
  compact = false
}: TradeVerificationBadgeProps) {
  // Determine display status
  let status: 'verified' | 'suspicious' | 'impossible' | 'unknown';
  let Icon: typeof CheckCircle2;
  let colorClass: string;
  let label: string;
  
  if (impossible_flag) {
    status = 'impossible';
    Icon = XCircle;
    colorClass = 'bg-red-500/10 text-red-500 border-red-500/20';
    label = 'Impossible';
  } else if (suspicious_flag) {
    status = 'suspicious';
    Icon = AlertTriangle;
    colorClass = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    label = 'Suspicious';
  } else if (verified) {
    status = 'verified';
    Icon = CheckCircle2;
    colorClass = 'bg-green-500/10 text-green-500 border-green-500/20';
    label = 'Verified';
  } else {
    status = 'unknown';
    Icon = HelpCircle;
    colorClass = 'bg-muted text-muted-foreground border-border';
    label = 'Unknown';
  }
  
  const scorePercent = Math.round(authenticity_score * 100);
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full', colorClass)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium flex items-center gap-1">
                <Shield className="h-3 w-3" />
                {label} ({scorePercent}%)
              </div>
              {verification_notes && (
                <p className="text-xs text-muted-foreground">{verification_notes}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn('gap-1 cursor-default', colorClass)}
          >
            <Icon className="h-3 w-3" />
            <span>{scorePercent}%</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">{label}</div>
            {verification_notes && (
              <p className="text-xs text-muted-foreground">{verification_notes}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface VerificationSummaryCardProps {
  total: number;
  verified: number;
  impossible: number;
  suspicious: number;
  averageScore: number;
}

export function VerificationSummaryCard({
  total,
  verified,
  impossible,
  suspicious,
  averageScore
}: VerificationSummaryCardProps) {
  const verificationRate = total > 0 ? (verified / total) * 100 : 0;
  
  return (
    <div className="bg-card/50 border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Trade Verification</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Verified</p>
          <p className="text-green-500 font-bold">{verificationRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{verified}/{total} trades</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Avg Score</p>
          <p className="font-bold">{Math.round(averageScore * 100)}%</p>
        </div>
        {impossible > 0 && (
          <div>
            <p className="text-muted-foreground text-xs">Impossible</p>
            <p className="text-red-500 font-bold">{impossible}</p>
          </div>
        )}
        {suspicious > 0 && (
          <div>
            <p className="text-muted-foreground text-xs">Suspicious</p>
            <p className="text-yellow-500 font-bold">{suspicious}</p>
          </div>
        )}
      </div>
    </div>
  );
}
