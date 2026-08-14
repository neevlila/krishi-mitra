import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Sprout, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isResettingPassword) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            setIsForgotPassword(false);
            setIsResettingPassword(true);
        }
        if (session && event === 'SIGNED_IN' && !isResettingPassword) {
            navigate("/dashboard");
        }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isResettingPassword]);

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({
            title: "Check your email",
            description: "A password reset link has been sent to your email address.",
        });
        setEmailSent(true);
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
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (signUpError) throw signUpError;
        
        toast({
          title: "Success!",
          description: t('checkEmail'),
        });
        setEmailSent(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
        navigate("/dashboard");
      }
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your password has been successfully updated.",
      });
      setIsResettingPassword(false);
      navigate("/dashboard");
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

  // Form: Ask for recovery email
  const renderForgotPasswordEmailForm = () => (
    <div className="space-y-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Reset Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to receive a password reset link.
        </p>
      </div>
      <form onSubmit={handlePasswordResetRequest} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 bg-background/50 focus:ring-2 focus:ring-primary/45 border-border"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary hover:to-emerald-500 rounded-xl" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <button onClick={() => { setIsForgotPassword(false); setEmailSent(false); }} className="underline font-semibold text-primary hover:text-primary/85">
          Back to Sign In
        </button>
      </div>
    </div>
  );

  // Form: Set new password after link confirmation redirect
  const renderNewPasswordForm = () => (
    <div className="space-y-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Set New Password</h1>
        <p className="text-sm text-muted-foreground">
          Your reset link is verified. Choose a strong new password.
        </p>
      </div>
      <form onSubmit={handleUpdatePassword} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="pl-10 pr-10 bg-background/50 focus:ring-2 focus:ring-primary/45 border-border"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary hover:to-emerald-500 rounded-xl" disabled={loading}>
          {loading ? "Saving..." : "Update Password"}
        </Button>
      </form>
    </div>
  );

  // Card displayed when email confirmation link is sent
  const renderEmailSentCard = () => (
    <div className="space-y-6 text-center py-4">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
        <Mail className="w-8 h-8 text-primary animate-bounce-slow" />
      </div>
      <h2 className="text-2xl font-extrabold text-foreground">Verify your email</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        A confirmation link has been sent to <strong className="text-foreground">{email}</strong>.
      </p>
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-left leading-relaxed">
        <strong>⚠️ Development Note:</strong> Because this site is running on <code>localhost</code>, clicking the confirmation link on your mobile phone will fail. Please open the email and click the confirmation link **on this PC** to log in successfully.
      </div>
      <Button 
        onClick={() => setEmailSent(false)} 
        variant="outline" 
        className="w-full rounded-xl bg-card border-border hover:bg-muted"
      >
        Back to Login
      </Button>
    </div>
  );

  const renderAuthForm = () => (
    <div className="space-y-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{isSignUp ? t('signUp') : t('signIn')}</h1>
        <p className="text-xs text-muted-foreground">
          {isSignUp ? "Create an account to get started" : "Enter your credentials to access your account"}
        </p>
      </div>
      <form onSubmit={handleAuthAction} className="grid gap-4">
        {isSignUp && (
          <div className="grid gap-2">
            <Label htmlFor="fullname" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('fullName')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
              <Input
                id="fullname"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="pl-10 bg-background/50 focus:ring-2 focus:ring-primary/45 border-border"
              />
            </div>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 bg-background/50 focus:ring-2 focus:ring-primary/45 border-border"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('password')}</Label>
            {!isSignUp && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsForgotPassword(true);
                }}
                className="ml-auto inline-block text-xs underline text-primary font-semibold hover:text-primary/85"
              >
                Forgot your password?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-10 pr-10 bg-background/50 focus:ring-2 focus:ring-primary/45 border-border"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full mt-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary hover:to-emerald-500 rounded-xl shadow-lg shadow-primary/20" disabled={loading}>
          {loading ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? t('signUp') : t('signIn'))}
        </Button>

        <div className="flex items-center gap-3 my-2">
          <div className="h-px bg-border flex-1" />
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">or</div>
          <div className="h-px bg-border flex-1" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl bg-card/45 border-border hover:bg-card/90 shadow-sm"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="16" height="16" className="mr-2.5">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C34.7 32.9 30.2 36 24 36c-7.7 0-14-6.3-14-14s6.3-14 14-14c3.6 0 6.8 1.3 9.3 3.5l6.6-6.6C35.6 3.7 30.1 2 24 2 12.9 2 3.6 11.3 3.6 22.4S12.9 42.8 24 42.8c11.1 0 20.4-9.3 20.4-20.4 0-1.4-.1-2.8-.8-3.8z"/>
            <path fill="#FF3D00" d="M6.3 14.6l7.6 5.6C15 17.6 19.2 14 24 14c3.6 0 6.8 1.3 9.3 3.5l6.6-6.6C35.6 3.7 30.1 2 24 2 16.8 2 10.4 6.7 6.3 14.6z"/>
            <path fill="#4CAF50" d="M24 42.8c6.1 0 11.6-2.1 15.8-5.7l-7.3-5.9C29.9 32.9 27 34 24 34c-6.2 0-10.7-3.1-13-7.8l-7.6 5.6C9.6 38.6 16.3 42.8 24 42.8z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.2-6 6.6v0c0 .1 0 .1 0 .1 3.6 0 6.8-1.3 9.3-3.5l6.6-6.6C45 24.1 45 21.8 43.6 20.5z"/>
          </svg>
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </Button>
      </form>
      <div className="text-center text-sm pt-2 border-t border-border/10">
        {isSignUp ? t('alreadyHaveAccount') : t('dontHaveAccount')}{" "}
        <button onClick={() => setIsSignUp(!isSignUp)} className="underline font-semibold text-primary hover:text-primary/85 ml-1">
          {isSignUp ? t('signIn') : t('signUp')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-12 bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Form Side */}
      <div className="lg:col-span-5 flex flex-col justify-center items-center py-12 px-6 sm:px-12 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Home
        </Button>
        <div className="w-full max-w-md p-8 sm:p-10 rounded-2xl border border-border/40 glass-panel shadow-2xl fade-in-up-3d">
          {emailSent ? (
            renderEmailSentCard()
          ) : isResettingPassword ? (
            renderNewPasswordForm()
          ) : isForgotPassword ? (
            renderForgotPasswordEmailForm()
          ) : (
            renderAuthForm()
          )}
        </div>
      </div>

      {/* Picture Show Side */}
      <div className="hidden lg:block lg:col-span-7 relative overflow-hidden h-full group">
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80"
          alt="Premium Farm Sunrise"
          className="absolute inset-0 w-full h-full object-cover transition-transform ease-out group-hover:scale-105"
          style={{ transitionDuration: "12000ms" }}
          loading="eager"
        />
        
        {/* Gradient Layer Overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/90 via-emerald-900/35 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        {/* Branding badge bottom left */}
        <div className="absolute bottom-0 left-0 p-16 text-white flex items-center gap-5 z-10">
          <div className="w-16 h-16 bg-primary/90 backdrop-blur rounded-2xl flex items-center justify-center shadow-2xl border border-white/20">
            <Sprout className="w-9 h-9 text-primary-foreground animate-bounce-slow" />
          </div>
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight drop-shadow-md">{t("appName")}</h2>
            <p className="text-lg opacity-85 mt-1 font-medium tracking-wide drop-shadow">{t("tagline")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
