import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MessageSquare, Send, X, Bot, Sparkles, Loader2, User, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "model";
  text: string;
}

const parseItalics = (textSegment: string) => {
  if (!textSegment) return "";
  const parts = textSegment.split(/(\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={`i-${idx}`} className="italic font-medium">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

const renderFormattedText = (text: string) => {
  if (!text) return null;
  // Strip out any unicode replacement characters ()
  const cleanText = text.replace(/\uFFFD/g, "");
  const lines = cleanText.split("\n");
  return lines.map((line, lineIdx) => {
    let currentLine = line;
    const isBullet = currentLine.trim().startsWith("* ") || currentLine.trim().startsWith("- ");
    if (isBullet) {
      currentLine = currentLine.trim().replace(/^[-*]\s+/, "");
    }

    const parts = currentLine.split(/(\*\*.*?\*\*)/g);
    const parsedLineContent = parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`b-${partIdx}`} className="font-extrabold text-foreground">
            {parseItalics(part.slice(2, -2))}
          </strong>
        );
      }
      return <span key={partIdx}>{parseItalics(part)}</span>;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex gap-1.5 items-start pl-2 my-0.5 whitespace-pre-wrap break-words">
          <span className="text-primary mt-1 shrink-0 text-[8px]">•</span>
          <span className="flex-1 whitespace-pre-wrap break-words">{parsedLineContent}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className={`whitespace-pre-wrap break-words ${lineIdx > 0 ? "mt-1.5" : ""}`}>
        {parsedLineContent}
      </p>
    );
  });
};

const chatbotTranslations = {
  en: {
    welcome: "Hello! I am your AI Agri-advisor. How can I help you today?",
    placeholder: "Ask about crops, soil, weather...",
    suggest1: "How to increase soil moisture?",
    suggest2: "Which fertilizers are best for wheat?",
    suggest3: "How to prevent tomato leaf disease?"
  },
  hi: {
    welcome: "नमस्ते! मैं आपका AI कृषि-सलाहकार हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
    placeholder: "फसलों, मिट्टी, मौसम के बारे में पूछें...",
    suggest1: "मिट्टी की नमी कैसे बढ़ाएं?",
    suggest2: "गेहूं के लिए कौन से उर्वरक सर्वोत्तम हैं?",
    suggest3: "टमाटर के पत्ते की बीमारी कैसे रोकें?"
  },
  gu: {
    welcome: "નમસ્તે! હું તમારો AI કૃષિ-સલાહકાર છું. આજે હું તમારી શું મદદ કરી શકું?",
    placeholder: "પાક, માટી, હવામાન વિશે પૂછો...",
    suggest1: "માટીનો ભેજ કેવી રીતે વધારવો?",
    suggest2: "ઘઉં માટે કયા ખાતરો શ્રેષ્ઠ છે?",
    suggest3: "ટમેટાના પાંદડાના રોગને કેવી રીતે અટકાવવો?"
  }
};

const ChatbotWidget = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const t = chatbotTranslations[language as keyof typeof chatbotTranslations] || chatbotTranslations.en;

  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: t.welcome }
  ]);

  // Sync welcome message on language switch if no messages exist yet
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "model") {
      setMessages([{ role: "model", text: t.welcome }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, t.welcome]);

  // Scroll to bottom on message change (without scrolling the main browser window)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage = textToSend.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    const languageMap = { en: "English", hi: "Hindi", gu: "Gujarati" };
    const currentLanguageName = languageMap[language as keyof typeof languageMap] || "English";
    
    const prompt = `You are a helpful, professional, and friendly agricultural advisor chatbot built into the "Krishi-Mitra" farmer app. 
    Answer this farming question entirely in ${currentLanguageName} language.
    Keep the answer concise, practical, and optimized for farmers.
    Question: ${userMessage}`;

    try {
      // Invoke the backend edge function (completely secure, no API key loaded in frontend!)
      const { data, error } = await supabase.functions.invoke('chat-advisor', {
        body: { prompt }
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const answer = data.choices?.[0]?.message?.content || "I apologize, I could not generate an answer. Please try again.";
      setMessages(prev => [...prev, { role: "model", text: answer }]);
    } catch (error: unknown) {
      console.error("NVIDIA API call failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessages(prev => [...prev, { 
        role: "model", 
        text: `NVIDIA Chat Error: ${errorMessage}. Please ensure the NVIDIA_API_KEY secret is configured in your Supabase project.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <Card className="w-[310px] sm:w-[350px] h-[430px] mb-3 flex flex-col border border-border/40 shadow-2xl bg-card/95 backdrop-blur-lg overflow-hidden rounded-2xl animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-primary to-emerald-600 dark:from-primary dark:to-emerald-700 text-white p-3 flex flex-row items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 relative shadow-inner">
                <Bot className="w-4 h-4 text-white animate-bounce-slow" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-primary animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs tracking-tight text-white leading-none">Krishi-Mitra Assistant</h4>
                <p className="text-[9px] text-emerald-100 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-accent" /> Active Advisor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/10 rounded-full transition-colors"
                onClick={() => {
                  setMessages([{ role: "model", text: t.welcome }]);
                  toast({
                    title: "Chat Cleared",
                    description: "Your chat history has been successfully reset."
                  });
                }}
                title="Clear Chat"
                aria-label="Clear chat history"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot panel"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>

          {/* Chat Messages */}
          <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-background/95 dark:bg-slate-950/95 no-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[85%] min-w-0 ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center shadow-sm border ${
                  msg.role === "user" 
                    ? "bg-accent/15 border-accent/30 text-accent" 
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`rounded-xl p-3 text-[11px] leading-relaxed shadow-sm min-w-0 break-words ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-muted dark:bg-slate-900 border border-border/40 text-foreground rounded-tl-none"
                }`}>
                  <div className="space-y-1">{renderFormattedText(msg.text)}</div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2 max-w-[85%] mr-auto items-center">
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-xl rounded-tl-none px-4 py-3 bg-muted dark:bg-slate-900 border border-border/40 flex items-center justify-center min-w-[50px] shadow-sm">
                  <div className="flex gap-1 items-center justify-center py-1">
                    <div className="w-1.5 h-1.5 bg-primary/80 rounded-full dot-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary/80 rounded-full dot-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary/80 rounded-full dot-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Quick Suggestions as Horizontal Scrollable Capsule Pills */}
          {messages.length === 1 && (
            <div className="px-3.5 py-2 border-t border-border/30 bg-background/50 dark:bg-slate-950/50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button 
                onClick={() => handleSendMessage(t.suggest1)} 
                className="text-[10px] whitespace-nowrap text-foreground bg-muted hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-full border border-border/40 transition-all font-medium shrink-0"
              >
                🌱 Moisture
              </button>
              <button 
                onClick={() => handleSendMessage(t.suggest2)} 
                className="text-[10px] whitespace-nowrap text-foreground bg-muted hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-full border border-border/40 transition-all font-medium shrink-0"
              >
                🌾 Fertilizers
              </button>
              <button 
                onClick={() => handleSendMessage(t.suggest3)} 
                className="text-[10px] whitespace-nowrap text-foreground bg-muted hover:bg-primary hover:text-white px-2.5 py-1.5 rounded-full border border-border/40 transition-all font-medium shrink-0"
              >
                🍂 Diseases
              </button>
            </div>
          )}

          {/* Footer Input */}
          <CardFooter className="p-2 border-t border-border/50 bg-background dark:bg-slate-950 flex gap-1.5 shrink-0">
            <input
              type="text"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(input)}
              className="flex-1 bg-muted/50 border border-border/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-[11px] text-foreground focus:outline-none transition-all placeholder:text-muted-foreground/60"
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || loading}
              className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-emerald-600 hover:from-primary hover:to-emerald-500 text-white shadow-md transition-all duration-300"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Floating Circular Pop Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full shadow-2xl flex items-center justify-center p-0 bg-gradient-to-tr from-primary to-emerald-500 hover:from-primary/95 hover:to-emerald-400 text-white border-none transform transition-transform hover:scale-105 active:scale-95 animate-bounce-slow pulse-glow-emerald"
        aria-label="Toggle chat assistant"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    </div>
  );
};

export default ChatbotWidget;
