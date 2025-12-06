import { PredictionData } from "@/components/predictions/PredictionCard";
import { LeaderData } from "@/components/leaderboard/LeaderboardCard";
import { GroupData } from "@/components/groups/GroupCard";

export type TradingStyle = "day-trader" | "swing-trader" | "long-term" | "scalper";
export type MarketFocus = "crypto" | "forex" | "stocks" | "futures" | "options" | "all";

export interface TraderType {
  style: TradingStyle;
  markets: MarketFocus[];
}

export const tradingStyleLabels: Record<TradingStyle, { label: string; icon: string; color: string }> = {
  "day-trader": { label: "Day Trader", icon: "⚡", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  "swing-trader": { label: "Swing Trader", icon: "📊", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  "long-term": { label: "Long Term", icon: "🎯", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  "scalper": { label: "Scalper", icon: "🔥", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
};

export const marketFocusLabels: Record<MarketFocus, { label: string; icon: string; color: string }> = {
  "crypto": { label: "Crypto", icon: "₿", color: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  "forex": { label: "Forex", icon: "💱", color: "text-sky-400 bg-sky-400/10 border-sky-400/30" },
  "stocks": { label: "Stocks", icon: "📈", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  "futures": { label: "Futures", icon: "📉", color: "text-purple-400 bg-purple-400/10 border-purple-400/30" },
  "options": { label: "Options", icon: "🎲", color: "text-pink-400 bg-pink-400/10 border-pink-400/30" },
  "all": { label: "All Markets", icon: "🌐", color: "text-slate-400 bg-slate-400/10 border-slate-400/30" },
};

export const mockPredictions: PredictionData[] = [
  {
    id: "1",
    user: {
      name: "Alex Chen",
      username: "alextrader",
      accuracy: 78,
      isVerified: true,
      traderType: {
        style: "swing-trader",
        markets: ["crypto", "stocks"],
      },
    },
    asset: "BTC/USD",
    assetType: "crypto",
    direction: "long",
    currentPrice: 67500,
    targetPrice: 72000,
    timeHorizon: "7 days",
    confidence: 85,
    rationale: "Breaking out of consolidation pattern with strong volume. RSI showing bullish divergence on 4H chart. Expecting push to new ATH.",
    status: "active",
    likes: 234,
    comments: 45,
    createdAt: "2h ago",
  },
  {
    id: "2",
    user: {
      name: "Sarah Miller",
      username: "sarahswings",
      accuracy: 82,
      isVerified: true,
      traderType: {
        style: "long-term",
        markets: ["stocks"],
      },
    },
    asset: "NVDA",
    assetType: "stock",
    direction: "long",
    currentPrice: 142.50,
    targetPrice: 155,
    timeHorizon: "2 weeks",
    confidence: 75,
    rationale: "AI demand continues to surge. Earnings beat expected with strong data center growth. Technical setup is solid above 140 support.",
    status: "success",
    likes: 567,
    comments: 89,
    createdAt: "3d ago",
  },
  {
    id: "3",
    user: {
      name: "Mike Reynolds",
      username: "mikefx",
      accuracy: 71,
      traderType: {
        style: "day-trader",
        markets: ["forex"],
      },
    },
    asset: "EUR/USD",
    assetType: "forex",
    direction: "short",
    currentPrice: 1.0875,
    targetPrice: 1.0750,
    timeHorizon: "3 days",
    confidence: 65,
    rationale: "ECB dovish stance vs Fed hawkish. Dollar strength expected on strong jobs data. Key resistance at 1.09 holding firm.",
    status: "active",
    likes: 89,
    comments: 23,
    createdAt: "5h ago",
  },
  {
    id: "4",
    user: {
      name: "Jordan Lee",
      username: "jordancrypto",
      accuracy: 68,
      traderType: {
        style: "scalper",
        markets: ["crypto"],
      },
    },
    asset: "ETH/USD",
    assetType: "crypto",
    direction: "long",
    currentPrice: 3450,
    targetPrice: 4000,
    timeHorizon: "1 month",
    confidence: 70,
    rationale: "ETF approval momentum building. Network upgrades on track. Historically undervalued vs BTC ratio.",
    status: "fail",
    likes: 156,
    comments: 67,
    createdAt: "1w ago",
  },
];

export const mockLeaders: LeaderData[] = [
  {
    rank: 1,
    user: {
      name: "Elena Rodriguez",
      username: "elenaquant",
      isVerified: true,
      tier: "diamond",
      traderType: {
        style: "swing-trader",
        markets: ["stocks", "options"],
      },
    },
    stats: {
      accuracy: 89,
      totalPredictions: 456,
      avgReturn: 18.5,
      winStreak: 23,
    },
    change: 0,
  },
  {
    rank: 2,
    user: {
      name: "David Kim",
      username: "davidtrades",
      isVerified: true,
      tier: "platinum",
      traderType: {
        style: "day-trader",
        markets: ["crypto"],
      },
    },
    stats: {
      accuracy: 86,
      totalPredictions: 312,
      avgReturn: 15.2,
      winStreak: 18,
    },
    change: 2,
  },
  {
    rank: 3,
    user: {
      name: "Alex Chen",
      username: "alextrader",
      isVerified: true,
      tier: "platinum",
      traderType: {
        style: "swing-trader",
        markets: ["crypto", "stocks"],
      },
    },
    stats: {
      accuracy: 84,
      totalPredictions: 523,
      avgReturn: 14.8,
      winStreak: 12,
    },
    change: -1,
  },
  {
    rank: 4,
    user: {
      name: "Sarah Miller",
      username: "sarahswings",
      isVerified: true,
      tier: "gold",
      traderType: {
        style: "long-term",
        markets: ["stocks"],
      },
    },
    stats: {
      accuracy: 82,
      totalPredictions: 289,
      avgReturn: 12.3,
      winStreak: 9,
    },
    change: 3,
  },
  {
    rank: 5,
    user: {
      name: "Marcus Johnson",
      username: "marcusfx",
      tier: "gold",
      traderType: {
        style: "day-trader",
        markets: ["forex"],
      },
    },
    stats: {
      accuracy: 79,
      totalPredictions: 198,
      avgReturn: 11.7,
      winStreak: 7,
    },
    change: -2,
  },
];

export const mockGroups: GroupData[] = [
  {
    id: "1",
    name: "Crypto Alpha Signals",
    description: "High-conviction crypto trades from verified top performers. Daily analysis, real-time alerts, and community discussion.",
    owner: {
      name: "Elena Rodriguez",
      isVerified: true,
      accuracy: 89,
    },
    members: 2847,
    messages: 15420,
    isPaid: true,
    price: 49,
    tags: ["Crypto", "Day Trading", "Signals"],
  },
  {
    id: "2",
    name: "Swing Trade Masters",
    description: "Learn swing trading strategies from experienced traders. Weekly watchlists and educational content.",
    owner: {
      name: "David Kim",
      isVerified: true,
      accuracy: 86,
    },
    members: 5632,
    messages: 28901,
    isPaid: true,
    price: 29,
    tags: ["Stocks", "Swing Trading", "Education"],
  },
  {
    id: "3",
    name: "Forex Fundamentals",
    description: "Free community for forex traders. Discuss macro trends, share analysis, and learn together.",
    owner: {
      name: "Marcus Johnson",
      accuracy: 79,
    },
    members: 12453,
    messages: 89234,
    isPaid: false,
    tags: ["Forex", "Macro", "Free"],
  },
  {
    id: "4",
    name: "Options Flow Club",
    description: "Track unusual options activity and discuss potential plays. Premium alerts and scanner access.",
    owner: {
      name: "Sarah Miller",
      isVerified: true,
      accuracy: 82,
    },
    members: 1876,
    messages: 9832,
    isPaid: true,
    price: 79,
    tags: ["Options", "Flow", "Premium"],
  },
];

export const mockTrendingAssets = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    sentiment: { bullish: 68, bearish: 22, neutral: 10 },
    predictions: 156,
    discussions: 423,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    sentiment: { bullish: 75, bearish: 15, neutral: 10 },
    predictions: 89,
    discussions: 234,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    sentiment: { bullish: 55, bearish: 30, neutral: 15 },
    predictions: 112,
    discussions: 312,
  },
  {
    symbol: "SPY",
    name: "S&P 500 ETF",
    sentiment: { bullish: 45, bearish: 40, neutral: 15 },
    predictions: 67,
    discussions: 189,
  },
];

export const mockTickerData = [
  { symbol: "BTC", price: 67523.45, change: 2.34 },
  { symbol: "ETH", price: 3456.78, change: 1.89 },
  { symbol: "NVDA", price: 142.56, change: 3.21 },
  { symbol: "SPY", price: 512.34, change: -0.45 },
  { symbol: "AAPL", price: 189.23, change: 0.87 },
  { symbol: "EUR/USD", price: 1.0875, change: -0.23 },
  { symbol: "GOLD", price: 2345.67, change: 0.56 },
  { symbol: "SOL", price: 145.89, change: 4.56 },
];
