import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CloudSun, Search, Wind, ThermometerSun, Droplets } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

const WeatherDetail = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex flex-col items-center text-center">
    <div className="text-primary mb-1">{icon}</div>
    <p className="text-sm font-medium">{value}</p>
    <p className="text-xs">{label}</p>
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

  const fetchWeather = async () => {
    if (!city.trim()) return;
    const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
    if (!WEATHER_API_KEY || WEATHER_API_KEY.startsWith('3***')) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Weather API key is not configured in .env file.",
        });
        return;
    }
    
    setLoading(true);
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=${t('languageCode')}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch weather data for the specified city.');
        }
        const data = await response.json();
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
  };
  
  const convertTemp = (temp: number) => {
    if (unit === 'F') {
      return Math.round(temp * 9/5 + 32);
    }
    return Math.round(temp);
  };

  const cardBackground = theme === 'dark'
    ? "bg-gradient-to-br from-slate-800 to-indigo-950"
    : "bg-gradient-to-br from-primary/5 to-background";

  const getWeatherDescription = (weatherData: WeatherData) => {
    const mainWeather = weatherData.weather[0].main.toLowerCase();
    const atmosphericConditions = ['mist', 'smoke', 'haze', 'dust', 'fog', 'sand', 'ash', 'squall', 'tornado'];
    if (atmosphericConditions.includes(mainWeather)) {
      return t('foggy');
    }
    return weatherData.weather[0].description;
  };

  return (
    <Card className={`transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 ${cardBackground}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-primary" />
            <div className="text-primary">
            {t('weatherInfo')}
            </div>
          </div>
          <ToggleGroup type="single" className = "text-primary" value={unit} onValueChange={(value) => value && setUnit(value as 'C' | 'F')} size="sm">
            <ToggleGroupItem value="C">°C</ToggleGroupItem>
            <ToggleGroupItem value="F">°F</ToggleGroupItem>
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
            className="bg-background/70"
          />
          <Button onClick={fetchWeather} disabled={loading || !city.trim()}>
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
          <div className="space-y-4 fade-in-up pt-4 text-foreground">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-center sm:text-left">
              {weather.weather[0].icon && (
                <WeatherIcon 
                  iconCode={weather.weather[0].icon} 
                  className="w-24 h-24 text-primary"
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
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-foreground/10">
              <WeatherDetail 
                icon={<Droplets size={20} />} 
                label={t('humidityLabel')} 
                value={`${weather.main?.humidity}%`} 
              />
              <WeatherDetail 
                icon={<ThermometerSun size={20} />} 
                label={t('feelsLikeLabel')} 
                value={`${convertTemp(weather.main?.feels_like)}°${unit}`} 
              />
              <WeatherDetail 
                icon={<Wind size={20} />} 
                label={t('windLabel')} 
                value={`${weather.wind?.speed.toFixed(1)} m/s`} 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
