import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Leaf, ArrowLeft, Calendar, Trash, Trash2, Archive } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
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

  useEffect(() => {
    if (user) {
      fetchAdvisories();
    }
  }, [user, fetchAdvisories]);

  const handleDeleteRequest = (id: string | 'all') => {
    setItemToDelete(id);
    setDialogOpen(true);
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
      await fetchAdvisories(); // Re-fetch data to ensure UI is in sync with DB
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleGetAdvice = async () => {
    if (!user) return;
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('A***')) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Gemini API key is not configured in .env file.",
        });
        return;
    }

    setLoading(true);
    try {
        const languageMap: { [key: string]: string } = {
            'en': 'English',
            'hi': 'Hindi',
            'gu': 'Gujarati'
        };
        const responseLang = languageMap[t('languageCode') as keyof typeof languageMap] || 'English';

        const prompt = `You are an expert agricultural advisor. Provide farming advice in ${responseLang} language for:
        Crop: ${crop || 'general farming'}
        Location: ${location || 'not specified'}
        Season: ${season || 'current season'}
        
        IMPORTANT: Provide the ENTIRE response in ${responseLang} language, including all headings, labels, and content.
        
        Format your response as JSON with this EXACT structure:
        {
          "diagnosis": "Brief summary in ${responseLang}",
          "advice": {
            "0_best_practices": {
              "title": "Title in ${responseLang}",
              "details": "Details in ${responseLang}"
            },
            "1_common_challenges": {
              "title": "Title in ${responseLang}",
              "details": "Details in ${responseLang}"
            },
            "2_recommended_fertilizers": {
              "title": "Title in ${responseLang}",
              "details": "Details in ${responseLang}"
            },
            "3_irrigation_management": {
              "title": "Title in ${responseLang}",
              "details": "Details in ${responseLang}"
            },
            "4_harvesting_guidance": {
              "title": "Title in ${responseLang}",
              "details": "Details in ${responseLang}"
            }
          }
        }
        
        Remember: ALL text must be in ${responseLang}, and use 0-based indexing (start from 0, not 1).`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            throw new Error(`AI advisory service failed: ${response.status}`);
        }

        const responseData = await response.json();
        const text = responseData.candidates[0].content.parts[0].text;
        
        let result;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Failed to parse AI response.");
            }
        } catch (e) {
            console.error('JSON parse error:', e);
            throw new Error("Received an invalid response from the AI advisory service.");
        }

        await supabase.from("advisory_logs").insert({
            user_id: user.id,
            diagnosis: result.diagnosis,
            advice: JSON.stringify(result.advice),
        });

        toast({
            title: t('advice'),
            description: result.diagnosis,
        });

        setCrop("");
        setLocation("");
        setSeason("");
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
      
      <main className="container mx-auto px-4 py-8 fade-in-up">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('dashboard')}
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                {t('aiAdvisory')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={t('crop')}
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
              />
              <Input
                placeholder={t('location')}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Input
                placeholder={t('season')}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
              <Button
                onClick={handleGetAdvice}
                disabled={loading}
                className="w-full"
              >
                {loading ? `${t('diagnosing')}` : t('getAdvice')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('advisoryHistory')}</CardTitle>
              {advisories.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest('all')}>
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
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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
