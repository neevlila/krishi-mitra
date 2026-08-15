import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CloudSun, Search, Wind, ThermometerSun, Droplets } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import WeatherIcon from './WeatherIcon';

interface WeatherData {
  name: string;
  main: {
    temp: number;
    humidity: number;
    feels_like: number;
  };
  weather: Array<{
    description: string;
    icon: string;
    main: string;
  }>;
  wind: {
    speed: number;
  };
}

const WeatherDetail = ({ icon, label, value, textColor }: { icon: React.ReactNode, label: string, value: string, textColor?: string }) => (
  <div className={`flex flex-col items-center text-center ${textColor}`}>
    <div className="mb-1">{icon}</div>
    <p className="text-sm font-medium">{value}</p>
    <p className="text-xs opacity-75">{label}</p>
  </div>
);

const WeatherWidget = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState("");
  const [unit, setUnit] = useState<'C' | 'F'>('C');

  const fetchWeatherForCity = useCallback(async (cityName: string) => {
    if (!cityName.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weather-service', {
        body: {
          city: cityName.trim(),
          lang: t('languageCode')
        }
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setWeather(data);
    } catch (error: unknown) {
      console.error("Weather API error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Weather service is currently unavailable.';
      toast({
        variant: "destructive",
        title: "Weather Service Error",
        description: errorMessage,
      });
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const fetchWeather = async () => {
    await fetchWeatherForCity(city);
  };

  useEffect(() => {
    const loadDefaultLocationWeather = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try getting latest farm location first
        const { data: farmData } = await supabase
          .from("farms")
          .select("location")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (farmData && farmData.length > 0 && farmData[0].location) {
          const defaultCity = farmData[0].location;
          setCity(defaultCity);
          fetchWeatherForCity(defaultCity);
          return;
        }

        // Fallback to profile location
        const { data: profileData } = await supabase
          .from("profiles")
          .select("location")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData?.location) {
          const defaultCity = profileData.location;
          setCity(defaultCity);
          fetchWeatherForCity(defaultCity);
        }
      } catch (err: unknown) {
        console.error("Failed to load user default location weather:", err);
      }
    };

    loadDefaultLocationWeather();
  }, [fetchWeatherForCity]);
  
  const convertTemp = (temp: number) => {
    if (unit === 'F') {
      return Math.round(temp * 9/5 + 32);
    }
    return Math.round(temp);
  };

  const isDark = theme === "dark";
  const cardBackground = !isDark 
    ? "bg-gradient-to-br from-primary/5 to-background text-foreground"
    : "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/40 text-white";

  const getWeatherDescription = (weatherData: WeatherData) => {
    const mainWeather = weatherData.weather[0].main.toLowerCase();
    const atmosphericConditions = ['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'];
    if (atmosphericConditions.includes(mainWeather)) {
      return t('foggy');
    }
    return weatherData.weather[0].description;
  };

  const textColor = !isDark ? "text-foreground" : "text-slate-100";
  const titleColor = !isDark ? "text-primary font-bold" : "text-emerald-400 font-bold";
  const iconColor = !isDark ? "text-primary" : "text-emerald-400";
  const toggleColor = !isDark ? "text-muted-foreground" : "text-slate-200";

  return (
    <Card className={`transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 border border-border/40 ${cardBackground}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CloudSun className={`w-5 h-5 ${iconColor}`} />
            <div className={titleColor}>
              {t('weatherInfo')}
            </div>
          </div>
          <ToggleGroup type="single" className={toggleColor} value={unit} onValueChange={(value) => value && setUnit(value as 'C' | 'F')} size="sm">
            <ToggleGroupItem value="C" className={isDark ? "text-slate-300 data-[state=on]:bg-white/10 data-[state=on]:text-white hover:text-white" : ""}>°C</ToggleGroupItem>
            <ToggleGroupItem value="F" className={isDark ? "text-slate-300 data-[state=on]:bg-white/10 data-[state=on]:text-white hover:text-white" : ""}>°F</ToggleGroupItem>
          </ToggleGroup>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={t('searchCity')}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchWeather()}
            className={`bg-background/70 ${isDark ? "border-slate-800 text-white placeholder:text-slate-400 focus-visible:ring-indigo-500" : ""}`}
          />
          <Button onClick={fetchWeather} disabled={loading || !city.trim()} className={isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white" : ""}>
            {loading ? t('loading') : <Search className="w-4 h-4" />}
            <span className="sr-only">{t('search')}</span>
          </Button>
        </div>
        
        {loading && (
          <div className="space-y-4 animate-pulse pt-4">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-16 w-16 bg-muted rounded-full"></div>
            </div>
            <div className="h-12 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        )}

        {weather && !loading && (
          <div className={`space-y-4 fade-in-up pt-4 ${textColor}`}>
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-center sm:text-left">
              {weather.weather[0].icon && (
                <WeatherIcon 
                  iconCode={weather.weather[0].icon} 
                  className={`w-24 h-24 ${iconColor}`}
                />
              )}
              <div className="flex-grow">
                <p className="font-semibold text-2xl">{weather.name}</p>
                <p className="text-6xl font-bold">{convertTemp(weather.main?.temp)}°</p>
                <p className="text-lg capitalize">
                  {getWeatherDescription(weather)}
                </p>
              </div>
            </div>
            <div className={`grid grid-cols-3 gap-4 pt-4 border-t ${!isDark ? "border-foreground/10" : "border-white/10"}`}>
              <WeatherDetail 
                icon={<Droplets size={20} className={iconColor} />} 
                label={t('humidityLabel')} 
                value={`${weather.main?.humidity}%`} 
                textColor={textColor}
              />
              <WeatherDetail 
                icon={<ThermometerSun size={20} className={iconColor} />} 
                label={t('feelsLikeLabel')} 
                value={`${convertTemp(weather.main?.feels_like)}°${unit}`} 
                textColor={textColor}
              />
              <WeatherDetail 
                icon={<Wind size={20} className={iconColor} />} 
                label={t('windLabel')} 
                value={`${weather.wind?.speed.toFixed(1)} m/s`} 
                textColor={textColor}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
