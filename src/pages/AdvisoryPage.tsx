import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Leaf, ArrowLeft, Calendar, Trash, Trash2, Archive, Sprout } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Advisory {
  id: string;
  user_id: string;
  diagnosis: string;
  advice: string;
  created_at: string;
}

const AdvisoryFormatter = ({ advice }: { advice: string }) => {
  try {
    const parsed = JSON.parse(advice);
    
    const renderValue = (value: unknown, depth = 0): JSX.Element => {
      if (typeof value === 'string') {
        return <p className="ml-4 whitespace-pre-wrap">{value}</p>;
      }
      if (Array.isArray(value)) {
        return (
          <div className={depth > 0 ? 'ml-4' : ''}>
            {value.map((item, index) => {
              const keyName = Object.keys(item)[0];
              return (
                <div key={index} className="mb-3 p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-primary mb-1 capitalize">
                    {keyName.replace(/_/g, ' ')}
                  </div>
                  {renderValue(item[keyName], depth + 1)}
                </div>
              );
            })}
          </div>
        );
      }

      if (typeof value === 'object' && value !== null) {
        return (
          <div className={depth > 0 ? 'ml-4' : ''}>
            {Object.entries(value).map(([key, val]) => (
              <div key={key} className="mb-2">
                <h5 className="font-semibold text-foreground capitalize">
                  {key.replace(/_/g, ' ').replace(/^\d+\s+/, '')}:
                </h5>
                {renderValue(val, depth + 1)}
              </div>
            ))}
          </div>
        );
      }
      return <p className="ml-4">{String(value)}</p>;
    };

    return <div className="space-y-3">{renderValue(parsed)}</div>;
  } catch {
    return <p className="whitespace-pre-wrap">{advice}</p>;
  }
};

interface UserFarm {
  id: string;
  name: string;
  location: string | null;
}

interface UserCrop {
  id: string;
  crop: string;
  variety: string | null;
  season: string | null;
  farm_id: string;
  farms: UserFarm | null;
}

const AdvisoryPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [crop, setCrop] = useState("");
  const [location, setLocation] = useState("");
  const [season, setSeason] = useState("");
  const [loading, setLoading] = useState(false);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | 'all' | null>(null);

  // Farm Context States
  const [userCrops, setUserCrops] = useState<UserCrop[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string>("manual");

  const fetchAdvisories = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("advisory_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching advisories:", error);
    } else if (data) {
      setAdvisories(data);
    }
  }, [user]);

  const fetchUserCrops = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("farm_crops")
        .select(`
          id,
          crop,
          variety,
          season,
          farm_id,
          farms:farm_id (
            id,
            name,
            location
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setUserCrops(data as unknown as UserCrop[]);
      }
    } catch (err: unknown) {
      console.error("Error fetching user farm crops:", err);
    }
  }, [user]);

  useEffect(() => {
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

  useEffect(() => {
    if (user) {
      fetchAdvisories();
      fetchUserCrops();
    }
  }, [user, fetchAdvisories, fetchUserCrops]);

  const handleCropSelectChange = (val: string) => {
    setSelectedCropId(val);
    if (val === "manual") {
      setCrop("");
      setLocation("");
      setSeason("");
      return;
    }
    const found = userCrops.find(c => c.id === val);
    if (found) {
      setCrop(found.crop + (found.variety ? ` (${found.variety})` : ""));
      setLocation(found.farms?.location || "");
      setSeason(found.season || "");
    }
  };

  const confirmDelete = async () => {
    if (!user || !itemToDelete) return;

    try {
      if (itemToDelete === 'all') {
        const { error } = await supabase.from("advisory_logs").delete().eq("user_id", user.id);
        if (error) throw error;
        toast({ title: "Success", description: "All advisory history has been deleted." });
      } else {
        const { error } = await supabase.from("advisory_logs").delete().eq("id", itemToDelete);
        if (error) throw error;
        toast({ title: "Success", description: "Advisory has been deleted." });
      }
      await fetchAdvisories();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleGetAdvice = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const { data, error } = await supabase.functions.invoke('crop-advisory', {
            body: {
                crop,
                location,
                season,
                languageCode: t('languageCode')
            }
        });

        if (error) {
            throw new Error(error.message || JSON.stringify(error));
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        await supabase.from("advisory_logs").insert({
            user_id: user.id,
            diagnosis: data.diagnosis,
            advice: JSON.stringify(data.advice),
        });

        toast({
            title: t('advice'),
            description: data.diagnosis,
        });

        setCrop("");
        setLocation("");
        setSeason("");
        setSelectedCropId("manual");
        fetchAdvisories();
    } catch (error: unknown) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : 'An error occurred while fetching advice.',
        });
    } finally {
        setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8 fade-in-up-3d">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('dashboard')}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="h-fit glass-panel border border-border/40 shadow-lg hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Leaf className="w-5 h-5 text-primary" />
                {t('aiAdvisory')}
              </CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
               {userCrops.length > 0 && (
                 <div className="space-y-1.5 mb-2">
                   <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                     {t('farmProfile')} Selection
                   </span>
                   <Select value={selectedCropId} onValueChange={handleCropSelectChange}>
                     <SelectTrigger className="rounded-xl bg-background/50 border-border">
                       <SelectValue placeholder="Select Crop Profile" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="manual">Enter Details Manually</SelectItem>
                       {userCrops.map(c => (
                         <SelectItem key={c.id} value={c.id}>
                           {c.crop} {c.variety ? `(${c.variety})` : ''} - {c.farms?.name || 'Field'}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
               <Input
                 placeholder={t('crop')}
                 value={crop}
                 onChange={(e) => setCrop(e.target.value)}
                 className="bg-background/50 border-border focus:ring-2 focus:ring-primary/50"
               />
               <Input
                 placeholder={t('location')}
                 value={location}
                 onChange={(e) => setLocation(e.target.value)}
                 className="bg-background/50 border-border focus:ring-2 focus:ring-primary/50"
               />
               <Input
                 placeholder={t('season')}
                 value={season}
                 onChange={(e) => setSeason(e.target.value)}
                 className="bg-background/50 border-border focus:ring-2 focus:ring-primary/50"
               />
              <Button
                onClick={handleGetAdvice}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/95 hover:to-emerald-500/95"
              >
                {loading ? `${t('diagnosing')}` : t('getAdvice')}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-panel border border-border/40 shadow-lg hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/20 pb-4">
              <CardTitle className="text-foreground">{t('advisoryHistory')}</CardTitle>
              {advisories.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest('all')} className="rounded-lg shadow">
                  <Trash className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {advisories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                    <Archive className="w-16 h-16 mb-4 text-primary/30" />
                    <h3 className="text-lg font-semibold text-foreground">No History Found</h3>
                    <p>Your generated farm advisories will appear here.</p>
                  </div>
                ) : (
                  advisories.map((advisory) => (
                    <Card key={advisory.id} className="border-l-4 border-l-primary transition-all duration-300 hover:shadow-md hover:border-l-primary/70 group relative">
                       <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleDeleteRequest(advisory.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(advisory.created_at), "PPP 'at' p")}
                        </div>
                        <div>
                          <h4 className="font-semibold text-primary mb-1">{t('diagnosis')}:</h4>
                          <p className="text-sm text-foreground">{advisory.diagnosis}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-secondary mb-1">{t('advice')}:</h4>
                          <div className="text-sm text-muted-foreground space-y-2">
                            {typeof advisory.advice === 'string' && advisory.advice.trim().startsWith('{') ? (
                              <AdvisoryFormatter advice={advisory.advice} />
                            ) : (
                              <p className="whitespace-pre-wrap">{advisory.advice}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              {itemToDelete === 'all' ? ' all advisory history' : ' advisory entry'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdvisoryPage;
