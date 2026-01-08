import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export interface OrderFilters {
  symbol?: string;
  status?: "all" | "open" | "filled" | "canceled" | "replaced";
  orderType?: "all" | "market" | "limit" | "stop" | "stop_limit";
  timeRange?: "today" | "7d" | "30d" | "all";
}

interface OrdersFiltersProps {
  filters: OrderFilters;
  onFiltersChange: (filters: OrderFilters) => void;
}

export function OrdersFilters({ filters, onFiltersChange }: OrdersFiltersProps) {
  const updateFilter = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search symbol..."
          value={filters.symbol || ""}
          onChange={(e) => updateFilter("symbol", e.target.value || undefined)}
          className="pl-9 w-40"
        />
      </div>

      <Select
        value={filters.status || "all"}
        onValueChange={(value) => updateFilter("status", value as OrderFilters["status"])}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="filled">Filled</SelectItem>
          <SelectItem value="canceled">Canceled</SelectItem>
          <SelectItem value="replaced">Replaced</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.orderType || "all"}
        onValueChange={(value) => updateFilter("orderType", value as OrderFilters["orderType"])}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="market">Market</SelectItem>
          <SelectItem value="limit">Limit</SelectItem>
          <SelectItem value="stop">Stop</SelectItem>
          <SelectItem value="stop_limit">Stop Limit</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.timeRange || "7d"}
        onValueChange={(value) => updateFilter("timeRange", value as OrderFilters["timeRange"])}
      >
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">7 Days</SelectItem>
          <SelectItem value="30d">30 Days</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}