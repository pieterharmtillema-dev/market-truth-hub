import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { z } from "zod";
import traxLogo from "@/assets/trax-dino-logo.png";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check username availability with debounce
  useEffect(() => {
    const trimmedUsername = username.trim().toLowerCase();
    
    // Reset state if username is too short
    if (trimmedUsername.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(trimmedUsername.length > 0 ? "Username must be at least 3 characters" : null);
      return;
    }

    // Validate format
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
          console.error("Error checking username:", error);
          setUsernameAvailable(null);
        } else {
          setUsernameAvailable(!data);
        }
      } catch (err) {
        console.error("Error checking username:", err);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid email", description: error.errors[0].message, variant: "destructive" });
        return false;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Invalid password", description: error.errors[0].message, variant: "destructive" });
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
        toast({ title: "Username taken", description: "Please choose a different username", variant: "destructive" });
        return false;
      }
    }

    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({ title: "Login failed", description: "Invalid email or password", variant: "destructive" });
        } else {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: username.trim().toLowerCase(),
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({ title: "Account exists", description: "This email is already registered. Try signing in.", variant: "destructive" });
        } else {
          toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Account created!", description: "You're now signed in." });
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img src={traxLogo} alt="Trax Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl">Trax</CardTitle>
          <CardDescription>Track your trades and predictions</CardDescription>
        </CardHeader>
        <CardContent>
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
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
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
                      placeholder="your_username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      disabled={isLoading}
                      required
                      maxLength={20}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingUsername && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {!isCheckingUsername && usernameAvailable === true && (
                        <CheckCircle className="w-4 h-4 text-gain" />
                      )}
                      {!isCheckingUsername && usernameAvailable === false && (
                        <XCircle className="w-4 h-4 text-loss" />
                      )}
                    </div>
                  </div>
                  {usernameError && (
                    <p className="text-xs text-loss">{usernameError}</p>
                  )}
                  {!usernameError && usernameAvailable === false && (
                    <p className="text-xs text-loss">Username is already taken</p>
                  )}
                  {!usernameError && usernameAvailable === true && (
                    <p className="text-xs text-gain">Username is available</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
