import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sprout, Plus, Trash2, Calendar, MapPin, Layers, Settings, Compass, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Farm {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  acreage: number | null;
  soil_type: string | null;
  irrigation_type: string | null;
  created_at: string;
  updated_at: string;
}

interface FarmCrop {
  id: string;
  farm_id: string;
  crop: string;
  variety: string | null;
  sowing_date: string | null;
  expected_harvest_date: string | null;
  growth_stage: string | null;
  season: string | null;
  status: string | null;
  created_at: string;
}

const FarmsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<{ [farmId: string]: FarmCrop[] }>({});
  
  // Form State - New Farm
  const [farmName, setFarmName] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [farmAcreage, setFarmAcreage] = useState("");
  const [farmSoil, setFarmSoil] = useState("Loam");
  const [farmIrrigation, setFarmIrrigation] = useState("Drip");
  const [showAddFarm, setShowAddFarm] = useState(false);

  // Form State - New Crop
  const [activeFarmForCrop, setActiveFarmForCrop] = useState<string | null>(null);
  const [cropName, setCropName] = useState("");
  const [cropVariety, setCropVariety] = useState("");
  const [sowingDate, setSowingDate] = useState("");
  const [growthStage, setGrowthStage] = useState("Sowing");
  const [cropSeason, setCropSeason] = useState("Kharif");

  // Fetch all crops for a given list of farms
  const fetchCropsForFarms = useCallback(async (farmList: Farm[]) => {
    try {
      const farmIds = farmList.map(f => f.id);
      if (farmIds.length === 0) {
        setCrops({});
        return;
      }

      const { data, error } = await supabase
        .from("farm_crops")
        .select("*")
        .in("farm_id", farmIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const groupedCrops: { [farmId: string]: FarmCrop[] } = {};
      farmList.forEach(f => {
        groupedCrops[f.id] = [];
      });

      if (data) {
        (data as FarmCrop[]).forEach(c => {
          if (groupedCrops[c.farm_id]) {
            groupedCrops[c.farm_id].push(c);
          }
        });
      }
      setCrops(groupedCrops);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Error loading crops:", errMsg);
    }
  }, []);

  // Fetch all farms for the current user
  const fetchFarms = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("farms")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const farmData = (data || []) as Farm[];
      setFarms(farmData);
      await fetchCropsForFarms(farmData);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Error Loading Farms",
        description: errMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchCropsForFarms, toast]);

  // Auth Sync
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchFarms(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, fetchFarms]);

  // Handle Add Farm Submit
  const handleAddFarmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!farmName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please specify a farm name.",
      });
      return;
    }

    try {
      const { error } = await supabase.from("farms").insert({
        user_id: user.id,
        name: farmName.trim(),
        location: farmLocation.trim() || null,
        acreage: farmAcreage ? parseFloat(farmAcreage) : null,
        soil_type: farmSoil,
        irrigation_type: farmIrrigation,
      });

      if (error) throw error;

      toast({
        title: "Farm Registered",
        description: `${farmName} was added to your farm profiles successfully.`,
      });

      setFarmName("");
      setFarmLocation("");
      setFarmAcreage("");
      setShowAddFarm(false);
      fetchFarms(user.id);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Error Adding Farm",
        description: errMsg,
      });
    }
  };

  // Handle Add Crop Submit
  const handleAddCropSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeFarmForCrop) return;
    if (!cropName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please specify a crop name.",
      });
      return;
    }

    try {
      const { error } = await supabase.from("farm_crops").insert({
        farm_id: activeFarmForCrop,
        crop: cropName.trim(),
        variety: cropVariety.trim() || null,
        sowing_date: sowingDate || null,
        growth_stage: growthStage,
        season: cropSeason,
      });

      if (error) throw error;

      toast({
        title: "Crop Registered",
        description: `${cropName} was added to your crop profile successfully.`,
      });

      setCropName("");
      setCropVariety("");
      setSowingDate("");
      setActiveFarmForCrop(null);
      fetchFarms(user.id);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Error Adding Crop",
        description: errMsg,
      });
    }
  };

  // Handle Delete Farm
  const handleDeleteFarm = async (farmId: string, name: string) => {
    if (!user || !window.confirm(`Are you sure you want to delete ${name}? All connected crop entries will also be permanently deleted.`)) return;

    try {
      const { error } = await supabase.from("farms").delete().eq("id", farmId);
      if (error) throw error;

      toast({
        title: "Farm Deleted",
        description: `${name} has been removed.`,
      });
      fetchFarms(user.id);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Error Deleting Farm",
        description: errMsg,
      });
    }
  };

  // Handle Delete Crop
  const handleDeleteCrop = async (cropId: string, name: string) => {
    if (!user || !window.confirm(`Are you sure you want to delete crop entry for ${name}?`)) return;

    try {
      const { error } = await supabase.from("farm_crops").delete().eq("id", cropId);
      if (error) throw error;

      toast({
        title: "Crop Entry Deleted",
        description: `${name} has been removed.`,
      });
      fetchFarms(user.id);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast({
        variant: "destructive",
        title: "Error Deleting Crop",
        description: errMsg,
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col justify-between">
      <div>
        <Header user={user} />
        
        <main className="container max-w-6xl mx-auto px-4 py-8 fade-in-up-3d space-y-8">
          {/* Back button */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('dashboard')}
            </Button>

            <Button
              onClick={() => setShowAddFarm(!showAddFarm)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/10 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('addFarm')}
            </Button>
          </div>

          {/* Add Farm Card (Drawer/Collapsible style) */}
          {showAddFarm && (
            <Card className="glass-panel border-border/40 max-w-xl mx-auto rounded-3xl overflow-hidden shadow-xl animate-in slide-in-from-top-5 duration-300">
              <CardHeader className="bg-primary/5 border-b border-border/40 pb-4">
                <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-primary animate-pulse" /> Register New Farm
                </CardTitle>
                <CardDescription>Configure soil composition, size, and location for AI advice personalization.</CardDescription>
              </CardHeader>
              <form onSubmit={handleAddFarmSubmit}>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid gap-2">
                    <Label htmlFor="farm-name">Farm Name *</Label>
                    <Input
                      id="farm-name"
                      placeholder="e.g. Green Valley Field, North Orchard"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      required
                      className="rounded-xl border-border/60 focus-visible:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="farm-location">Location / City</Label>
                      <Input
                        id="farm-location"
                        placeholder="e.g. Anand, Junagadh"
                        value={farmLocation}
                        onChange={(e) => setFarmLocation(e.target.value)}
                        className="rounded-xl border-border/60 focus-visible:ring-primary"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="farm-acreage">{t('acreage')}</Label>
                      <Input
                        id="farm-acreage"
                        type="number"
                        step="0.1"
                        placeholder="e.g. 5.5, 12"
                        value={farmAcreage}
                        onChange={(e) => setFarmAcreage(e.target.value)}
                        className="rounded-xl border-border/60 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="farm-soil">{t('soilType')}</Label>
                      <Select value={farmSoil} onValueChange={setFarmSoil}>
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select Soil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Loam">Loam (લોમ)</SelectItem>
                          <SelectItem value="Clay">Clay (ચીકણી માટી)</SelectItem>
                          <SelectItem value="Sandy">Sandy (રેતાળ)</SelectItem>
                          <SelectItem value="Black">Black Soil (કાળી માટી)</SelectItem>
                          <SelectItem value="Red">Red Soil (લાલ માટી)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="farm-irrigation">{t('irrigationType')}</Label>
                      <Select value={farmIrrigation} onValueChange={setFarmIrrigation}>
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select Irrigation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Drip">Drip Irrigation</SelectItem>
                          <SelectItem value="Sprinkler">Sprinkler</SelectItem>
                          <SelectItem value="Flood">Flood Irrigation</SelectItem>
                          <SelectItem value="Rainfed">Rainfed (Rain-Only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t border-border/40 pt-4 pb-6 bg-card/20">
                  <Button type="button" variant="outline" onClick={() => setShowAddFarm(false)} className="rounded-xl">
                    {t('cancel')}
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6">
                    {t('save')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Add Crop Modal Dialog overlay */}
          {activeFarmForCrop && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="max-w-md w-full glass-panel border-border/40 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <CardHeader className="bg-primary/5 border-b border-border/40 pb-4">
                  <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" /> Register New Crop Cycles
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleAddCropSubmit}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-2">
                      <Label htmlFor="crop-name">{t('crop')} Name *</Label>
                      <Input
                        id="crop-name"
                        placeholder="e.g. Wheat, Rice, Cotton, Tomato"
                        value={cropName}
                        onChange={(e) => setCropName(e.target.value)}
                        required
                        className="rounded-xl border-border/60"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="crop-variety">{t('cropVariety')}</Label>
                      <Input
                        id="crop-variety"
                        placeholder="e.g. Lokwan, Hybrid-6"
                        value={cropVariety}
                        onChange={(e) => setCropVariety(e.target.value)}
                        className="rounded-xl border-border/60"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="sowing-date">{t('sowingDate')}</Label>
                      <Input
                        id="sowing-date"
                        type="date"
                        value={sowingDate}
                        onChange={(e) => setSowingDate(e.target.value)}
                        className="rounded-xl border-border/60"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="growth-stage">{t('growthStage')}</Label>
                        <Select value={growthStage} onValueChange={setGrowthStage}>
                          <SelectTrigger className="rounded-xl border-border/60">
                            <SelectValue placeholder="Growth Stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sowing">Sowing</SelectItem>
                            <SelectItem value="Vegetative">Vegetative</SelectItem>
                            <SelectItem value="Flowering">Flowering</SelectItem>
                            <SelectItem value="Fruiting">Fruiting</SelectItem>
                            <SelectItem value="Maturation">Maturation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="crop-season">{t('season')}</Label>
                        <Select value={cropSeason} onValueChange={setCropSeason}>
                          <SelectTrigger className="rounded-xl border-border/60">
                            <SelectValue placeholder="Select Season" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Kharif">Kharif (Monsoon)</SelectItem>
                            <SelectItem value="Rabi">Rabi (Winter)</SelectItem>
                            <SelectItem value="Zaid">Zaid (Summer)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 border-t border-border/40 pt-4 pb-6 bg-card/20">
                    <Button type="button" variant="outline" onClick={() => setActiveFarmForCrop(null)} className="rounded-xl">
                      {t('cancel')}
                    </Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6">
                      {t('save')}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
          )}

          {/* Farms Listing / Content grids */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            </div>
          ) : farms.length === 0 ? (
            <Card className="glass-panel border-border/40 p-12 text-center rounded-3xl max-w-lg mx-auto">
              <CardContent className="space-y-6">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Sprout className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">No Registered Farms Found</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Set up your first Farm Profile to unlock personalized IoT telemetry tracking, local weather forecasts, and custom AI crop rotation advice.
                  </p>
                </div>
                <Button onClick={() => setShowAddFarm(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl px-6">
                  Register Your First Farm
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {farms.map(farm => {
                const farmCropList = crops[farm.id] || [];
                return (
                  <Card key={farm.id} className="glass-panel border-border/40 hover:border-primary/20 rounded-3xl flex flex-col justify-between shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
                    <CardHeader className="bg-primary/5 pb-4 border-b border-border/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2">
                            <Compass className="w-5 h-5 text-primary" /> {farm.name}
                          </CardTitle>
                          {farm.location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-primary" /> {farm.location}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFarm(farm.id, farm.name)}
                          className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                          aria-label={`Delete ${farm.name}`}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="py-6 space-y-6">
                      {/* Farm details parameters */}
                      <div className="grid grid-cols-3 gap-2 bg-card/45 p-3.5 rounded-2xl border border-border/20 text-center text-xs">
                        <div>
                          <span className="text-muted-foreground font-semibold uppercase tracking-wider block text-[10px]">Acreage</span>
                          <span className="font-bold text-foreground text-sm mt-0.5 block">{farm.acreage ? `${farm.acreage} ac` : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold uppercase tracking-wider block text-[10px]">{t('soilType')}</span>
                          <span className="font-bold text-foreground text-sm mt-0.5 block">{farm.soil_type || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold uppercase tracking-wider block text-[10px]">Irrigation</span>
                          <span className="font-bold text-foreground text-sm mt-0.5 block">{farm.irrigation_type || "N/A"}</span>
                        </div>
                      </div>

                      {/* Connected Crop cycles */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-extrabold text-foreground flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-emerald-500" /> Active Crop Cycles ({farmCropList.length})
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveFarmForCrop(farm.id)}
                            className="h-8 rounded-xl text-xs hover:border-emerald-500/50 hover:bg-emerald-500/5"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Crop
                          </Button>
                        </div>

                        {farmCropList.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-border/50 rounded-2xl text-xs text-muted-foreground">
                            No active crop cycles registered for this field yet.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {farmCropList.map(crop => (
                              <div key={crop.id} className="flex justify-between items-center bg-card/60 p-3 rounded-2xl border border-border/30 hover:border-primary/10 transition-all">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground text-sm">{crop.crop}</span>
                                    {crop.variety && (
                                      <span className="text-xs px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary font-bold rounded-full">
                                        {crop.variety}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                    {crop.sowing_date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" /> Sown: {new Date(crop.sowing_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {crop.growth_stage && (
                                      <span className="flex items-center gap-1 uppercase text-[10px] bg-accent/30 text-accent-foreground font-extrabold px-1.5 py-0.5 rounded">
                                        {crop.growth_stage}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCrop(crop.id, crop.crop)}
                                  className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-xl"
                                  aria-label={`Delete ${crop.crop}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default FarmsPage;
