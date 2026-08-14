import { useLanguage } from "@/contexts/LanguageContext";
import { Sprout } from "lucide-react";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-card/50 backdrop-blur border-t border-border/40 mt-24 py-12 shrink-0">
      <div className="container max-w-6xl mx-auto px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <Sprout className="w-5 h-5 animate-bounce-slow" />
            <span>{t('appName')}</span>
          </div>
          <p className="text-muted-foreground text-xs max-w-md">
            Smart Farmer Empowerment — Empowering farmers with real-time AI crop advisory, live soil monitoring, and diagnostics.
          </p>
          <hr className="w-16 border-border/60 my-2" />
          <p className="text-[11px] text-muted-foreground/80 font-medium">
            &copy; {new Date().getFullYear()} Neev Lila. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
