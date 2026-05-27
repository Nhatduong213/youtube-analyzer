import { Bot, Sparkles, Wrench } from "lucide-react";

export default function AIAssistant() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-white">AI Assistant</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">
          Channel analytics powered by AI
        </p>
      </div>

      <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl py-20 flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Bot className="w-10 h-10 text-violet-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
          <p className="text-sm font-mono text-white/30 leading-relaxed">
            AI-powered channel analysis is being rebuilt with a proper backend.
            You&apos;ll be able to generate weekly reports and chat about your
            channel performance using real data.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {["Weekly Reports", "Performance Chat", "Spike Analysis", "Content Recommendations"].map(
            (feature) => (
              <span
                key={feature}
                className="text-[10px] font-mono text-violet-400/60 bg-violet-400/5 border border-violet-400/10 px-3 py-1 rounded-full"
              >
                <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
                {feature}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
