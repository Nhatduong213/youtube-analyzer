"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Lock, Zap, Bot } from "lucide-react";

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
  const [tab, setTab] = useState<"chatbot" | "report">("chatbot");

  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const btmRef = useRef<HTMLDivElement>(null);

  // Report state
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    btmRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

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
    return (
      <div className="p-6 max-w-4xl mx-auto flex h-[50vh] items-center justify-center">
        <div className="flex gap-2">
          {[0, 0.15, 0.3].map(d => (
            <div
              key={d}
              className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col h-[70vh] items-center justify-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-violet-400" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-white">Authentication Required</h1>
          <p className="text-sm font-mono text-white/30 max-w-md">
            The AI Assistant uses Puter.js to generate reports and provide insights.
            Please sign in with your Puter account to continue.
          </p>
        </div>
        <button
          onClick={handleSignIn}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Sign in with Puter.js
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">
            Powered by Puter.js · Context: Mock Channel Data
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 text-xs font-semibold text-white/40 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Tab Toggle (pill-style) */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {(["chatbot", "report"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {t === "chatbot" ? "BA Chatbot" : "Weekly Report"}
          </button>
        ))}
      </div>

      {/* Chatbot Tab */}
      {tab === "chatbot" && (
        <div
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl flex flex-col"
          style={{ height: "calc(100vh - 310px)", minHeight: 420 }}
        >
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-sm font-mono text-white/20">
                  Start a conversation. The AI knows the channel context.
                </p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] text-sm leading-relaxed rounded-xl px-4 py-3 whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white rounded-br-none"
                      : "bg-white/[0.06] border border-white/10 text-white/75 rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Thinking dots */}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/10 rounded-xl rounded-bl-none px-4 py-3.5 flex gap-1.5">
                  {[0, 0.15, 0.3].map(d => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                      style={{ animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={btmRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-white/10 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex gap-3"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about performance, revenue, spikes, or weekly summary..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-violet-500/50 transition-colors"
                disabled={isChatting}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatting}
                className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Weekly Report Tab */}
      {tab === "report" && (
        <div className="space-y-4">
          {/* Report Controls */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex-1 min-w-40">
                <label className="text-[10px] font-mono text-white/35 uppercase tracking-widest block mb-2">
                  Channel
                </label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer font-mono"
                >
                  <option style={{ background: "#0a0819" }}>{mockChannelContext.title}</option>
                </select>
              </div>
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {/* Empty State */}
          {!report && !isGenerating && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl py-16 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Zap className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-sm font-mono text-white/25">
                Select a channel and generate your weekly report
              </p>
            </div>
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl py-16 flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {[0, 0.15, 0.3].map(d => (
                  <div
                    key={d}
                    className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${d}s` }}
                  />
                ))}
              </div>
              <p className="text-sm font-mono text-white/30">Generating report...</p>
            </div>
          )}

          {/* Report Output */}
          {report && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
              <pre className="text-xs font-mono text-white/65 whitespace-pre-wrap leading-relaxed">
                {report}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
