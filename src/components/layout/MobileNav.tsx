import { useState } from "react";
import { Home, TrendingUp, User, History, Plus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import traxLogo from "@/assets/trax-logo.png";
import { TrexWalker } from "./TrexWalker";
import { AddTradeDialog } from "@/components/trades/AddTradeDialog";

const navItems = [
  { icon: Home, label: "Feed", path: "/" },
  { icon: TrendingUp, label: "Markets", path: "/markets" },
  { type: "button" as const, icon: Plus, label: "Add Trade" },
  { icon: History, label: "Trades", path: "/past-trades" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function MobileNav() {
  const [showAddTrade, setShowAddTrade] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-pb overflow-visible"
        style={{ position: "fixed", WebkitTransform: "translateZ(0)" }}
      >
        <TrexWalker />
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            if (item.type === "button") {
              return (
                <button
                  key={index}
                  onClick={() => setShowAddTrade(true)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                    "text-primary bg-primary/10 hover:bg-primary/20"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
                  "text-muted-foreground hover:text-foreground",
                )}
                activeClassName="text-primary bg-primary/10"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <AddTradeDialog
        open={showAddTrade}
        onOpenChange={setShowAddTrade}
        onSuccess={() => {
          // Optionally trigger refresh in other components
        }}
      />
    </>
  );
}
