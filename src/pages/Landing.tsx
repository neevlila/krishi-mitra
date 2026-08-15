import { Sprout, Leaf, Gauge, Camera, CloudSun, Moon, Sun, ShieldCheck, Thermometer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import Footer from "@/components/Footer";

const Landing = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col justify-between">
      
      {/* Sticky Premium Navbar */}
      <header className="border-b border-border/40 bg-background/60 backdrop-blur sticky top-0 z-40 w-full transition-all">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 font-extrabold text-lg text-foreground cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Sprout className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="tracking-tight">{t('appName')}</span>
          </div>
          
          {/* Menu Actions */}
          <div className="flex items-center gap-4">
            
            {/* Lang Dropdown Selector */}
            <div className="flex items-center border border-border bg-card/65 rounded-full p-0.5 shadow-sm text-[10px] sm:text-xs">
              <button 
                onClick={() => setLanguage('en')} 
                className={`px-2.5 py-1 rounded-full transition-all ${language === 'en' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('hi')} 
                className={`px-2.5 py-1 rounded-full transition-all ${language === 'hi' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                HI
              </button>
              <button 
                onClick={() => setLanguage('gu')} 
                className={`px-2.5 py-1 rounded-full transition-all ${language === 'gu' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                GU
              </button>
            </div>

            {/* Dark Mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full h-9 w-9 bg-card border border-border hover:bg-muted inline-flex items-center justify-center"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Auth CTA button */}
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="rounded-full px-5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/10 border border-primary"
            >
              {t('signIn')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1">
        
        {/* Hero Section */}
        <div className="container max-w-6xl mx-auto px-4 py-16 sm:py-20 fade-in-up-3d">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
            
            {/* Title / Description */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-6">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center shadow-sm">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs uppercase tracking-widest text-primary font-extrabold px-3.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                  Pro Agriculture Hub
                </span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-foreground tracking-tight leading-none">
                {t('appName')}
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl text-primary font-bold tracking-wide">
                {t('tagline')}
              </p>
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t('welcome')}
              </p>
              
              <div className="flex gap-4 justify-center lg:justify-start flex-wrap pt-2">
                <button
                  type="button"
                  className="text-base px-8 py-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary hover:to-emerald-500 rounded-xl text-primary-foreground font-medium"
                  onClick={() => navigate('/auth')}
                >
                  {t('getStarted')}
                </button>
                <button
                  type="button"
                  className="text-base px-8 py-6 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all bg-card border border-border hover:bg-card/90 text-foreground"
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {t('learnMore')}
                </button>
              </div>
            </div>

            {/* Orbiting Plant Graphics */}
            <div className="lg:col-span-5 flex justify-center items-center relative card-3d-wrap py-12">
              <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-primary/10 to-accent/15 absolute blur-3xl -z-10" />
              
              {/* Plant Mockup Card */}
              <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-3xl glass-panel flex flex-col items-center justify-center border border-white/20 dark:border-white/5 shadow-2xl float-slow card-3d relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 mb-5 relative">
                  <Leaf className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground animate-bounce-slow" />
                  <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-20" />
                </div>
                <div className="font-extrabold text-base text-foreground tracking-tight">Crop Diagnostic Node</div>
                <p className="text-[10px] text-muted-foreground mt-1">Simulating Live Crop Analysis</p>

                {/* Orbiting metric 1 */}
                <div className="absolute -top-6 -left-8 bg-card/90 border border-border/40 backdrop-blur rounded-2xl p-3 shadow-lg flex items-center gap-2 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Thermometer className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Temp</div>
                    <div className="text-xs font-bold text-foreground mt-0.5">28.5 °C</div>
                  </div>
                </div>

                {/* Orbiting metric 2 */}
                <div className="absolute -bottom-4 -right-6 bg-card/90 border border-border/40 backdrop-blur rounded-2xl p-3 shadow-lg flex items-center gap-2 animate-bounce-slow" style={{ animationDelay: '2s' }}>
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="text-[9px] text-muted-foreground font-semibold uppercase leading-none">Soil index</div>
                    <div className="text-xs font-bold text-foreground mt-0.5">94 / 100</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="mt-28">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-foreground mb-16 tracking-tight">
              {t('features')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* Feature 1 */}
              <div className="glass-panel p-6 rounded-2xl border border-border/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center mb-5 border border-primary/20">
                  <Leaf className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-3">
                  {t('aiAdvisory')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('aiAdvisoryDesc')}
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel p-6 rounded-2xl border border-border/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mb-5 border border-emerald-500/20">
                  <Gauge className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-3">
                  {t('marketLinkage')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('marketLinkageDesc')}
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel p-6 rounded-2xl border border-border/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-accent/15 rounded-xl flex items-center justify-center mb-5 border border-accent/20">
                  <Camera className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-3">
                  {t('cropDiagnosis')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('cropDiagnosisDesc')}
                </p>
              </div>

              {/* Feature 4 */}
              <div className="glass-panel p-6 rounded-2xl border border-border/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center mb-5 border border-primary/20">
                  <CloudSun className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-3">
                  {t('weatherInfo')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('weatherInfoDesc')}
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Premium Footer */}
      <Footer />
    </div>
  );
};

export default Landing;
