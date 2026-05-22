"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Lock, Sparkles, FileText, User } from "lucide-react";

declare global {
  interface Window {
    puter: any;
  }
}

// Mock Data Context for the AI
const mockChannelContext = {
  channel_id: "UC1234567890",
  title: "Tech Channel Mock",
  subscriber_count: 124500,
  recent_videos: [
    { video_id: "dQw4w9WgXcQ", vph: 450, baseline_vph: 1200, spike_ratio: 0.375 },
    { video_id: "jNQXAC9IVRw", vph: 200, baseline_vph: 800, spike_ratio: 0.25 }
  ],
  weekly_views: 450000
};

export default function AIAssistant() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  useEffect(() => {
    // Check if Puter.js is loaded
    const checkPuter = setInterval(() => {
      if (typeof window !== 'undefined' && window.puter) {
        clearInterval(checkPuter);
        setIsSignedIn(window.puter.auth.isSignedIn());
        setIsLoading(false);
      }
    }, 500);

    return () => clearInterval(checkPuter);
  }, []);

  const handleSignIn = () => {
    if (window.puter) {
      window.puter.auth.signIn().then(() => setIsSignedIn(true));
    }
  };

  const handleSignOut = () => {
    if (window.puter) {
      window.puter.auth.signOut().then(() => {
        setIsSignedIn(false);
        setReport(null);
        setChatMessages([]);
      });
    }
  };

  const generateReport = async () => {
    if (!window.puter) return;
    setIsGenerating(true);
    
    const prompt = `You are an expert YouTube Data Analyst. Based on the following mock data for a channel over the last week: ${JSON.stringify(mockChannelContext)}. 
    Write a concise weekly performance report. Highlight the low VPH of the recent videos and give 2 recommendations. Format as plain text or simple markdown.`;

    try {
      const response = await window.puter.ai.chat(prompt);
      setReport(response.message.content);
    } catch (error) {
      console.error(error);
      setReport("Failed to generate report. Ensure Puter.js is working.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !window.puter) return;
    
    const userMsg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    const prompt = `Context data: ${JSON.stringify(mockChannelContext)}. 
    User question: ${userMsg}. 
    Answer briefly as a helpful YouTube BA assistant.`;

    try {
      const response = await window.puter.ai.chat(prompt);
      setChatMessages(prev => [...prev, { role: 'ai', content: response.message.content }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', content: "Error communicating with AI." }]);
    } finally {
      setIsChatting(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center text-muted-foreground animate-pulse">Loading AI core...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center space-y-6 animate-in fade-in zoom-in duration-700">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-2xl shadow-primary/20">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground max-w-md">
            The AI Assistant uses Puter.js to generate reports and provide insights. 
            Please sign in with your Puter account to continue.
          </p>
        </div>
        <Button onClick={handleSignIn} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
          Sign in with Puter.js
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">Powered by Puter.js. Context: Mock Channel Data.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut} className="border-border/50 bg-card/50">
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Report Generator */}
        <div className="md:col-span-1 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-[oklch(0.7_0.2_180)]" />
                Weekly Report
              </CardTitle>
              <CardDescription>Generate a comprehensive weekly BA report based on the channel's recent performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={generateReport} 
                disabled={isGenerating}
                className="w-full bg-[oklch(0.7_0.2_180)] hover:bg-[oklch(0.7_0.2_180)]/90 text-black font-semibold shadow-lg shadow-[oklch(0.7_0.2_180)]/20"
              >
                {isGenerating ? <span className="animate-pulse flex items-center gap-2">Generating...</span> : <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate Report</span>}
              </Button>

              {report && (
                <div className="mt-6 p-4 bg-muted/30 border border-border/50 rounded-xl text-sm whitespace-pre-wrap leading-relaxed h-[300px] overflow-y-auto">
                  {report}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Chat */}
        <div className="md:col-span-2 h-full">
          <Card className="glass-card flex flex-col h-[600px]">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-primary" />
                BA Chatbot
              </CardTitle>
              <CardDescription>Ask questions about the channel's performance, algorithms, or blacklist logic.</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                  <Bot className="h-12 w-12" />
                  <p>Start a conversation. The AI knows the channel context.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-primary" /></div>}
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted/50 border border-border/50 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && <div className="h-8 w-8 rounded-full bg-muted border border-border/50 flex items-center justify-center flex-shrink-0"><User className="h-4 w-4 text-foreground" /></div>}
                </div>
              ))}
              {isChatting && (
                <div className="flex gap-3 justify-start animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Bot className="h-4 w-4 text-primary" /></div>
                  <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 text-sm">Thinking...</div>
                </div>
              )}
            </CardContent>

            <div className="p-4 border-t border-border/50 bg-muted/10">
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="flex gap-2">
                <Input 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder="Ask about the channel's VPH..." 
                  className="bg-background/50 border-border/50 flex-1"
                  disabled={isChatting}
                />
                <Button type="submit" size="icon" disabled={!chatInput.trim() || isChatting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
