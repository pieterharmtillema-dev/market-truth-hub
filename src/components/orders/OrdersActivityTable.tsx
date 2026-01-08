import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  useAlpacaOrders,
  type AlpacaOrder,
  type OrderChain,
  getOrderTypeDisplay,
  getFillStatus,
  getStatusBadgeVariant,
} from "@/hooks/useAlpacaOrders";
import { OrdersFilters, type OrderFilters } from "./OrdersFilters";
import { Skeleton } from "@/components/ui/skeleton";

export function OrdersActivityTable() {
  const [filters, setFilters] = useState<OrderFilters>({
    status: "all",
    orderType: "all",
    timeRange: "7d",
  });

  const { orderChains, loading, syncing, error, syncOrders } = useAlpacaOrders(filters);

  const handleSync = async () => {
    await syncOrders();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-lg border bg-card">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <OrdersFilters filters={filters} onFiltersChange={setFilters} />
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync Orders"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Filled</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Filled At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderChains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No orders found. Click "Sync Orders" to fetch from Alpaca.
                  </TableCell>
                </TableRow>
              ) : (
                orderChains.map((chain) => (
                  <OrderChainRow key={chain.clientOrderId} chain={chain} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function OrderChainRow({ chain }: { chain: OrderChain }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasReplacements = chain.orders.length > 1;
  const order = chain.latestOrder;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <>
        <TableRow className="hover:bg-muted/50">
          <TableCell>
            {hasReplacements && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </TableCell>
          <OrderRowCells order={order} showChainBadge={hasReplacements} chainCount={chain.orders.length} />
        </TableRow>

        {hasReplacements && (
          <CollapsibleContent asChild>
            <>
              {chain.orders.slice(1).map((replacedOrder) => (
                <TableRow key={replacedOrder.order_id} className="bg-muted/30">
                  <TableCell className="pl-6">
                    <span className="text-xs text-muted-foreground">↳</span>
                  </TableCell>
                  <OrderRowCells order={replacedOrder} isReplaced />
                </TableRow>
              ))}
            </>
          </CollapsibleContent>
        )}
      </>
    </Collapsible>
  );
}

function OrderRowCells({
  order,
  showChainBadge = false,
  chainCount = 0,
  isReplaced = false,
}: {
  order: AlpacaOrder;
  showChainBadge?: boolean;
  chainCount?: number;
  isReplaced?: boolean;
}) {
  const fillStatus = getFillStatus(order);
  const statusVariant = getStatusBadgeVariant(order.status);

  return (
    <>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <span className={cn(isReplaced && "text-muted-foreground")}>
            {order.symbol}
          </span>
          {showChainBadge && (
            <Badge variant="outline" className="text-xs">
              {chainCount} orders
            </Badge>
          )}
          {order.environment === "paper" && (
            <Badge variant="secondary" className="text-xs">
              Paper
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("text-sm", isReplaced && "text-muted-foreground")}>
          {getOrderTypeDisplay(order)}
        </span>
      </TableCell>
      <TableCell>
        <Badge
          variant={order.side === "buy" ? "default" : "destructive"}
          className={cn(
            "capitalize",
            order.side === "buy" && "bg-green-600 hover:bg-green-700"
          )}
        >
          {order.side}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {Number(order.qty).toLocaleString()}
      </TableCell>
      <TableCell className="text-right font-mono">
        <span
          className={cn(
            fillStatus === "filled" && "text-green-600",
            fillStatus === "partial" && "text-yellow-600"
          )}
        >
          {Number(order.filled_qty).toLocaleString()}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono">
        {order.filled_avg_price ? `$${Number(order.filled_avg_price).toFixed(2)}` : "—"}
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {order.status.replace(/_/g, " ")}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(order.submitted_at), "MMM d, HH:mm")}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {order.filled_at
          ? format(new Date(order.filled_at), "MMM d, HH:mm")
          : "—"}
      </TableCell>
    </>
  );
}