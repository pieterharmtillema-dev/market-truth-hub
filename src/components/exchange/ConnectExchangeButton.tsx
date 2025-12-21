import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExchangeConnectionModal } from "./ExchangeConnectionModal";
import { Link2 } from "lucide-react";

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
        className={className}
      >
        <Link2 className="mr-2 h-4 w-4" />
        Connect Exchange Account
      </Button>
      <ExchangeConnectionModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
