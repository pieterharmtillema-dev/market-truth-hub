import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, CalendarIcon, Filter, TrendingUp, TrendingDown, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PastTrade {
  id: string;
  symbol: string;
  side: string;
  fill_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  platform: string | null;
  account_id: string | null;
  timestamp: string;
  created_at: string;
  verified_status: string;
  verification_score: number | null;
}

type SortField = 'timestamp' | 'symbol' | 'pnl';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function PastTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<PastTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [symbolFilter, setSymbolFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Sorting
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Unique platforms for filter
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchPlatforms();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user, currentPage, symbolFilter, sideFilter, platformFilter, dateFrom, dateTo, sortField, sortDirection]);

  const fetchPlatforms = async () => {
    const { data } = await supabase
      .from('past_trades')
      .select('platform')
      .eq('user_id', user!.id)
      .not('platform', 'is', null);

    if (data) {
      const uniquePlatforms = [...new Set(data.map(t => t.platform).filter(Boolean))] as string[];
      setPlatforms(uniquePlatforms);
    }
  };

  const fetchTrades = async () => {
    setLoading(true);

    let query = supabase
      .from('past_trades')
      .select('*', { count: 'exact' })
      .eq('user_id', user!.id);

    // Apply filters
    if (symbolFilter) {
      query = query.ilike('symbol', `%${symbolFilter}%`);
    }
    if (sideFilter !== 'all') {
      query = query.eq('side', sideFilter);
    }
    if (platformFilter !== 'all') {
      query = query.eq('platform', platformFilter);
    }
    if (dateFrom) {
      query = query.gte('timestamp', dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('timestamp', endOfDay.toISOString());
    }

    // Apply sorting
    if (sortField === 'pnl') {
      // For P/L sorting, we need to calculate it - for now just sort by timestamp
      query = query.order('timestamp', { ascending: sortDirection === 'asc' });
    } else {
      query = query.order(sortField, { ascending: sortDirection === 'asc' });
    }

    // Pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching trades:', error);
    } else {
      setTrades(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const calculatePnL = (trade: PastTrade): number | null => {
    if (trade.fill_price == null || trade.exit_price == null || trade.quantity == null) {
      return null;
    }
    const multiplier = trade.side === 'buy' ? 1 : -1;
    return (trade.exit_price - trade.fill_price) * trade.quantity * multiplier;
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSymbolFilter('');
    setSideFilter('all');
    setPlatformFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  if (!user) {
    return (
      <AppLayout title="Past Trades">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view your trades.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Past Trades">
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Filters Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Symbol Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbol..."
                value={symbolFilter}
                onChange={(e) => {
                  setSymbolFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Side & Platform Filters */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={sideFilter} onValueChange={(v) => { setSideFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sides</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setCurrentPage(1); }} />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setCurrentPage(1); }} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters */}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        {/* Results Count & Sort */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount} trade{totalCount !== 1 ? 's' : ''} found
          </p>
          <div className="flex gap-1">
            <Button
              variant={sortField === 'timestamp' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSort('timestamp')}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              Date
              {sortField === 'timestamp' && <ArrowUpDown className="h-3 w-3" />}
            </Button>
            <Button
              variant={sortField === 'symbol' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSort('symbol')}
              className="gap-1"
            >
              Symbol
              {sortField === 'symbol' && <ArrowUpDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Trades Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : trades.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No trades found.</p>
                <p className="text-sm mt-1">Trades sent from your Chrome extension will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Fill</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      const pnl = calculatePnL(trade);
                      return (
                        <TableRow key={trade.id}>
                          <TableCell className="font-medium">{trade.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'} className={cn(
                              trade.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            )}>
                              {trade.side === 'buy' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {trade.side.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {trade.fill_price != null ? `$${trade.fill_price.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {trade.exit_price != null ? `$${trade.exit_price.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {trade.quantity != null ? trade.quantity.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-mono text-sm",
                            pnl != null && pnl > 0 && "text-emerald-400",
                            pnl != null && pnl < 0 && "text-red-400"
                          )}>
                            {pnl != null ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {trade.platform || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              trade.verified_status === 'verified' && 'border-emerald-500 text-emerald-400',
                              trade.verified_status === 'pending' && 'border-yellow-500 text-yellow-400',
                              trade.verified_status === 'failed' && 'border-red-500 text-red-400'
                            )}>
                              {trade.verified_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(trade.timestamp), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  );
}
