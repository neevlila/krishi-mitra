import { Button } from "@/components/ui/button";
import { Sprout, LogOut, Moon, Sun, Globe, Home, Leaf, TrendingUp, Camera, Mail, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: any;
}

const Header = ({ user }: HeaderProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      navigate("/auth");
    }
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: t('dashboard') },
    { to: '/advisory', icon: Leaf, label: t('advisory') },
    { to: '/market', icon: TrendingUp, label: t('market') },
    { to: '/diagnosis', icon: Camera, label: t('diagnosis') },
    { to: '/contact', icon: Mail, label: t('contact') },
  ];

  return (
    <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 shadow-lg shadow-primary/30">
              <Sprout className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">{t('appName')}</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">{t('tagline')}</p>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="transition-all hover:ring-2 hover:ring-primary/50">
                    <Globe className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                    English {language === 'en' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('hi')} className="cursor-pointer">
                    हिंदी {language === 'hi' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage('gu')} className="cursor-pointer">
                    ગુજરાતી {language === 'gu' && '✓'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme Toggle */}
              <Button variant="outline" size="icon" onClick={toggleTheme} className="transition-all hover:ring-2 hover:ring-primary/50">
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>

              {/* Combined Navigation and User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="transition-all hover:ring-2 hover:ring-primary/50">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Signed in as</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {navItems.map(item => (
                    <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)} className={cn("cursor-pointer", location.pathname === item.to && "bg-accent")}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
