import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Droplet, 
  Thermometer, 
  Sun, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Wind,
  Gauge,
  Sparkles,
  RefreshCw
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Helper translation dict for page specific texts
const pageTranslations = {
  en: {
    title: "IoT Soil & Climate Dashboard",
    desc: "Real-time agro-sensor diagnostics and environmental simulators",
    sensors: "Live Sensor Feeds",
    controls: "Environmental Simulators",
    analytics: "Historical Climate Logs",
    recommendations: "Agro-Intelligence Advisories",
    moisture: "Soil Moisture",
    temp: "Soil Temperature",
    nitrogen: "Nitrogen (N)",
    phosphorus: "Phosphorus (P)",
    potassium: "Potassium (K)",
    solar: "Solar Radiation",
    rainSim: "Simulate Heavy Rain",
    sprinklerSim: "Automatic Sprinklers",
    fertilizerSim: "Apply Organic Fertilizer",
    healthIndex: "Soil Health Index",
    excellent: "Excellent Condition",
    good: "Good Condition",
    warning: "Warning: Critical nutrient deficiency",
    critical: "Critical Alert: Dry Soil & Heat stress"
  },
  hi: {
    title: "IoT मिट्टी और जलवायु डैशबोर्ड",
    desc: "वास्तविक समय कृषि-सेंसर निदान और पर्यावरण सिमुलेटर",
    sensors: "लाइव सेंसर फीड",
    controls: "पर्यावरण सिमुलेटर",
    analytics: "ऐतिहासिक जलवायु लॉग",
    recommendations: "कृषि-इंटेलिजेंस सलाह",
    moisture: "मिट्टी की नमी",
    temp: "मिट्टी का तापमान",
    nitrogen: "नाइट्रोजन (N)",
    phosphorus: "फास्फोरस (P)",
    potassium: "पोटेशियम (K)",
    solar: "सौर विकिरण",
    rainSim: "भारी बारिश सिम्युलेट करें",
    sprinklerSim: "स्वचालित स्प्रिंकलर",
    fertilizerSim: "जैविक उर्वरक डालें",
    healthIndex: "मिट्टी स्वास्थ्य सूचकांक",
    excellent: "उत्कृष्ट स्थिति",
    good: "अच्छी स्थिति",
    warning: "चेतावनी: गंभीर पोषक तत्वों की कमी",
    critical: "गंभीर चेतावनी: सूखी मिट्टी और गर्मी का तनाव"
  },
  gu: {
    title: "IoT માટી અને આબોહવા ડેશબોર્ડ",
    desc: "રીઅલ-ટાઇમ કૃષિ-સેન્સર નિદાન અને પર્યાવરણ સિમ્યુલેટર્સ",
    sensors: "લાઇવ સેન્સર ફીડ્સ",
    controls: "પર્યાવરણ સિમ્યુલેટર્સ",
    analytics: "ઐતિહાસિક આબોહવા લોગ",
    recommendations: "કૃષિ-ઇન્ટેલિજન્સ સલાહ",
    moisture: "માટીનો ભેજ",
    temp: "માટીનું તાપમાન",
    nitrogen: "નાઇટ્રોજન (N)",
    phosphorus: "ફોસ્ફરસ (P)",
    potassium: "પોટેશિયમ (K)",
    solar: "સૌર કિરણોત્સર્ગ",
    rainSim: "ભારે વરસાદનું અનુકરણ કરો",
    sprinklerSim: "સ્વચાલિત સ્પ્રિંકલર",
    fertilizerSim: "સેન્દ્રિય ખાતર લાગુ કરો",
    healthIndex: "માટી આરોગ્ય સૂચકાંક",
    excellent: "ઉત્કૃષ્ટ સ્થિતિ",
    good: "સારી સ્થિતિ",
    warning: "ચેતવણી: ગંભીર પોષક તત્વોની ઉણપ",
    critical: "ગંભીર ચેતવણી: સૂકી માટી અને ગરમીની તાણ"
  }
};

const ClimatePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);

  // Sensor location states
  const [locationName, setLocationName] = useState<string>("Detecting Location...");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState("");

  // IoT Sensor state simulation values
  const [moisture, setMoisture] = useState<number>(45);
  const [temperature, setTemperature] = useState<number>(28);
  const [nitrogen, setNitrogen] = useState<number>(65);
  const [phosphorus, setPhosphorus] = useState<number>(50);
  const [potassium, setPotassium] = useState<number>(75);
  const [solar, setSolar] = useState<number>(600);

  // Simulator controls
  const [rainActive, setRainActive] = useState<boolean>(false);
  const [sprinklerActive, setSprinklerActive] = useState<boolean>(false);

  // Localized text translations
  const lang = language === 'hi' ? pageTranslations.hi : language === 'gu' ? pageTranslations.gu : pageTranslations.en;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch the farm location from user's Supabase profile
  useEffect(() => {
    if (!user) return;
    const fetchProfileLocation = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("location")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data && data.location) {
          setLocationName(data.location);
        } else {
          setLocationName("Punjab, India");
        }
      } catch (err) {
        console.error("Error fetching location:", err);
        setLocationName("Punjab, India");
      }
    };
    fetchProfileLocation();
  }, [user]);

  // Geolocation trigger
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            const city = data.city || data.locality || `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;
            
            // Save to DB
            const { error } = await supabase
              .from("profiles")
              .update({ location: city })
              .eq("user_id", user?.id);
            if (error) throw error;

            setLocationName(city);
            toast({
              title: "Location Auto-Detected",
              description: `Agro-sensors aligned to ${city}`
            });
          } catch {
            const coords = `${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`;
            await supabase.from("profiles").update({ location: coords }).eq("user_id", user?.id);
            setLocationName(coords);
            toast({
              title: "Location Auto-Detected",
              description: `Agro-sensors aligned to coordinates ${coords}`
            });
          }
        },
        () => {
          toast({
            variant: "destructive",
            title: "Geolocation Failed",
            description: "Unable to retrieve your GPS coordinates."
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Your browser does not support geolocation."
      });
    }
  };

  // Manual update handler
  const handleSaveLocation = async () => {
    if (!user || !tempLocation.trim()) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ location: tempLocation })
        .eq("user_id", user.id);
      
      if (error) throw error;
      setLocationName(tempLocation);
      setIsEditingLocation(false);
      toast({
        title: "Location Updated",
        description: `Agro-sensor location successfully set to ${tempLocation}`
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        variant: "destructive",
        title: "Error updating location",
        description: errorMessage
      });
    }
  };

  // Rain Simulation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rainActive) {
      interval = setInterval(() => {
        setMoisture(prev => Math.min(prev + 4, 98));
        setTemperature(prev => Math.max(prev - 0.5, 20));
        setSolar(prev => Math.max(prev - 25, 150));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [rainActive]);

  // Sprinkler (Irrigation) Simulation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sprinklerActive) {
      interval = setInterval(() => {
        setMoisture(prev => Math.min(prev + 2, 85));
        setTemperature(prev => Math.max(prev - 0.2, 24));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sprinklerActive]);

  // Automatic Rain Toggle off after reaching certain limits
  useEffect(() => {
    if (moisture >= 95 && rainActive) {
      setRainActive(false);
      toast({
        title: "Rain Simulation Stopped",
        description: "Soil moisture has saturated at maximum levels."
      });
    }
  }, [moisture, rainActive, toast]);

  // Trigger organic fertilizer
  const handleApplyFertilizer = () => {
    setNitrogen(prev => Math.min(prev + 20, 100));
    setPhosphorus(prev => Math.min(prev + 15, 100));
    setPotassium(prev => Math.min(prev + 15, 100));
    toast({
      title: "Fertilizer Applied",
      description: "NPK nutrients loaded into the simulated topsoil."
    });
  };

  // Reset sensors to standard base state
  const handleResetSensors = () => {
    setMoisture(45);
    setTemperature(28);
    setNitrogen(65);
    setPhosphorus(50);
    setPotassium(75);
    setSolar(600);
    setRainActive(false);
    setSprinklerActive(false);
    toast({
      title: "Sensors Reset",
      description: "Sensor metrics reverted to baseline levels."
    });
  };

  // Mathematical Health Index calculation based on current sensor state
  const computeHealthIndex = () => {
    // Perfect state: moisture=60%, temp=24C, N=80, P=70, K=80
    const mDiff = Math.abs(moisture - 60);
    const tDiff = Math.abs(temperature - 24);
    const nDiff = Math.abs(nitrogen - 80);
    const pDiff = Math.abs(phosphorus - 70);
    const kDiff = Math.abs(potassium - 80);
    
    const penalty = (mDiff * 0.8) + (tDiff * 1.2) + (nDiff * 0.4) + (pDiff * 0.4) + (kDiff * 0.4);
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  };

  const healthIndex = computeHealthIndex();

  const getHealthStatus = () => {
    if (moisture < 20 || temperature > 38) {
      return { status: "critical", label: lang.critical, color: "text-red-500 bg-red-500/10 border-red-500/20" };
    }
    if (nitrogen < 40 || phosphorus < 30 || potassium < 40) {
      return { status: "warning", label: lang.warning, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    }
    if (healthIndex > 80) {
      return { status: "excellent", label: lang.excellent, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    }
    return { status: "good", label: lang.good, color: "text-primary bg-primary/10 border-primary/20" };
  };

  const currentStatus = getHealthStatus();

  // Dynamically calculate the past 7 weekdays ending with today
  const getPast7Days = () => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      result.push(daysOfWeek[d.getDay()]);
    }
    return result;
  };

  const dayLabels = getPast7Days();

  // Simulated 7-day trend chart log data relative to current weekday
  const trendData = [
    { name: dayLabels[0], moisture: 42, temp: 29, health: 76 },
    { name: dayLabels[1], moisture: 40, temp: 30, health: 74 },
    { name: dayLabels[2], moisture: 38, temp: 31, health: 71 },
    { name: dayLabels[3], moisture: 55, temp: 26, health: 86 }, // After irrigation
    { name: dayLabels[4], moisture: 60, temp: 25, health: 91 },
    { name: dayLabels[5], moisture: 52, temp: 27, health: 88 },
    { name: dayLabels[6], moisture: moisture, temp: temperature, health: healthIndex } // Today
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8 fade-in-up">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetSensors}
            className="text-muted-foreground hover:text-foreground w-fit ml-auto md:ml-0"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Simulated Values
          </Button>
        </div>

        {/* Dashboard Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Gauge className="w-8 h-8 text-emerald-500 animate-pulse" />
            {lang.title}
          </h1>
          <p className="text-muted-foreground">{lang.desc}</p>
        </div>

        {/* Active Sensor Node Location Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 p-4 bg-card/60 backdrop-blur rounded-lg border border-border text-sm shadow-sm transition-all">
          <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Active IoT Sensor Node:
          </div>
          {isEditingLocation ? (
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                className="bg-background border border-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48"
                value={tempLocation}
                onChange={(e) => setTempLocation(e.target.value)}
                placeholder="Enter city or coords"
              />
              <Button size="sm" onClick={handleSaveLocation} className="text-xs h-7 py-0.5 px-3">
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingLocation(false)} className="text-xs h-7 py-0.5 px-3">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <span className="text-foreground font-medium">{locationName}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setTempLocation(locationName);
                  setIsEditingLocation(true);
                }} 
                className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2"
              >
                Edit Location
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDetectLocation} 
                className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2"
              >
                Auto-Detect GPS
              </Button>
            </div>
          )}
        </div>

        {/* Diagnostic Status Panel */}
        <div className={`p-5 rounded-xl border mb-8 flex flex-col md:flex-row items-center gap-4 transition-all duration-300 ${currentStatus.color}`}>
          {currentStatus.status === "excellent" || currentStatus.status === "good" ? (
            <CheckCircle className="w-10 h-10 shrink-0" />
          ) : (
            <AlertTriangle className="w-10 h-10 shrink-0 animate-bounce" />
          )}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold uppercase tracking-wider">{lang.healthIndex}: {healthIndex}/100</h3>
            <p className="text-sm opacity-90">{currentStatus.label}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 backdrop-blur border border-current text-sm font-semibold uppercase">
            <Activity className="w-4 h-4" />
            Live Status
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 card-3d-wrap">
          {/* Column 1: Live Sensors (2 Columns wide in desktop) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border border-border/40 bg-card/50 backdrop-blur-md glass-panel card-3d shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  {lang.sensors}
                </CardTitle>
                <CardDescription>Calibrated live feeds mapping current simulated physical values</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {/* Sensor: Moisture */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/30 backdrop-blur flex flex-col justify-between h-36 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lang.moisture}</span>
                    <Droplet className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{moisture}%</span>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${moisture}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Sensor: Temperature */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/30 backdrop-blur flex flex-col justify-between h-36 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lang.temp}</span>
                    <Thermometer className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{temperature.toFixed(1)}°C</span>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (temperature / 50) * 100))}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Sensor: N Nutrient */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/30 backdrop-blur flex flex-col justify-between h-36 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lang.nitrogen}</span>
                    <Sparkles className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{nitrogen} ppm</span>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${nitrogen}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Sensor: P Nutrient */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/30 backdrop-blur flex flex-col justify-between h-36 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lang.phosphorus}</span>
                    <Sparkles className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{phosphorus} ppm</span>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${phosphorus}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Sensor: K Nutrient */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/30 backdrop-blur flex flex-col justify-between h-36 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lang.potassium}</span>
                    <Sparkles className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{potassium} ppm</span>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${potassium}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Sensor: Solar Radiation */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/30 backdrop-blur flex flex-col justify-between h-36 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">{lang.solar}</span>
                    <Sun className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{solar} W/m²</span>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, (solar / 1200) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recharts Analytics Logs */}
            <Card className="border border-border/40 bg-card/50 backdrop-blur-md glass-panel card-3d shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Wind className="w-5 h-5 text-primary" />
                  {lang.analytics}
                </CardTitle>
                <CardDescription>Simulated historical sensor log logs mapping soil index trends</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMoisture)" />
                      <Area type="monotone" dataKey="health" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHealth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Simulated sliders & interactive panel */}
          <div className="space-y-8">
            <Card className="border border-border/40 bg-card/50 backdrop-blur-md h-full glass-panel card-3d shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Activity className="w-5 h-5 text-secondary" />
                  {lang.controls}
                </CardTitle>
                <CardDescription>Alter raw parameters and observe live recalculation results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Moisture Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{lang.moisture}</span>
                    <span className="text-blue-500">{moisture}%</span>
                  </div>
                  <Slider
                    defaultValue={[moisture]}
                    value={[moisture]}
                    onValueChange={(val) => setMoisture(val[0])}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Temp Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{lang.temp}</span>
                    <span className="text-orange-500">{temperature}°C</span>
                  </div>
                  <Slider
                    defaultValue={[temperature]}
                    value={[temperature]}
                    onValueChange={(val) => setTemperature(val[0])}
                    max={50}
                    min={0}
                    step={1}
                  />
                </div>

                {/* Nitrogen Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{lang.nitrogen}</span>
                    <span className="text-emerald-500">{nitrogen} ppm</span>
                  </div>
                  <Slider
                    defaultValue={[nitrogen]}
                    value={[nitrogen]}
                    onValueChange={(val) => setNitrogen(val[0])}
                    max={100}
                    step={1}
                  />
                </div>

                {/* Toggles / Actions */}
                <hr className="border-border my-6" />
                
                {/* Toggle: Heavy Rain */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{lang.rainSim}</span>
                    <span className="text-xs text-muted-foreground">Animates moisture & drops temperature</span>
                  </div>
                  <Switch
                    checked={rainActive}
                    onCheckedChange={(checked) => {
                      setRainActive(checked);
                      if (checked) setSprinklerActive(false); // mutually exclusive
                    }}
                  />
                </div>

                {/* Toggle: Sprinklers */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{lang.sprinklerSim}</span>
                    <span className="text-xs text-muted-foreground">Increases moisture steadily</span>
                  </div>
                  <Switch
                    checked={sprinklerActive}
                    onCheckedChange={(checked) => {
                      setSprinklerActive(checked);
                      if (checked) setRainActive(false); // mutually exclusive
                    }}
                  />
                </div>

                {/* Action: Fertilizer */}
                <Button
                  onClick={handleApplyFertilizer}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 border-primary/20 bg-primary/10 hover:bg-primary/20 text-primary"
                >
                  <Sparkles className="w-4 h-4" />
                  {lang.fertilizerSim}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Diagnostic Advisories Card */}
        <Card className="border border-border/40 bg-card/50 backdrop-blur-md glass-panel card-3d shadow-xl mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              {lang.recommendations}
            </CardTitle>
            <CardDescription>AI sensor assessment and smart farming guidelines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthIndex > 80 ? (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm">
                <strong>Soil Health Optimal:</strong> The current moisture, nutrient ratio, and temperature parameters are perfectly suited for maximum root aeration and high yields. Continue current irrigation schedules.
              </div>
            ) : healthIndex > 50 ? (
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm">
                <strong>Nutrient Rebalancing Recommended:</strong> Nutrient levels (NPK) are slightly below target points. Consider applying mild compost or organic fertilizer to restore index value above 80.
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-sm space-y-2">
                <p><strong>Warning - Heat/Drought Stress Flagged:</strong> Soil parameters have degraded into critical limits. High temperatures or low moisture levels will impair root absorption.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Trigger automated sprinklers immediately to restore moisture level above 40%.</li>
                  <li>Add organic mulching to shield topsoil and prevent solar moisture loss.</li>
                  <li>Avoid applying concentrated chemical fertilizers until soil moisture stabilizes.</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClimatePage;
