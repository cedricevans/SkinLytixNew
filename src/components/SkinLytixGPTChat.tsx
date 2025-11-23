import { useState, useRef, useEffect } from "react";
import { X, Send, Mic, Volume2, VolumeX, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/hooks/useTracking";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SkinLytixGPTChatProps {
  analysisId: string;
  productName: string;
  skinType?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SkinLytixGPTChat = ({ 
  analysisId, 
  productName, 
  skinType,
  isOpen: controlledIsOpen,
  onOpenChange
}: SkinLytixGPTChatProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReferralBanner, setShowReferralBanner] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Voice features
  const [isListening, setIsListening] = useState(false);
  const [isAutoRead, setIsAutoRead] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        setIsLoadingHistory(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to find existing conversation
        const { data: conversation } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', user.id)
          .eq('analysis_id', analysisId)
          .single();

        if (conversation) {
          setConversationId(conversation.id);
          
          // Load messages
          const { data: chatMessages } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (chatMessages) {
            setMessages(chatMessages as Message[]);
            trackEvent({
              eventName: 'chat_conversation_resumed',
              eventCategory: 'chat',
              eventProperties: { analysisId, messageCount: chatMessages.length }
            });
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadConversation();
  }, [analysisId]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          toast({
            title: "Voice input failed",
            description: "Please try again or type your question.",
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Voice input handler
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input. Please type instead.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      trackEvent({
        eventName: 'chat_voice_input_started',
        eventCategory: 'chat',
        eventProperties: { analysisId }
      });
    }
  };

  // Text-to-speech for AI responses
  const speakText = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/⚕️ REFERRAL:/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    synthRef.current.speak(utterance);

    trackEvent({
      eventName: 'chat_voice_output_played',
      eventCategory: 'chat',
      eventProperties: { analysisId }
    });
  };

  // Start new conversation
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setShowReferralBanner(false);
    toast({
      title: "New conversation started",
      description: "Previous chat history cleared"
    });
  };

  // Send message handler
  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    trackEvent({
      eventName: 'chat_message_sent',
      eventCategory: 'chat',
      eventProperties: { analysisId, messageLength: textToSend.length }
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-skinlytix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            analysisId,
            conversationId,
            userId: user?.id,
            messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
          }),
        }
      );

      if (response.status === 429) {
        toast({
          title: "Rate limit exceeded",
          description: "Too many requests. Please try again in a moment.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 402) {
        toast({
          title: "Credits depleted",
          description: "AI credits have been used up. Please add more credits.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      // Get conversationId from response headers
      const newConvId = response.headers.get('X-Conversation-Id');
      if (newConvId && !conversationId) {
        setConversationId(newConvId);
        trackEvent({
          eventName: 'chat_conversation_created',
          eventCategory: 'chat',
          eventProperties: { analysisId, conversationId: newConvId }
        });
      }

      // Stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });

              if (assistantContent.includes('⚕️ REFERRAL:')) {
                setShowReferralBanner(true);
                trackEvent({
                  eventName: 'chat_professional_referral_shown',
                  eventCategory: 'chat',
                  eventProperties: { analysisId }
                });
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (isAutoRead && assistantContent) {
        speakText(assistantContent);
      }

      setIsLoading(false);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    `Is this good for ${skinType || 'my'} skin?`,
    `Why were some ingredients flagged?`,
    `When should I use this in my routine?`,
    `Are there any ingredients I should watch out for?`,
  ];

  return (
    <>
      {/* Floating Chat Bubble - Desktop Only */}
      {!isOpen && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  setIsOpen(true);
                  trackEvent({
                    eventName: 'chat_opened',
                    eventCategory: 'chat',
                    eventProperties: { analysisId, source: 'floating_bubble' }
                  });
                }}
                className="hidden lg:block fixed bottom-6 right-24 z-40 bg-gradient-to-r from-[hsl(346,100%,60%)] to-[hsl(346,100%,70%)] text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[hsl(346,100%,60%)] focus:ring-offset-2 animate-pulse"
                aria-label="Open SkinLytixGPT chat"
              >
                <Sparkles className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>SkinLytixGPT</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Chat Panel/Sheet */}
      {isOpen && (
        <div className="fixed inset-0 lg:inset-auto lg:right-0 lg:top-0 lg:bottom-0 lg:w-[400px] z-50 bg-background border-l shadow-2xl flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <h3 className="font-semibold text-sm">Ask SkinLytixGPT</h3>
                <p className="text-xs text-muted-foreground truncate">{productName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="p-2"
                title="New conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAutoRead(!isAutoRead);
                  toast({
                    title: isAutoRead ? "Auto-read disabled" : "Auto-read enabled",
                    description: isAutoRead 
                      ? "Responses will no longer be read aloud" 
                      : "Responses will be read aloud automatically"
                  });
                }}
                className="p-2"
              >
                {isAutoRead ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Professional Referral Banner */}
          {showReferralBanner && (
            <Alert className="m-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <AlertDescription className="text-sm">
                ⚕️ This chat recommended consulting a professional. Please consider booking an appointment.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading History */}
          {isLoadingHistory && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading conversation history...
            </div>
          )}

          {/* Suggested Questions */}
          {!isLoadingHistory && messages.length === 0 && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask me anything about <strong>{productName}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      sendMessage(q);
                      trackEvent({
                        eventName: 'chat_suggested_question_clicked',
                        eventCategory: 'chat',
                        eventProperties: { analysisId, question: q }
                      });
                    }}
                  >
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about this product..."
                className="resize-none"
                rows={2}
                disabled={isLoading}
              />
              <div className="flex flex-col gap-2">
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="icon"
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  className={isListening ? "animate-pulse" : ""}
                >
                  <Mic className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isListening ? "🎤 Listening..." : "Press Enter to send, Shift+Enter for new line"}
            </p>
          </div>
        </div>
      )}
    </>
  );
};