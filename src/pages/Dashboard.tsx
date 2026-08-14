import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import WeatherWidget from "@/components/WeatherWidget";
import ChatbotWidget from "@/components/ChatbotWidget";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Leaf, Gauge, Camera, Sparkles, Compass, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good Morning");
    else if (hrs < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) {
    return null;
  }

  const username = user.user_metadata?.full_name || user.email?.split("@")[0] || "Farmer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col justify-between">
      <div>
        <Header user={user} />
        
        <main className="container max-w-6xl mx-auto px-4 py-8 fade-in-up-3d space-y-10">
          
          {/* Premium Glassmorphic Welcome Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-border/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            {/* Background ambient light */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-emerald-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-primary/20 relative">
                {username.charAt(0).toUpperCase()}
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-card rounded-full" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                  {greeting}, {username}! <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                </h1>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {t('welcome')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
              IoT nodes synced
            </div>
          </div>

          {/* Redesigned Navigation Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Advisory Workspace Card */}
            <div
              className="cursor-pointer group bg-card/40 hover:bg-card/75 border border-border/40 hover:border-primary/30 p-6 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
              onClick={() => navigate('/advisory')}
            >
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center group-hover:scale-115 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-foreground tracking-tight">{t('advisory')}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
                      Get personalized AI recommendations on fertilizer application, crop rotation, and season rules.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-primary font-bold tracking-wide uppercase mt-2 group-hover:gap-2.5 transition-all">
                  Open advisory <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Climate Workspace Card */}
            <div
              className="cursor-pointer group bg-card/40 hover:bg-card/75 border border-border/40 hover:border-emerald-500/30 p-6 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1"
              onClick={() => navigate('/climate')}
            >
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-115 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:text-slate-950 transition-all duration-300 shadow-sm">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-foreground tracking-tight">{t('market')}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
                      Monitor live IoT farm feeds tracking soil index status, moisture levels, temperature, and nutrients.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold tracking-wide uppercase mt-2 group-hover:gap-2.5 transition-all">
                  Monitor telemetry <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Diagnosis Workspace Card */}
            <div
              className="cursor-pointer group bg-card/40 hover:bg-card/75 border border-border/40 hover:border-accent/30 p-6 rounded-3xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1"
              onClick={() => navigate('/diagnosis')}
            >
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent border border-accent/20 flex items-center justify-center group-hover:scale-115 group-hover:bg-accent group-hover:text-slate-950 transition-all duration-300 shadow-sm">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-foreground tracking-tight">{t('diagnosis')}</h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
                      Upload photos of damaged crop leaves to instantly identify plant diseases and get remedy advices.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-accent font-bold tracking-wide uppercase mt-2 group-hover:gap-2.5 transition-all">
                  Scan diagnostics <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

          </div>

          {/* Weather Telemetry Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-foreground font-extrabold text-lg">
              <Compass className="w-5 h-5 text-primary" />
              <span>Location Telemetry</span>
            </div>
            <WeatherWidget />
          </div>

        </main>
      </div>

      {/* Floating Chatbot Outside Main to prevent Fixed cutoffs */}
      <ChatbotWidget />

      {/* Shared Premium Footer */}
      <Footer />
    </div>
  );
};

export default Dashboard;
