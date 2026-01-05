const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  bitvavo: "Bitvavo",
  coinbase: "Coinbase",
  alpaca: "Alpaca",
  tradestation: "TradeStation",
};

export function formatExchangeName(exchange?: string | null): string | null {
  if (!exchange) return null;

  const normalized = exchange.toLowerCase();
  if (EXCHANGE_LABELS[normalized]) {
    return EXCHANGE_LABELS[normalized];
  }

  return exchange.charAt(0).toUpperCase() + exchange.slice(1);
}
