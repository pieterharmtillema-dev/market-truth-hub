import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, Shield } from "lucide-react";
import { z } from "zod";
import traxLogo from "@/assets/trax-dino-logo.png";
import trexOpen from "@/assets/trex-open.png";
import trexClosed from "@/assets/trex-closed.png";


const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

// Time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "GM", emoji: "☀️" };
  if (hour >= 12 && hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (hour >= 17 && hour < 21) return { text: "Good evening", emoji: "🌅" };
  return { text: "Welcome back", emoji: "🌙" };
};

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordAnimating, setIsPasswordAnimating] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [glowBurst, setGlowBurst] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Check if user needs onboarding
        const { data: traderProfile } = await supabase
          .from("trader_profiles")
          .select("onboarding_completed, onboarding_skipped")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (traderProfile && !traderProfile.onboarding_completed && !traderProfile.onboarding_skipped) {
          setLoginSuccess(true);
          setTimeout(() => navigate("/onboarding"), 800);
        } else {
          setLoginSuccess(true);
          setTimeout(() => navigate("/"), 800);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Username availability check
  useEffect(() => {
    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(trimmedUsername.length > 0 ? "Username must be at least 3 characters" : null);
      return;
    }

    try {
      usernameSchema.parse(trimmedUsername);
      setUsernameError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setUsernameError(error.errors[0].message);
        setUsernameAvailable(null);
        return;
      }
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from("public_profiles")
          .select("display_name")
          .ilike("display_name", trimmedUsername)
          .maybeSingle();

        if (error) {
          setUsernameAvailable(null);
        } else {
          setUsernameAvailable(!data);
        }
      } catch {
        // Silent catch
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const togglePasswordVisibility = () => {
    setIsPasswordAnimating(true);
    setShowPassword(!showPassword);
    setTimeout(() => setIsPasswordAnimating(false), 300);
  };

  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ 
          title: "Hmm, that doesn't look right", 
          description: "That wallet... uh, email doesn't look valid 😅", 
          variant: "destructive" 
        });
        return false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ 
          title: "Password too short", 
          description: "Need at least 6 characters to keep things secure 🔐", 
          variant: "destructive" 
        });
        return false;
      }
    }

    if (isSignUp) {
      try {
        usernameSchema.parse(username.trim().toLowerCase());
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({ title: "Invalid username", description: error.errors[0].message, variant: "destructive" });
          return false;
        }
      }

      if (!usernameAvailable) {
        toast({ title: "Username taken", description: "That handle's already claimed 😬", variant: "destructive" });
        return false;
      }
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;

    setGlowBurst(true);
    setTimeout(() => setGlowBurst(false), 600);

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({ 
            title: "Wrong credentials", 
            description: "Wrong password — even pros miss sometimes 😉", 
            variant: "destructive" 
          });
        } else {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    setGlowBurst(true);
    setTimeout(() => setGlowBurst(false), 600);

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { display_name: username.trim().toLowerCase() },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Already one of us!",
            description: "That wallet... uh, email is already registered. Try signing in.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Welcome to the pack! 🦖", description: "You're now signed in." });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-ambient"
          style={{
            background: 'radial-gradient(circle, hsl(var(--trax) / 0.08) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full animate-ambient"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.05) 0%, transparent 70%)',
            animationDelay: '-10s',
          }}
        />
      </div>

      <Card className="w-full max-w-md pt-2 relative animate-card-enter border-border/50 bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center pt-6 pb-0 space-y-0">
          {/* Time-based greeting */}
          <p className="text-sm text-muted-foreground mb-2">
            {greeting.text} {greeting.emoji}
          </p>

          {/* Logo with glow and animations */}
          <div 
            className="relative flex justify-center mb-0"
            onMouseEnter={() => { setIsHovered(true); setShowTooltip(true); }}
            onMouseLeave={() => { setIsHovered(false); setShowTooltip(false); }}
          >
            {/* Reactive glow behind logo */}
            <div 
              className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${glowBurst ? 'animate-glow-burst' : 'animate-glow-pulse'}`}
              style={{
                filter: `blur(40px)`,
                opacity: isFocused || isHovered ? 0.7 : 0.4,
              }}
            >
              <div 
                className="w-32 h-32 rounded-full"
                style={{ background: 'hsl(var(--trax))' }}
              />
            </div>

            {/* Logo */}
            <img
  src={showPassword ? trexClosed : trexOpen}
  alt="Trax Mascot"
  className={`relative h-40 w-auto animate-mascot-idle transition-transform duration-300 ${
    isHovered ? "scale-105" : ""
  }`}
/>



            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full z-10 animate-fade-in">
                <div className="bg-card border border-border/50 rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                  <p className="text-xs text-muted-foreground">I track trades. I don't bite. 🦖</p>
                </div>
              </div>
            )}
          </div>

          <CardDescription className="mt-2 mb-0 text-base">
            Track it. Trade it. <span className="text-[hsl(var(--trax))] font-medium">Trax it.</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={isLoading}
                    required
                    className="transition-all duration-200 focus:shadow-[0_0_0_2px_hsl(var(--trax)/0.2)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      disabled={isLoading}
                      required
                      className="pr-10 transition-all duration-200 focus:shadow-[0_0_0_2px_hsl(var(--trax)/0.2)]"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className={`w-4 h-4 ${isPasswordAnimating ? 'animate-eye-blink' : ''}`} />
                      ) : (
                        <Eye className={`w-4 h-4 ${isPasswordAnimating ? 'animate-eye-blink' : ''}`} />
                      )}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--trax)/0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_hsl(var(--trax)/0.3)]" 
                  disabled={isLoading || loginSuccess}
                >
                  {loginSuccess ? (
                    <CheckCircle className="h-5 w-5 animate-checkmark text-background" />
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                {/* Trust badge */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <Shield className="w-3 h-3 text-muted-foreground/50" />
                  <p className="text-[10px] text-muted-foreground/50 tracking-wide">
                    Your data stays yours. Always.
                  </p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <div className="relative">
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="your_handle"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      disabled={isLoading}
                      required
                      maxLength={20}
                      className="pr-10 transition-all duration-200 focus:shadow-[0_0_0_2px_hsl(var(--trax)/0.2)]"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {!isCheckingUsername && usernameAvailable === true && (
                        <CheckCircle className="w-4 h-4 text-gain" />
                      )}
                      {!isCheckingUsername && usernameAvailable === false && <XCircle className="w-4 h-4 text-loss" />}
                    </div>
                  </div>
                  {usernameError && <p className="text-xs text-loss">{usernameError}</p>}
                  {!usernameError && usernameAvailable === false && (
                    <p className="text-xs text-loss">That handle's already claimed</p>
                  )}
                  {!usernameError && usernameAvailable === true && (
                    <p className="text-xs text-gain">Nice! It's yours</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={isLoading}
                    required
                    className="transition-all duration-200 focus:shadow-[0_0_0_2px_hsl(var(--trax)/0.2)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      disabled={isLoading}
                      required
                      className="pr-10 transition-all duration-200 focus:shadow-[0_0_0_2px_hsl(var(--trax)/0.2)]"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className={`w-4 h-4 ${isPasswordAnimating ? 'animate-eye-blink' : ''}`} />
                      ) : (
                        <Eye className={`w-4 h-4 ${isPasswordAnimating ? 'animate-eye-blink' : ''}`} />
                      )}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--trax)/0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_hsl(var(--trax)/0.3)]" 
                  disabled={isLoading || loginSuccess}
                >
                  {loginSuccess ? (
                    <CheckCircle className="h-5 w-5 animate-checkmark text-background" />
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Join the Pack 🦖"
                  )}
                </Button>

                {/* Trust badge */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <Shield className="w-3 h-3 text-muted-foreground/50" />
                  <p className="text-[10px] text-muted-foreground/50 tracking-wide">
                    Your alpha starts here. Non-custodial.
                  </p>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
