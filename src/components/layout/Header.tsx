import { Bell, Search, Plus, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TraderStatusIndicator } from "./TraderStatusIndicator";
import traxLogo from "@/assets/trax-logo.png";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showCreate?: boolean;
}

export function Header({ title = "Trax", showSearch = true, showCreate = true }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-20 px-4">
        {/* Logo + Brand */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <img
              src={traxLogo}
              alt="TRAX"
              className="w-20 h-20 object-contain drop-shadow-[0_0_10px_hsl(var(--trax)/0.25)]"
            />
            {/* Softer glow */}
            <div className="absolute inset-0 bg-trax/10 rounded-full blur-xl -z-10" />
          </div>

          <h1 className="font-black text-3xl sm:text-4xl tracking-widest text-trax leading-none drop-shadow-[0_0_8px_hsl(var(--trax)/0.35)]">
            TRAX
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <TraderStatusIndicator />

          {showSearch && (
            <Button variant="ghost" size="icon-sm">
              <Search className="w-4 h-4" />
            </Button>
          )}

          {user && showCreate && (
            <Link to="/create-prediction">
              <Button variant="default" size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Predict</span>
              </Button>
            </Link>
          )}

          {user ? (
            <>
              <Button variant="ghost" size="icon-sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={signOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="gap-1">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
