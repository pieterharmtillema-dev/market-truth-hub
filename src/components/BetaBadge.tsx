export default function BetaBadge() {
  return (
    <div className="fixed bottom-20 right-4 z-[9999]">
      <div className="flex items-center gap-2 rounded-full bg-yellow-400/90 px-4 py-2 text-[11px] font-semibold tracking-wide text-black shadow-lg backdrop-blur">
        <span className="h-2 w-2 rounded-full bg-black/70" />
        BETA
      </div>
    </div>
  );
}
