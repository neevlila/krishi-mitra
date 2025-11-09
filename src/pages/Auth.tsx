import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Sprout } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            setIsForgotPassword(false);
        }
        if (session && event === 'SIGNED_IN') {
            navigate("/dashboard");
        }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/`,
        });
        if (error) throw error;
        toast({
            title: "Check your email",
            description: "A password reset link has been sent to your email address.",
        });
        setIsForgotPassword(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message,
        });
    } finally {
        setLoading(false);
    }
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let error;
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        error = signUpError;
        if (!error) {
          toast({
            title: "Success!",
            description: t('checkEmail'),
          });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        error = signInError;
        if (!error) {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
        }
      }

      if (error) throw error;

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      // Supabase will redirect the user to the provider's consent screen.
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google sign-in failed",
        description: error.message || "Unable to start Google sign-in.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderForgotPassword = () => (
    <>
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="text-balance text-muted-foreground">
          Enter your email to receive a password reset link.
        </p>
      </div>
      <form onSubmit={handlePasswordReset} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        Remember your password?{" "}
        <button onClick={() => setIsForgotPassword(false)} className="underline font-semibold text-primary">
          Back to Sign In
        </button>
      </div>
    </>
  );

  const renderAuthForm = () => (
    <>
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-bold">{isSignUp ? t('signUp') : t('signIn')}</h1>
        <p className="text-balance text-muted-foreground">
          {isSignUp ? "Create an account to get started" : "Enter your credentials to access your account"}
        </p>
      </div>
      <form onSubmit={handleAuthAction} className="grid gap-4">
        {isSignUp && (
          <div className="grid gap-2">
            <Label htmlFor="fullname">{t('fullName')}</Label>
            <Input
              id="fullname"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">{t('password')}</Label>
            {!isSignUp && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsForgotPassword(true);
                }}
                className="ml-auto inline-block text-sm underline text-primary"
              >
                Forgot your password?
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? t('signUp') : t('signIn'))}
        </Button>

        <div className="flex items-center gap-3 mt-2">
          <div className="h-px bg-muted-foreground/30 flex-1" />
          <div className="text-sm text-muted-foreground">or</div>
          <div className="h-px bg-muted-foreground/30 flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full mt-2"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" className="mr-2">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 32.9 30.2 36 24 36c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.6 0 6.8 1.3 9.3 3.5l6.6-6.6C35.6 3.7 30.1 2 24 2 12.9 2 3.6 11.3 3.6 22.4S12.9 42.8 24 42.8c11.1 0 20.4-9.3 20.4-20.4 0-1.4-.1-2.8-.8-3.8z"/>
            <path fill="#FF3D00" d="M6.3 14.6l7.6 5.6C15 17.6 19.2 14 24 14c3.6 0 6.8 1.3 9.3 3.5l6.6-6.6C35.6 3.7 30.1 2 24 2 16.8 2 10.4 6.7 6.3 14.6z"/>
            <path fill="#4CAF50" d="M24 42.8c6.1 0 11.6-2.1 15.8-5.7l-7.3-5.9C29.9 32.9 27 34 24 34c-6.2 0-10.7-3.1-13-7.8l-7.6 5.6C9.6 38.6 16.3 42.8 24 42.8z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.2-6 6.6v0c0 .1 0 .1 0 .1 3.6 0 6.8-1.3 9.3-3.5l6.6-6.6C45 24.1 45 21.8 43.6 20.5z"/>
          </svg>
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </Button>
      </form>
      <div className="mt-4 text-center text-sm">
        {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}{" "}
        <button onClick={() => setIsSignUp(!isSignUp)} className="underline font-semibold text-primary">
          {isSignUp ? t('signIn') : t('signUp')}
        </button>
      </div>
    </>
  );

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-[380px] gap-6">
          {isForgotPassword ? renderForgotPassword() : renderAuthForm()}
        </div>
      </div>
      <div className="hidden lg:block relative overflow-hidden bg-black" style={{ maxWidth: "1024px", maxHeight: "1536px" }}>
        <img
          src="https://i.ibb.co/fYLB1LfS/Krishi-mitra-1.png"
          alt="Morning Farm Field"
          className="absolute inset-0 w-full h-full"
          style={{
            width: "100%",
            height: "100%",
          }}
          loading="eager"
          decoding="async"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
        {/* Branding section */}
        <div className="absolute bottom-0 left-0 p-12 text-white flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
            <Sprout className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-4xl font-bold">{t("appName")}</h2>
            <p className="text-xl mt-1">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
