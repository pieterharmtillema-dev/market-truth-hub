export type LevelUpPanelUnlock = {
  key: string;
  label: string;
  requirementsText: string;
  remainingText: string;
  progress: number;
};

export type LevelUpPanelData = {
  level: number;
  levelProgress: number;
  levelProgressPercent: number;
  nextLevelTrades: number;
  tradesPerLevel: number;
  unlocksEarned: number;
  totalUnlocks: number;
  upcomingUnlocks: LevelUpPanelUnlock[];
};

interface LevelUpPanelProps {
  data: LevelUpPanelData | null;
}

export function LevelUpPanel({ data }: LevelUpPanelProps) {
  if (!data) return null;

  const {
    level,
    levelProgress,
    levelProgressPercent,
    nextLevelTrades,
    tradesPerLevel,
    unlocksEarned,
    totalUnlocks,
    upcomingUnlocks,
  } = data;

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4">
      <div className="grid gap-3 sm:gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">Level Up</p>
              <p className="text-sm sm:text-base font-semibold text-foreground">Level {level}</p>
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground text-right">
              {nextLevelTrades} trade{nextLevelTrades === 1 ? "" : "s"} to Level {level + 1}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
              <span>{levelProgress} / {tradesPerLevel} trades</span>
              <span>{Math.round(levelProgressPercent)}% complete</span>
            </div>
            <div className="mt-1 h-2 bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground">
              Level up every {tradesPerLevel} trades tracked on your profile.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground">Next Unlocks</p>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {unlocksEarned}/{totalUnlocks} unlocked
            </span>
          </div>
          <div className="space-y-2">
            {upcomingUnlocks.length === 0 ? (
              <p className="text-[10px] sm:text-xs text-muted-foreground">All unlocks earned. New rewards coming soon.</p>
            ) : (
              upcomingUnlocks.map((unlock) => (
                <div key={unlock.key} className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{unlock.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {unlock.requirementsText}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right">{unlock.remainingText}</p>
                  </div>
                  <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(unlock.progress * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
