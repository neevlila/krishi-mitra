import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { lazy, Suspense } from "react";
import Landing from "./pages/Landing";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdvisoryPage = lazy(() => import("./pages/AdvisoryPage"));
const ClimatePage = lazy(() => import("./pages/ClimatePage"));
const DiagnosisPage = lazy(() => import("./pages/DiagnosisPage"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const FarmsPage = lazy(() => import("./pages/FarmsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { AlertCircle, Terminal } from "lucide-react";

const queryClient = new QueryClient();

const ConfigurationFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
    {/* Decorative background glows */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

    <div className="max-w-xl w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-100 tracking-tight">Database Connection Required</h1>
          <p className="text-xs text-slate-400">Krishi-Mitra Platform Setup</p>
        </div>
      </div>

      <div className="text-sm text-slate-300 leading-relaxed space-y-3">
        <p>
          It looks like the application is running in production, but has not been connected to your **Supabase database** yet.
        </p>
        <p>
          Please configure the following environment variables in your hosting provider's dashboard (Vercel, Netlify, etc.) to bring the platform online:
        </p>
      </div>

      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span>Variable Name</span>
          <span>Status</span>
        </div>
        <hr className="border-slate-800" />
        <div className="flex items-center justify-between">
          <span className="text-slate-300">VITE_SUPABASE_URL</span>
          <span className="text-rose-500 font-bold bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">Missing</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">VITE_SUPABASE_PUBLISHABLE_KEY</span>
          <span className="text-rose-500 font-bold bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">Missing</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5" /> How to fix:
        </h3>
        <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside pl-1 leading-relaxed">
          <li>Go to your **Vercel or Netlify project settings** (Settings &gt; Environment Variables).</li>
          <li>Add **`VITE_SUPABASE_URL`** and copy the API URL from your Supabase Dashboard.</li>
          <li>Add **`VITE_SUPABASE_PUBLISHABLE_KEY`** and copy the `anon` key from your Supabase Dashboard.</li>
          <li>Save the variables, trigger a **new deployment**, and refresh this page.</li>
        </ol>
      </div>

      <div className="pt-2">
        <button 
          onClick={() => window.location.reload()} 
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-indigo-600/15"
        >
          Check Connection & Refresh
        </button>
      </div>
    </div>
  </div>
);

const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/15" />
      <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
    </div>
  </div>
);

const App = () => {
  if (!isSupabaseConfigured) {
    return <ConfigurationFallback />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/advisory" element={<AdvisoryPage />} />
                  <Route path="/climate" element={<ClimatePage />} />
                  <Route path="/diagnosis" element={<DiagnosisPage />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/farms" element={<FarmsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
