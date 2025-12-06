import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { Header } from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showNav?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  showHeader = true, 
  showNav = true 
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header title={title} />}
      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}
