import { useEffect, useRef, useState } from "react";
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

/* ---------------------------------------------------
   Hide-on-scroll hook
   - Desktop only
   - Delayed hide
   - Fade + slide ready
---------------------------------------------------- */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeout = useRef<number | null>(null);

  useEffect(() => {
    // Disable behavior on mobile
    if (window.innerWidth < 640) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Scroll down → hide after delay
      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        if (!hideTimeout.current) {
          hideTimeout.current = window.setTimeout(() => {
            setHidden(true);
          }, 200);
        }
      } else {
        // Scroll up → show immediately
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current);
          hideTimeout.current = null;
        }
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return hidden;
}

export function Header({ title = "Trax", showSearch = true, showCreate = true }: HeaderProps) {
  const { user, signOut } = useAuth();
  const hidden = useHideOnScroll();

  return (
    <header
      className={`
        sticky top-0 z-40
        bg-background/95 backdrop-blur-xl border-b border-border
        transition-all duration-300 ease-out
        will-change-transform will-change-opacity
        ${hidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}
      `}
    >
      <div className="flex items-center justify-between h-16 sm:h-20 px-4">
        {/* Logo + Brand */}
        <div className="flex items-center">
          <img src={traxLogo} alt="TRAX" className="h-10 sm:h-16 w-auto object-contain translate-y-0.5" />

          <h1 className="ml-1.5 font-black leading-none tracking-widest text-[#40962b] text-xl sm:text-[2.5rem]">
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
