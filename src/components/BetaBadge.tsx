import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function BetaBadge() {
  return (
    <div className="fixed bottom-20 right-4 z-[9999]">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="rounded-md px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest shadow-sm transition-all duration-200 hover:bg-[#7cc30d]/20 hover:shadow-[0_0_10px_rgba(124,195,13,0.35)]"
            style={{
              border: "1px solid rgba(124, 195, 13, 0.6)",
              backgroundColor: "rgba(124, 195, 13, 0.14)",
              color: "#7cc30d",
            }}
          >
            beta
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          className="w-64 border border-border bg-background p-3 text-xs shadow-lg"
        >
          <div className="space-y-2 text-muted-foreground">
            <p className="font-semibold text-foreground">
              Trade-Trax is in Beta
            </p>
            <p>
              You’re using an early version of the platform. Some features may
              change or behave unexpectedly.
            </p>
            <p>
              Your feedback helps us improve accuracy, performance, and
              usability.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
