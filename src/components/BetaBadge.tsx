export default function BetaBadge() {
  return (
    <div className="fixed bottom-20 right-4 z-[9999]">
      <button
        onClick={() => window.open("mailto:feedback@trade-trax.com")}
        className="rounded-full bg-yellow-400/90 px-4 py-2 text-[11px] font-semibold text-black shadow-lg transition hover:bg-yellow-300"
      >
        BETA · Feedback
      </button>
    </div>
  );
}
