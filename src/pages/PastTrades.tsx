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
import { ArrowUpDown, CalendarIcon, Filter, TrendingUp, TrendingDown, Clock, Search, Zap, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Position {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  entry_timestamp: string;
  exit_price: number | null;
  exit_timestamp: string | null;
  pnl: number | null;
  platform: string | null;
  open: boolean;
  created_at: string;
}

type SortField = 'entry_timestamp' | 'symbol' | 'pnl';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;

export default function PastTrades() {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState<string>('user');

  // Filters
  const [symbolFilter, setSymbolFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Sorting
  const [sortField, setSortField] = useState<SortField>('entry_timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Unique platforms for filter
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchPlatforms();
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPositions();
    }
  }, [user, currentPage, symbolFilter, sideFilter, platformFilter, statusFilter, dateFrom, dateTo, sortField, sortDirection]);

  const fetchUserRole = async () => {
    const { data } = await supabase.rpc('get_user_role', { _user_id: user!.id });
    setUserRole(data || 'user');
  };

  const fetchPlatforms = async () => {
    const { data } = await supabase
      .from('positions')
      .select('platform')
      .eq('user_id', user!.id)
      .not('platform', 'is', null);

    if (data) {
      const uniquePlatforms = [...new Set(data.map(t => t.platform).filter(Boolean))] as string[];
      setPlatforms(uniquePlatforms);
    }
  };

  const fetchPositions = async () => {
    setLoading(true);

    let query = supabase
      .from('positions')
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
    if (statusFilter === 'open') {
      query = query.eq('open', true);
    } else if (statusFilter === 'closed') {
      query = query.eq('open', false);
    }
    if (dateFrom) {
      query = query.gte('entry_timestamp', dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('entry_timestamp', endOfDay.toISOString());
    }

    // Apply sorting
    if (sortField === 'pnl') {
      query = query.order('pnl', { ascending: sortDirection === 'asc', nullsFirst: false });
    } else {
      query = query.order(sortField, { ascending: sortDirection === 'asc' });
    }

    // Pagination
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching positions:', error);
    } else {
      setPositions(data || []);
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSymbolFilter('');
    setSideFilter('all');
    setPlatformFilter('all');
    setStatusFilter('all');
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
        {/* Developer Mode Banner */}
        {userRole === 'developer' && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-3 flex items-center gap-2">
              <TestTube className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-amber-200">Developer mode – simulations allowed</span>
            </CardContent>
          </Card>
        )}

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

            {/* Side, Platform & Status Filters */}
            <div className="grid grid-cols-3 gap-2">
              <Select value={sideFilter} onValueChange={(v) => { setSideFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sides</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
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

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
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
            {totalCount} position{totalCount !== 1 ? 's' : ''} found
          </p>
          <div className="flex gap-1">
            <Button
              variant={sortField === 'entry_timestamp' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSort('entry_timestamp')}
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              Date
              {sortField === 'entry_timestamp' && <ArrowUpDown className="h-3 w-3" />}
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
            <Button
              variant={sortField === 'pnl' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => handleSort('pnl')}
              className="gap-1"
            >
              P/L
              {sortField === 'pnl' && <ArrowUpDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Positions Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : positions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No positions found.</p>
                <p className="text-sm mt-1">Trades sent from your Chrome extension will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell>
                          {position.open ? (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 gap-1">
                              <Zap className="h-3 w-3" />
                              Open
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 gap-1">
                              Closed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{position.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={position.side === 'long' ? 'default' : 'secondary'} className={cn(
                            position.side === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          )}>
                            {position.side === 'long' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            {position.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {position.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          ${position.entry_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {position.exit_price != null ? `$${position.exit_price.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-sm",
                          position.pnl != null && position.pnl > 0 && "text-emerald-400",
                          position.pnl != null && position.pnl < 0 && "text-red-400"
                        )}>
                          {position.pnl != null ? `${position.pnl >= 0 ? '+' : ''}$${position.pnl.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {position.platform || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {format(new Date(position.entry_timestamp), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
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
