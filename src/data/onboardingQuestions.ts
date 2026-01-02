export interface OnboardingQuestion {
  id: string;
  question: string;
  description: string;
  dimension: string;
  options: {
    value: string;
    label: string;
    description?: string;
    tags: string[];
  }[];
}

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: "holding_time",
    question: "How long do you typically hold your trades?",
    description: "This helps us understand your trading style and timeframe preferences.",
    dimension: "Trading Style",
    options: [
      {
        value: "minutes",
        label: "Seconds to minutes",
        description: "Quick in-and-out trades",
        tags: ["style_scalper", "timeframe_ultra_short", "high_frequency"],
      },
      {
        value: "hours",
        label: "Minutes to hours",
        description: "Close all positions by end of day",
        tags: ["style_day_trader", "timeframe_short", "medium_frequency"],
      },
      {
        value: "days",
        label: "Days to weeks",
        description: "Hold through minor pullbacks",
        tags: ["style_swing", "timeframe_medium", "low_frequency"],
      },
      {
        value: "weeks",
        label: "Weeks to months",
        description: "Focus on major trends",
        tags: ["style_position", "timeframe_long", "very_low_frequency"],
      },
    ],
  },
  {
    id: "risk_per_trade",
    question: "What percentage of your account do you typically risk per trade?",
    description: "Understanding your risk appetite helps personalize risk management insights.",
    dimension: "Risk Tolerance",
    options: [
      {
        value: "conservative",
        label: "Less than 1%",
        description: "Capital preservation focused",
        tags: ["risk_low", "conservative", "defensive"],
      },
      {
        value: "moderate",
        label: "1% – 2%",
        description: "Balanced approach",
        tags: ["risk_moderate", "balanced"],
      },
      {
        value: "aggressive",
        label: "2% – 5%",
        description: "Growth oriented",
        tags: ["risk_high", "aggressive", "growth"],
      },
      {
        value: "very_aggressive",
        label: "More than 5%",
        description: "High conviction trades",
        tags: ["risk_very_high", "very_aggressive", "high_conviction"],
      },
    ],
  },
  {
    id: "trade_frequency",
    question: "How often do you typically execute trades?",
    description: "This helps us tailor analytics and review frequency.",
    dimension: "Trade Frequency",
    options: [
      {
        value: "monthly",
        label: "A few times per month",
        description: "Highly selective",
        tags: ["frequency_very_low", "selective", "patient"],
      },
      {
        value: "weekly",
        label: "A few times per week",
        description: "Measured approach",
        tags: ["frequency_low", "measured"],
      },
      {
        value: "daily",
        label: "Daily",
        description: "Regular trading routine",
        tags: ["frequency_moderate", "active"],
      },
      {
        value: "multiple_daily",
        label: "Multiple times daily",
        description: "Active trader",
        tags: ["frequency_high", "very_active", "engaged"],
      },
    ],
  },
  {
    id: "decision_style",
    question: "How do you typically make trading decisions?",
    description: "This helps us understand your approach to analysis and entry/exit.",
    dimension: "Decision Style",
    options: [
      {
        value: "systematic",
        label: "Fully systematic",
        description: "Rules-based, minimal discretion",
        tags: ["decision_systematic", "rules_based", "mechanical"],
      },
      {
        value: "mostly_systematic",
        label: "Mostly systematic",
        description: "Rules with some flexibility",
        tags: ["decision_mostly_systematic", "structured"],
      },
      {
        value: "balanced",
        label: "Mix of both",
        description: "System + intuition equally",
        tags: ["decision_balanced", "hybrid"],
      },
      {
        value: "discretionary",
        label: "Mostly discretionary",
        description: "Intuition-driven with some structure",
        tags: ["decision_discretionary", "intuitive", "flexible"],
      },
    ],
  },
  {
    id: "loss_response",
    question: "After a losing trade, what's your typical response?",
    description: "Understanding your emotional patterns helps personalize psychology insights.",
    dimension: "Emotional Response",
    options: [
      {
        value: "analytical",
        label: "Analyze and journal it",
        description: "Focus on learning from the loss",
        tags: ["emotion_analytical", "process_oriented", "growth_mindset"],
      },
      {
        value: "pause_reflect",
        label: "Take a break, then reflect",
        description: "Step away before analyzing",
        tags: ["emotion_measured", "self_aware", "disciplined"],
      },
      {
        value: "unaffected",
        label: "Move on quickly",
        description: "Accept it as part of trading",
        tags: ["emotion_detached", "experienced", "resilient"],
      },
      {
        value: "revenge_trade",
        label: "Sometimes feel urge to recover",
        description: "Tempted to make it back fast",
        tags: ["emotion_reactive", "revenge_tendency", "needs_structure"],
      },
    ],
  },
  {
    id: "experience_level",
    question: "How would you describe your trading experience?",
    description: "This helps us calibrate the depth of insights and explanations.",
    dimension: "Experience Level",
    options: [
      {
        value: "beginner",
        label: "Just getting started",
        description: "Less than 1 year of active trading",
        tags: ["experience_beginner", "learning", "new_trader"],
      },
      {
        value: "intermediate",
        label: "Building experience",
        description: "1–3 years of active trading",
        tags: ["experience_intermediate", "developing", "growing"],
      },
      {
        value: "advanced",
        label: "Experienced trader",
        description: "3+ years with consistent results",
        tags: ["experience_advanced", "skilled", "refined"],
      },
      {
        value: "professional",
        label: "Professional / Full-time",
        description: "Trading is my primary income",
        tags: ["experience_professional", "expert", "career_trader"],
      },
    ],
  },
  {
    id: "trading_session",
    question: "What session do you primarily trade?",
    description: "Understanding when you trade helps tailor market alerts and insights.",
    dimension: "Trading Session",
    options: [
      {
        value: "asian",
        label: "Asian Session",
        description: "Tokyo, Hong Kong, Singapore (00:00-09:00 GMT)",
        tags: ["session_asian", "timezone_asia"],
      },
      {
        value: "london",
        label: "London Session",
        description: "European markets (08:00-17:00 GMT)",
        tags: ["session_london", "timezone_europe"],
      },
      {
        value: "new_york",
        label: "New York Session",
        description: "US markets (13:00-22:00 GMT)",
        tags: ["session_new_york", "timezone_us"],
      },
      {
        value: "overlap",
        label: "Session Overlap",
        description: "Trade during London/NY overlap",
        tags: ["session_overlap", "high_volatility"],
      },
      {
        value: "all_sessions",
        label: "All Sessions",
        description: "Trade across multiple time zones",
        tags: ["session_all", "flexible_schedule"],
      },
    ],
  },
];

export type TraderProfileAnswers = {
  holding_time?: string;
  risk_per_trade?: string;
  trade_frequency?: string;
  decision_style?: string;
  loss_response?: string;
  experience_level?: string;
  trading_session?: string;
};
