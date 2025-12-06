import { Users, Lock, CheckCircle, Star, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface GroupData {
  id: string;
  name: string;
  description: string;
  cover?: string;
  owner: {
    name: string;
    avatar?: string;
    isVerified?: boolean;
    accuracy: number;
  };
  members: number;
  messages: number;
  isPaid: boolean;
  price?: number;
  tags: string[];
}

interface GroupCardProps {
  group: GroupData;
  onJoin?: () => void;
}

export function GroupCard({ group, onJoin }: GroupCardProps) {
  return (
    <Card variant="interactive" className="overflow-hidden animate-fade-in">
      {/* Cover */}
      <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent relative">
        {group.cover && (
          <img src={group.cover} alt={group.name} className="w-full h-full object-cover opacity-50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        {group.isPaid && (
          <Badge variant="warning" className="absolute top-3 right-3 gap-1">
            <Lock className="w-3 h-3" />
            ${group.price}/mo
          </Badge>
        )}
      </div>

      <CardContent className="p-4 -mt-6 relative">
        {/* Owner Avatar */}
        <div className="flex items-end gap-3 mb-3">
          <Avatar className="w-12 h-12 border-2 border-card shadow-lg">
            <AvatarImage src={group.owner.avatar} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {group.owner.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{group.name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>by {group.owner.name}</span>
              {group.owner.isVerified && <CheckCircle className="w-3 h-3 text-primary" />}
              <Badge variant="success" className="text-[10px] px-1.5 py-0 ml-1">
                {group.owner.accuracy}% acc
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {group.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {group.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Stats & Action */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {group.members.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              {group.messages.toLocaleString()}
            </span>
          </div>
          <Button 
            size="sm" 
            variant={group.isPaid ? "default" : "secondary"}
            onClick={onJoin}
          >
            {group.isPaid ? "Subscribe" : "Join Free"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
