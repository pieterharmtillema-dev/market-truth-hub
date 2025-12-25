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
          <button className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest text-emerald-300 shadow-sm backdrop-blur transition hover:bg-emerald-500/10">
            beta
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          className="w-64 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-200 shadow-lg backdrop-blur"
        >
          <div className="space-y-2">
            <p className="font-semibold text-emerald-300">
              Trade-Trax is in Beta
            </p>
            <p className="text-emerald-200/80">
              You’re using an early-access version of the platform. Some features
              may change or behave unexpectedly.
            </p>
            <p className="text-emerald-200/80">
              Your feedback helps us improve accuracy, performance, and overall
              usability.
            </p>
            <p className="pt-1 text-[10px] uppercase tracking-wider text-emerald-300/60">
              Early Access · Experimental
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
