import { Home, TrendingUp, Trophy, LineChart, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Feed", path: "/" },
  { icon: TrendingUp, label: "Markets", path: "/markets" },
  { icon: LineChart, label: "Groups", path: "/trades" },
  { icon: Trophy, label: "Leaders", path: "/leaderboard" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200",
              "text-muted-foreground hover:text-foreground"
            )}
            activeClassName="text-primary bg-primary/10"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
