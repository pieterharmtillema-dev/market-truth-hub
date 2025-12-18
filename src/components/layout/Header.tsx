import { useEffect, useRef, useState } from "react";
import { Bell, Search, Plus, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { TraderStatusIndicator } from "./TraderStatusIndicator";
import traxDinoLogo from "@/assets/trax-dino-logo.png";

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  showCreate?: boolean;
}

/* ------------------------------
   Hide on scroll (desktop only)
------------------------------- */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (window.innerWidth < 640) return;

    const onScroll = () => {
      const current = window.scrollY;

      if (current > lastScrollY.current && current > 80) {
        if (!hideTimeout.current) {
          hideTimeout.current = window.setTimeout(() => {
            setHidden(true);
          }, 200);
        }
      } else {
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current);
          hideTimeout.current = null;
        }
        setHidden(false);
      }

      lastScrollY.current = current;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return hidden;
}

/* ------------------------------
   Header
------------------------------- */
export function Header({ title = "Trax", showSearch = true, showCreate = true }: HeaderProps) {
  const { user, signOut } = useAuth();
  const hidden = useHideOnScroll();

  return (
    <header
      className={`
        sticky top-0 z-40
        bg-background/95 backdrop-blur-xl
        border-b border-border
        transition-all duration-300 ease-out
        will-change-transform will-change-opacity
        ${hidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}
      `}
    >
      {/* Header height unchanged */}
      <div className="flex items-center justify-between h-16 sm:h-20 px-4 gap-2 overflow-visible">
        {/* Logo */}
        <Link
          to="/"
          className="relative flex items-center shrink-0 overflow-visible hover:opacity-90 transition-opacity"
          aria-label="Go to feed"
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
            "
          />
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
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

              <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Sign out">
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
