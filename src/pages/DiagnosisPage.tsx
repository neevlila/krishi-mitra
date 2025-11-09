import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Camera, ArrowLeft, Calendar, Trash, Trash2, Archive } from "lucide-react";
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

interface Diagnostic {
  id: string;
  user_id: string;
  image_url: string;
  diagnosis: string;
  advice: string;
  confidence: number;
  created_at: string;
}

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

const DiagnosisPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
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

  const fetchDiagnostics = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("crop_diagnostics")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching diagnostics:", error);
    } else if (data) {
      setDiagnostics(data);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDiagnostics();
    }
  }, [user, fetchDiagnostics]);

  const handleDeleteRequest = (id: string | 'all') => {
    setItemToDelete(id);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || !itemToDelete) return;

    try {
      if (itemToDelete === 'all') {
        const { data: items, error: fetchError } = await supabase.from("crop_diagnostics").select("image_url").eq("user_id", user.id);
        if (fetchError) throw fetchError;

        const { error: dbError } = await supabase.from("crop_diagnostics").delete().eq("user_id", user.id);
        if (dbError) throw dbError;

        if (items && items.length > 0) {
          const paths = items.map(item => item.image_url.split('/crop-images/')[1]).filter(Boolean);
          if(paths.length > 0) {
            await supabase.storage.from('crop-images').remove(paths);
          }
        }
        
        toast({ title: "Success", description: "All diagnosis history has been deleted." });
      } else {
        const item = diagnostics.find(d => d.id === itemToDelete);
        if (!item) return;

        const { error: dbError } = await supabase.from("crop_diagnostics").delete().eq("id", itemToDelete);
        if (dbError) throw dbError;

        const path = item.image_url.split('/crop-images/')[1];
        if (path) {
          await supabase.storage.from('crop-images').remove([path]);
        }
        
        toast({ title: "Success", description: "Diagnosis has been deleted." });
      }
      await fetchDiagnostics(); // Re-fetch data to ensure UI is in sync with DB
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !user) return;
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith('A***')) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Gemini API key is not configured in .env file.",
        });
        return;
    }

    setUploading(true);
    try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('crop-images')
            .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('crop-images')
            .getPublicUrl(fileName);

        const base64Image = await fileToBase64(imageFile);
        const imageBase64Data = base64Image.split(',')[1];

        const languageMap: { [key: string]: string } = {
            'en': 'English',
            'hi': 'Hindi',
            'gu': 'Gujarati'
        };
        const responseLang = languageMap[t('languageCode') as keyof typeof languageMap] || 'English';
        
        const prompt = `You are an expert agricultural AI assistant specializing in crop disease diagnosis. 
        Analyze this image of a crop/plant and provide your ENTIRE response in ${responseLang} language.
        
        CRITICAL: Every single word, label, heading, and piece of content MUST be in ${responseLang} language.
        
        1. Diagnosis: Identify any diseases, pests, or health issues visible in the image (in ${responseLang})
        2. Confidence: Rate your confidence level (0-100%) as a number
        3. Advice: Provide actionable treatment recommendations and preventive measures (in ${responseLang})
        
        Format your response as JSON with the following structure:
        {
          "diagnosis": "detailed diagnosis written entirely in ${responseLang}",
          "confidence": 85,
          "advice": "detailed advice and recommendations written entirely in ${responseLang}"
        }
        
        DO NOT include any English words in the diagnosis or advice fields.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inlineData: { mimeType: imageFile.type, data: imageBase64Data } }
                        ]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            throw new Error(`AI diagnosis service failed: ${response.statusText}`);
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
            throw new Error("Received an invalid response from the AI diagnosis service.");
        }

        await supabase.from("crop_diagnostics").insert({
            user_id: user.id,
            image_url: publicUrl,
            diagnosis: result.diagnosis,
            advice: result.advice,
            confidence: result.confidence,
        });

        toast({
            title: t('diagnosisLabel'),
            description: result.diagnosis,
        });

        setImageFile(null);
        fetchDiagnostics();
    } catch (error: unknown) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : 'An error occurred during diagnosis.',
        });
    } finally {
        setUploading(false);
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
                <Camera className="w-5 h-5 text-accent" />
                {t('cropDiagnosis')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {imageFile && (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <Button
                onClick={handleImageUpload}
                disabled={!imageFile || uploading}
                className="w-full"
              >
                {uploading ? t('diagnosing') : t('submit')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('diagnosisLabel')} History</CardTitle>
              {diagnostics.length > 0 && (
                <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest('all')}>
                  <Trash className="w-4 h-4 mr-2" />
                  Delete All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {diagnostics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16">
                    <Archive className="w-16 h-16 mb-4 text-accent/30" />
                    <h3 className="text-lg font-semibold text-foreground">No History Found</h3>
                    <p>Your submitted crop diagnoses will appear here.</p>
                  </div>
                ) : (
                  diagnostics.map((diagnostic) => (
                    <Card key={diagnostic.id} className="border-l-4 border-l-accent transition-all duration-300 hover:shadow-md hover:border-l-accent/70 group relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteRequest(diagnostic.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(diagnostic.created_at), "PPP 'at' p")}
                        </div>
                        {diagnostic.image_url && (
                          <img
                            src={diagnostic.image_url}
                            alt="Crop"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-accent mb-1">{t('diagnosisLabel')}:</h4>
                          <div className="text-sm text-foreground">
                            {diagnostic.diagnosis?.split('**').map((part: string, i: number) => 
                              i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                            )}
                          </div>
                        </div>
                        {diagnostic.confidence && (
                          <div>
                            <h4 className="font-semibold text-primary mb-1">{t('confidenceLabel')}:</h4>
                            <p className="text-sm text-muted-foreground">{diagnostic.confidence}%</p>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-secondary mb-1">{t('adviceLabel')}:</h4>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {diagnostic.advice?.split('**').map((part: string, i: number) => 
                              i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
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
              {itemToDelete === 'all' ? ' all diagnosis history and associated images' : ' diagnosis entry and its image'}.
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

export default DiagnosisPage;
