import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExchangeConnectionModal } from "./ExchangeConnectionModal";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectExchangeButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ConnectExchangeButton({ 
  variant = "default", 
  size = "default",
  className 
}: ConnectExchangeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={cn("whitespace-normal sm:whitespace-nowrap", className)}
      >
        <Link2 className="mr-2 h-4 w-4" />
        <span className="sm:hidden">Connect Exchange</span>
        <span className="hidden sm:inline">Connect Exchange Account</span>
      </Button>
      <ExchangeConnectionModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
