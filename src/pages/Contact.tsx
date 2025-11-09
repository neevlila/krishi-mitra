import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setName(currentUser.user_metadata.full_name || "");
          setEmail(currentUser.email || "");
        }
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setName(currentUser.user_metadata.full_name || "");
        setEmail(currentUser.email || "");
      }
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const WEB3FORMS_API_KEY = import.meta.env.VITE_WEB3FORMS_API_KEY;
    if (!WEB3FORMS_API_KEY || WEB3FORMS_API_KEY === 'YOUR_API_KEY') {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Contact form is not set up. Please add the API key.",
        });
        setSending(false);
        return;
    }

    const formData = {
        access_key: WEB3FORMS_API_KEY,
        name: name,
        email: email,
        message: message,
        subject: `New Message from ${name} via Krishi-Mitra`,
        from_name: "Krishi-Mitra Contact Form",
    };

    try {
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (result.success) {
            toast({
                title: "Message Sent!",
                description: "Thank you for reaching out. We'll get back to you soon.",
            });
            setMessage(""); // Clear only message field
        } else {
            throw new Error(result.message || "Failed to send message.");
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('dashboard')}
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                {t('contactUs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    placeholder={t('contactName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    readOnly
                  />
                </div>
                <div>
                  <Input
                    type="email"
                    placeholder={t('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    readOnly
                  />
                </div>
                <div>
                  <Textarea
                    placeholder={t('contactMessage')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full"
                >
                  {sending ? "Sending..." : t('send')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Contact;
