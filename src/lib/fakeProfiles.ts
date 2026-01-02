import { TraderCategory } from "@/components/profile/CategoryBadge";
import { CharacterConfig, stringifyCharacterConfig } from "@/components/profile/characterConfig";
import {
  CharacterConfig as SimpleCharacterConfig,
  stringifyCharacterConfig as stringifySimpleConfig
} from "@/components/profile/CharacterBuilder";

// Helper to create simple character config for small circular avatars
const createSimpleAvatar = (
  skinTone: string,
  hairStyle: string,
  hairColor: string,
  eyes: string = 'normal',
  mouth: string = 'smile',
  accessory: string = 'none'
): string => {
  const config: SimpleCharacterConfig = {
    base: 'round',
    skinTone,
    hairStyle,
    hairColor,
    eyes,
    mouth,
    accessory,
    background: 'none',
  };
  return stringifySimpleConfig(config);
};

// Character config helper - creates a serialized character config string
const createCharacter = (config: Partial<CharacterConfig>): string => {
  const fullConfig: CharacterConfig = {
    skinTone: config.skinTone || '#F5D0A9',
    bodyType: config.bodyType || 'athletic',
    height: config.height || 1.0,
    face: config.face || {
      hairStyle: 'short',
      hairColor: '#2D1B0E',
      eyeColor: '#4A90D9',
      facialHair: 'none',
    },
    top: config.top || {
      type: 'hoodie',
      color: '#1C1C1C',
      graphic: 'none',
    },
    bottom: config.bottom || {
      type: 'jeans',
      color: '#1E3A5F',
    },
    shoes: config.shoes || {
      type: 'sneakers',
      color: '#1C1C1C',
    },
    accessories: config.accessories || {},
    special: config.special,
    effects: config.effects,
  };
  return stringifyCharacterConfig(fullConfig);
};

export interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_streak: number | null;
  streak_type: string | null;
  total_predictions: number | null;
  total_hits: number | null;
  created_at: string | null;
  is_verified?: boolean;
  trader_category?: TraderCategory;
}

export interface FakeTraderMeta {
  platform: string;
  asset_focus: string[];
  experience_level: string;
  holding_time: string;
  trade_frequency: string;
  win_rate: number;
  average_r: number;
  total_trades: number;
  profit_factor: number;
  max_drawdown: number;
  avg_win: number;
  avg_loss: number;
  best_trade: { asset: string; pnl: number; date: string };
  worst_trade: { asset: string; pnl: number; date: string };
  monthly_returns: number[];
  is_active: boolean;
  last_active: string;
  followers: string[];
  following: string[];
}

// Fake demo profiles for testing/demo purposes - using full character configs
export const FAKE_PROFILES: Record<string, PublicProfile> = {
  '11111111-1111-1111-1111-111111111111': { user_id: '11111111-1111-1111-1111-111111111111', display_name: 'CryptoKing', avatar_url: createCharacter({ skinTone: '#F5D0C5', bodyType: 'athletic', face: { hairStyle: 'medium', hairColor: '#D4AF37', eyeColor: '#8B4513', facialHair: 'none' }, top: { type: 'suit', color: '#1B2838', graphic: 'bull' }, bottom: { type: 'dress', color: '#2C3E50' }, shoes: { type: 'dress', color: '#1A1A1A' }, accessories: { watch: { enabled: true, style: 'smart', color: '#FFD700' } }, effects: { aura: 'gold' } }), bio: 'Full-time crypto trader. BTC maximalist.', current_streak: 7, total_predictions: 156, total_hits: 112, streak_type: 'hit', created_at: '2024-01-15', is_verified: true, trader_category: 'swing_trader' },
  '22222222-2222-2222-2222-222222222222': { user_id: '22222222-2222-2222-2222-222222222222', display_name: 'ForexMaster', avatar_url: createCharacter({ skinTone: '#FFE4D6', bodyType: 'athletic', face: { hairStyle: 'short', hairColor: '#3D2314', eyeColor: '#5D4037', facialHair: 'stubble' }, top: { type: 'business', color: '#36454F', graphic: 'none' }, bottom: { type: 'dress', color: '#2C3E50' }, shoes: { type: 'dress', color: '#1C1C1C' }, accessories: { watch: { enabled: true, style: 'analog', color: '#C0C0C0' }, sunglasses: { enabled: true, style: 'square', color: '#1C1C1C' } }, effects: { aura: 'green' } }), bio: 'Forex scalper | 5+ years experience', current_streak: 3, total_predictions: 89, total_hits: 58, streak_type: 'hit', created_at: '2024-03-22', is_verified: true, trader_category: 'scalper' },
  '33333333-3333-3333-3333-333333333333': { user_id: '33333333-3333-3333-3333-333333333333', display_name: 'StockWhisperer', avatar_url: createCharacter({ skinTone: '#FFE4D6', bodyType: 'slim', face: { hairStyle: 'medium', hairColor: '#8B4513', eyeColor: '#4A90D9', facialHair: 'none' }, top: { type: 'tshirt', color: '#228B22', graphic: 'chart' }, bottom: { type: 'jeans', color: '#4A5568' }, shoes: { type: 'casual', color: '#8B7355' }, accessories: { sunglasses: { enabled: true, style: 'round', color: '#1C1C1C' } } }), bio: 'Value investor turned swing trader', current_streak: 2, total_predictions: 234, total_hits: 145, streak_type: 'miss', created_at: '2023-11-08', is_verified: false, trader_category: 'swing_trader' },
  '44444444-4444-4444-4444-444444444444': { user_id: '44444444-4444-4444-4444-444444444444', display_name: 'TechTrader', avatar_url: createCharacter({ skinTone: '#F5D0C5', bodyType: 'athletic', face: { hairStyle: 'short', hairColor: '#3D2314', eyeColor: '#4169E1', facialHair: 'none' }, top: { type: 'hoodie', color: '#4169E1', graphic: 'diamond' }, bottom: { type: 'joggers', color: '#2C3E50' }, shoes: { type: 'sneakers', color: '#FFFFFF' }, accessories: { backpack: { enabled: true, color: '#1C1C1C' } }, effects: { aura: 'green' } }), bio: 'Tech stocks enthusiast. NASDAQ focused.', current_streak: 5, total_predictions: 67, total_hits: 41, streak_type: 'hit', created_at: '2024-06-01', is_verified: true, trader_category: 'day_trader' },
  '55555555-5555-5555-5555-555555555555': { user_id: '55555555-5555-5555-5555-555555555555', display_name: 'GoldBull', avatar_url: createCharacter({ skinTone: '#7B5544', bodyType: 'broad', face: { hairStyle: 'afro', hairColor: '#D4AF37', eyeColor: '#8B4513', facialHair: 'mustache' }, top: { type: 'business', color: '#C19A6B', graphic: 'bull' }, bottom: { type: 'dress', color: '#654321' }, shoes: { type: 'dress', color: '#8B4513' }, accessories: { watch: { enabled: true, style: 'analog', color: '#FFD700' }, necklace: { enabled: true, type: 'chain', color: '#FFD700' } }, special: { bullHorns: true }, effects: { aura: 'gold' } }), bio: 'Commodities specialist. Gold & Silver.', current_streak: 1, total_predictions: 42, total_hits: 28, streak_type: 'miss', created_at: '2024-08-14', is_verified: false, trader_category: 'position_trader' },
  '66666666-6666-6666-6666-666666666666': { user_id: '66666666-6666-6666-6666-666666666666', display_name: 'SwingKing', avatar_url: createCharacter({ skinTone: '#9E7653', bodyType: 'athletic', face: { hairStyle: 'buzz', hairColor: '#1A1A1A', eyeColor: '#4A90D9', facialHair: 'goatee' }, top: { type: 'suit', color: '#1C1C1C', graphic: 'none' }, bottom: { type: 'dress', color: '#2C3E50' }, shoes: { type: 'dress', color: '#1A1A1A' }, accessories: { watch: { enabled: true, style: 'smart', color: '#C0C0C0' }, sunglasses: { enabled: true, style: 'aviator', color: '#1A1A1A' } }, effects: { aura: 'green' } }), bio: 'Index ETF swing trader. SPY/QQQ specialist.', current_streak: 4, total_predictions: 98, total_hits: 67, streak_type: 'hit', created_at: '2024-02-10', is_verified: true, trader_category: 'swing_trader' },
  '77777777-7777-7777-7777-777777777777': { user_id: '77777777-7777-7777-7777-777777777777', display_name: 'ScalpMaster', avatar_url: createCharacter({ skinTone: '#D4A574', bodyType: 'slim', face: { hairStyle: 'buzz', hairColor: '#B7410E', eyeColor: '#8B4513', facialHair: 'stubble' }, top: { type: 'tank', color: '#722F37', graphic: 'none' }, bottom: { type: 'shorts', color: '#1C1C1C' }, shoes: { type: 'sneakers', color: '#DC143C' }, accessories: {}, effects: { aura: 'red' } }), bio: 'Scalping forex pairs since 2018. Quick in, quick out.', current_streak: 6, total_predictions: 312, total_hits: 198, streak_type: 'hit', created_at: '2023-08-20', is_verified: true, trader_category: 'scalper' },
  '88888888-8888-8888-8888-888888888888': { user_id: '88888888-8888-8888-8888-888888888888', display_name: 'DiamondHands', avatar_url: createCharacter({ skinTone: '#7B5544', bodyType: 'broad', face: { hairStyle: 'buzz', hairColor: '#1A1A1A', eyeColor: '#4A90D9', facialHair: 'none' }, top: { type: 'hoodie', color: '#1C1C1C', graphic: 'diamond' }, bottom: { type: 'joggers', color: '#2C3E50' }, shoes: { type: 'sneakers', color: '#3B82F6' }, accessories: { headset: { enabled: true, style: 'over-ear' } }, special: { diamondHands: true }, effects: { aura: 'gold' } }), bio: 'HODL gang. Long-term crypto investor.', current_streak: 12, total_predictions: 24, total_hits: 21, streak_type: 'hit', created_at: '2021-05-15', is_verified: true, trader_category: 'investor' },
  '99999999-9999-9999-9999-999999999999': { user_id: '99999999-9999-9999-9999-999999999999', display_name: 'OptionsWizard', avatar_url: createCharacter({ skinTone: '#FFE4D6', bodyType: 'slim', face: { hairStyle: 'medium', hairColor: '#8B5CF6', eyeColor: '#8B5CF6', facialHair: 'none' }, top: { type: 'tshirt', color: '#8B5CF6', graphic: 'moon' }, bottom: { type: 'jeans', color: '#4A5568' }, shoes: { type: 'sneakers', color: '#8B5CF6' }, accessories: { sunglasses: { enabled: true, style: 'round', color: '#8B5CF6' } }, effects: { aura: 'green' } }), bio: 'Options strategies. Theta gang member.', current_streak: 3, total_predictions: 145, total_hits: 89, streak_type: 'hit', created_at: '2024-01-05', is_verified: false, trader_category: 'day_trader' },
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': { user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', display_name: 'AlgoTrader', avatar_url: createCharacter({ skinTone: '#E8C4A8', bodyType: 'slim', face: { hairStyle: 'short', hairColor: '#3D2314', eyeColor: '#10B981', facialHair: 'none' }, top: { type: 'hoodie', color: '#1C1C1C', graphic: 'chart' }, bottom: { type: 'jeans', color: '#2C3E50' }, shoes: { type: 'sneakers', color: '#10B981' }, accessories: { headset: { enabled: true, style: 'over-ear' }, sunglasses: { enabled: true, style: 'square', color: '#1C1C1C' } }, effects: { aura: 'green' } }), bio: 'Quantitative trading. Python & ML enthusiast.', current_streak: 8, total_predictions: 456, total_hits: 298, streak_type: 'hit', created_at: '2023-03-12', is_verified: true, trader_category: 'scalper' },
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': { user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', display_name: 'MemeStockMaven', avatar_url: createCharacter({ skinTone: '#F5D0C5', bodyType: 'athletic', face: { hairStyle: 'buzz', hairColor: '#228B22', eyeColor: '#228B22', facialHair: 'none' }, top: { type: 'tshirt', color: '#228B22', graphic: 'moon' }, bottom: { type: 'shorts', color: '#4A5568' }, shoes: { type: 'sneakers', color: '#FFFFFF' }, accessories: {}, special: { rocketBoots: true } }), bio: 'Riding the meme wave 🚀 GME/AMC veteran', current_streak: 1, total_predictions: 78, total_hits: 42, streak_type: 'miss', created_at: '2024-04-01', is_verified: false, trader_category: 'day_trader' },
  'cccccccc-cccc-cccc-cccc-cccccccccccc': { user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', display_name: 'OilBaron', avatar_url: createCharacter({ skinTone: '#D4A574', bodyType: 'broad', face: { hairStyle: 'short', hairColor: '#1A1A1A', eyeColor: '#8B4513', facialHair: 'beard' }, top: { type: 'business', color: '#1C1C1C', graphic: 'none' }, bottom: { type: 'dress', color: '#2C3E50' }, shoes: { type: 'dress', color: '#1A1A1A' }, accessories: { watch: { enabled: true, style: 'analog', color: '#FFD700' }, belt: { enabled: true, color: '#8B4513' } }, effects: { aura: 'gold' } }), bio: 'Energy sector specialist. Crude & Natural Gas.', current_streak: 2, total_predictions: 56, total_hits: 38, streak_type: 'hit', created_at: '2023-10-20', is_verified: true, trader_category: 'position_trader' },
  'dddddddd-dddd-dddd-dddd-dddddddddddd': { user_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', display_name: 'AsianSession', avatar_url: createCharacter({ skinTone: '#E8C4A8', bodyType: 'slim', face: { hairStyle: 'short', hairColor: '#1A1A1A', eyeColor: '#2D1B0E', facialHair: 'none' }, top: { type: 'hoodie', color: '#1C1C1C', graphic: 'none' }, bottom: { type: 'jeans', color: '#4A5568' }, shoes: { type: 'casual', color: '#8B7355' }, accessories: { headset: { enabled: true, style: 'earbuds' } } }), bio: 'Trading Tokyo & Sydney sessions. JPY pairs focused.', current_streak: 5, total_predictions: 134, total_hits: 89, streak_type: 'hit', created_at: '2024-05-18', is_verified: true, trader_category: 'day_trader' },
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': { user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', display_name: 'ValueHunter', avatar_url: createCharacter({ skinTone: '#C69C6D', bodyType: 'broad', face: { hairStyle: 'bald', hairColor: '#1A1A1A', eyeColor: '#5D4037', facialHair: 'beard' }, top: { type: 'business', color: '#36454F', graphic: 'none' }, bottom: { type: 'dress', color: '#2C3E50' }, shoes: { type: 'dress', color: '#1C1C1C' }, accessories: { sunglasses: { enabled: true, style: 'round', color: '#1A1A1A' } } }), bio: 'Buffett disciple. Deep value investing.', current_streak: 9, total_predictions: 34, total_hits: 28, streak_type: 'hit', created_at: '2022-11-01', is_verified: false, trader_category: 'investor' },
  'ffffffff-ffff-ffff-ffff-ffffffffffff': { user_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', display_name: 'CryptoWhale', avatar_url: createCharacter({ skinTone: '#C69C6D', bodyType: 'athletic', face: { hairStyle: 'medium', hairColor: '#1A1A1A', eyeColor: '#06B6D4', facialHair: 'none' }, top: { type: 'business', color: '#1B2838', graphic: 'bull' }, bottom: { type: 'dress', color: '#2C3E50' }, shoes: { type: 'dress', color: '#1A1A1A' }, accessories: { sunglasses: { enabled: true, style: 'aviator', color: '#1A1A1A' }, watch: { enabled: true, style: 'smart', color: '#C0C0C0' } }, effects: { aura: 'green' } }), bio: 'Alt season hunter. Finding the next 100x.', current_streak: 4, total_predictions: 89, total_hits: 52, streak_type: 'hit', created_at: '2023-12-01', is_verified: true, trader_category: 'swing_trader' },
};

// Helper function to generate fake trader meta with all required fields
const createTraderMeta = (base: Omit<FakeTraderMeta, 'profit_factor' | 'max_drawdown' | 'avg_win' | 'avg_loss' | 'best_trade' | 'worst_trade' | 'monthly_returns'>): FakeTraderMeta => ({
  ...base,
  profit_factor: 1.2 + (base.win_rate / 100) * 1.5,
  max_drawdown: 5 + Math.random() * 20,
  avg_win: base.average_r * 100,
  avg_loss: base.average_r * 50,
  best_trade: { asset: base.asset_focus[0], pnl: base.average_r * 500 + Math.random() * 1000, date: '2024-11-15' },
  worst_trade: { asset: base.asset_focus[Math.floor(Math.random() * base.asset_focus.length)], pnl: -(base.average_r * 200 + Math.random() * 300), date: '2024-10-22' },
  monthly_returns: Array.from({ length: 6 }, () => (Math.random() - 0.3) * 15),
});

// Fake trader metadata with followers/following
export const FAKE_TRADER_META: Record<string, FakeTraderMeta> = {
  '11111111-1111-1111-1111-111111111111': createTraderMeta({
    platform: 'Binance', asset_focus: ['BTC', 'ETH', 'SOL'], experience_level: 'Advanced', holding_time: 'Swing (days)', trade_frequency: 'Daily', win_rate: 71.8, average_r: 2.1, total_trades: 156, is_active: true, last_active: new Date(Date.now() - 5 * 60 * 1000).toISOString(), followers: ['22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 'ffffffff-ffff-ffff-ffff-ffffffffffff'], following: ['88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  }),
  '22222222-2222-2222-2222-222222222222': createTraderMeta({
    platform: 'MetaTrader 5', asset_focus: ['EUR/USD', 'GBP/JPY', 'USD/JPY'], experience_level: 'Expert', holding_time: 'Scalp (minutes)', trade_frequency: 'Multiple daily', win_rate: 65.2, average_r: 1.8, total_trades: 89, is_active: false, last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), followers: ['77777777-7777-7777-7777-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd'], following: ['11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777'],
  }),
  '33333333-3333-3333-3333-333333333333': createTraderMeta({
    platform: 'TradingView', asset_focus: ['AAPL', 'NVDA', 'MSFT', 'META'], experience_level: 'Advanced', holding_time: 'Swing (days)', trade_frequency: 'Weekly', win_rate: 62.0, average_r: 1.5, total_trades: 234, is_active: true, last_active: new Date(Date.now() - 15 * 60 * 1000).toISOString(), followers: ['44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'], following: ['11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666'],
  }),
  '44444444-4444-4444-4444-444444444444': createTraderMeta({
    platform: 'Interactive Brokers', asset_focus: ['AMD', 'GOOGL', 'AMZN'], experience_level: 'Intermediate', holding_time: 'Day trading', trade_frequency: 'Daily', win_rate: 61.2, average_r: 1.7, total_trades: 67, is_active: false, last_active: new Date(Date.now() - 45 * 60 * 1000).toISOString(), followers: ['33333333-3333-3333-3333-333333333333'], following: ['11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999999'],
  }),
  '55555555-5555-5555-5555-555555555555': createTraderMeta({
    platform: 'MetaTrader 5', asset_focus: ['XAU/USD', 'XAG/USD'], experience_level: 'Intermediate', holding_time: 'Swing (days)', trade_frequency: 'Few per week', win_rate: 66.7, average_r: 1.4, total_trades: 42, is_active: true, last_active: new Date(Date.now() - 3 * 60 * 1000).toISOString(), followers: ['cccccccc-cccc-cccc-cccc-cccccccccccc'], following: ['cccccccc-cccc-cccc-cccc-cccccccccccc'],
  }),
  '66666666-6666-6666-6666-666666666666': createTraderMeta({
    platform: 'TD Ameritrade', asset_focus: ['SPY', 'QQQ', 'IWM'], experience_level: 'Advanced', holding_time: 'Swing (1-2 weeks)', trade_frequency: 'Weekly', win_rate: 68.4, average_r: 1.9, total_trades: 98, is_active: true, last_active: new Date(Date.now() - 10 * 60 * 1000).toISOString(), followers: ['33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'], following: ['33333333-3333-3333-3333-333333333333'],
  }),
  '77777777-7777-7777-7777-777777777777': createTraderMeta({
    platform: 'cTrader', asset_focus: ['EUR/USD', 'USD/JPY', 'GBP/USD'], experience_level: 'Expert', holding_time: 'Scalp (1-30 min)', trade_frequency: '20+ per day', win_rate: 63.5, average_r: 1.2, total_trades: 312, is_active: true, last_active: new Date(Date.now() - 1 * 60 * 1000).toISOString(), followers: ['22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd'], following: ['22222222-2222-2222-2222-222222222222'],
  }),
  '88888888-8888-8888-8888-888888888888': createTraderMeta({
    platform: 'Coinbase', asset_focus: ['BTC', 'ETH', 'SOL'], experience_level: 'Advanced', holding_time: 'Long-term (months)', trade_frequency: 'Monthly', win_rate: 87.5, average_r: 5.2, total_trades: 24, is_active: false, last_active: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), followers: ['11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'], following: ['11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
  }),
  '99999999-9999-9999-9999-999999999999': createTraderMeta({
    platform: 'Tastytrade', asset_focus: ['TSLA', 'NVDA', 'SPY'], experience_level: 'Expert', holding_time: 'Options (weeks)', trade_frequency: 'Daily', win_rate: 61.4, average_r: 2.3, total_trades: 145, is_active: true, last_active: new Date(Date.now() - 20 * 60 * 1000).toISOString(), followers: ['44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333'], following: ['33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'],
  }),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': createTraderMeta({
    platform: 'Bybit', asset_focus: ['BTC', 'ETH', 'LINK'], experience_level: 'Expert', holding_time: 'Algo (variable)', trade_frequency: '50+ per day', win_rate: 65.4, average_r: 1.6, total_trades: 456, is_active: true, last_active: new Date(Date.now() - 30 * 1000).toISOString(), followers: ['11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'ffffffff-ffff-ffff-ffff-ffffffffffff'], following: [],
  }),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': createTraderMeta({
    platform: 'Robinhood', asset_focus: ['GME', 'AMC', 'BBBY'], experience_level: 'Beginner', holding_time: 'Variable', trade_frequency: 'Sporadic', win_rate: 53.8, average_r: 0.8, total_trades: 78, is_active: false, last_active: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), followers: [], following: ['11111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff'],
  }),
  'cccccccc-cccc-cccc-cccc-cccccccccccc': createTraderMeta({
    platform: 'NinjaTrader', asset_focus: ['CL', 'NG', 'GC'], experience_level: 'Advanced', holding_time: 'Day trading', trade_frequency: 'Daily', win_rate: 67.9, average_r: 2.0, total_trades: 56, is_active: true, last_active: new Date(Date.now() - 8 * 60 * 1000).toISOString(), followers: ['55555555-5555-5555-5555-555555555555'], following: ['55555555-5555-5555-5555-555555555555'],
  }),
  'dddddddd-dddd-dddd-dddd-dddddddddddd': createTraderMeta({
    platform: 'OANDA', asset_focus: ['USD/JPY', 'EUR/JPY', 'AUD/JPY'], experience_level: 'Advanced', holding_time: 'Swing (days)', trade_frequency: 'Few per week', win_rate: 66.4, average_r: 1.8, total_trades: 134, is_active: false, last_active: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), followers: ['77777777-7777-7777-7777-777777777777'], following: ['22222222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777'],
  }),
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': createTraderMeta({
    platform: 'Fidelity', asset_focus: ['BRK.B', 'JPM', 'V'], experience_level: 'Expert', holding_time: 'Long-term (years)', trade_frequency: 'Monthly', win_rate: 82.4, average_r: 3.1, total_trades: 34, is_active: false, last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), followers: ['33333333-3333-3333-3333-333333333333'], following: ['33333333-3333-3333-3333-333333333333'],
  }),
  'ffffffff-ffff-ffff-ffff-ffffffffffff': createTraderMeta({
    platform: 'Kraken', asset_focus: ['SOL', 'AVAX', 'LINK'], experience_level: 'Advanced', holding_time: 'Swing (weeks)', trade_frequency: 'Weekly', win_rate: 58.4, average_r: 3.8, total_trades: 89, is_active: true, last_active: new Date(Date.now() - 25 * 60 * 1000).toISOString(), followers: ['11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888'], following: ['11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  }),
};
