import { useEffect, useState } from "react";
import { Bell, Search, Plus, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TraderStatusIndicator } from "./TraderStatusIndicator";
import traxDinoLogo from "@/assets/trax-dino-logo.png";

interface HeaderProps {
  showSearch?: boolean;
  showCreate?: boolean;
}

/* ----------------------------------------
   Scroll-aware header states
----------------------------------------- */
function useHeaderScrollState() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return {
    hideBackground: scrollY > 60,
    hideContent: scrollY > 140,
  };
}

/* ----------------------------------------
   Header
----------------------------------------- */
export function Header({ showSearch = true, showCreate = true }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { hideBackground, hideContent } = useHeaderScrollState();

  return (
    <header
      className={`
        sticky top-0 z-40
        transition-all duration-500 ease-out
        ${
          hideBackground
            ? "bg-transparent border-transparent"
            : "bg-background/95 backdrop-blur-xl border-b border-border"
        }
      `}
    >
      <div className="flex items-center justify-between h-16 sm:h-20 px-4 gap-2 overflow-visible">
        {/* ----------------------------------
            LOGO
        ----------------------------------- */}
        <Link
          to="/"
          aria-label="Go to feed"
          className={`
            relative flex items-center shrink-0 overflow-visible
            transition-all duration-500 ease-out
            ${hideContent ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}
          `}
        >
          <img
            src={traxDinoLogo}
            alt="TRAX"
            className="
              h-20 sm:h-28 md:h-32
              w-auto
              object-contain
              shrink-0
              translate-y-1 sm:translate-y-2
              drop-shadow-[0_0_10px_rgba(0,255,150,0.35)]
              hover:drop-shadow-[0_0_18px_rgba(0,255,180,0.6)]
              transition-all duration-500 ease-out
            "
          />
        </Link>

        {/* ----------------------------------
            ACTIONS
        ----------------------------------- */}
        <div
          className={`
            flex items-center gap-2
            transition-all duration-500 ease-out
            ${hideContent ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}
          `}
        >
          <div className="hidden sm:block">
            <TraderStatusIndicator />
          </div>

          {showSearch && (
            <Button variant="ghost" size="icon-sm">
              <Search className="w-4 h-4" />
            </Button>
          )}

          {user && showCreate && (
            <Link to="/create-prediction">
              <Button variant="default" size="icon-sm">
                <Plus className="w-4 h-4" />
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
              <Button variant="default" size="icon-sm">
                <LogIn className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
