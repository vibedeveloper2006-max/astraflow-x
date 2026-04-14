import { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '../components/ui/GlassPanel';
import { ChatMessage } from '../types';
import { chatWithAI } from '../services/api';

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '🏟️ **Welcome to AstraFlow X AI Assistant!**\n\nI have real-time access to all zone data at Sawai Mansingh Stadium. Ask me about:\n\n• 🎯 Shortest queues & wait times\n• 🗺️ Best routes to your destination\n• 📊 Crowd predictions & trends\n• ⚡ Current congestion hotspots\n\nHow can I help you navigate the stadium?',
      timestamp: Date.now(),
      confidence: 1,
      suggestions: [
        'Where is the shortest queue?',
        'What is the best route to my seat?',
        'Will crowds get worse?',
        'Which food court is least crowded?',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const message = text ?? input.trim();
    if (!message || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAI(message);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
        confidence: response.confidence,
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan via-astra-500 to-neon-purple flex items-center justify-center shadow-glow-lg">
            <span className="text-2xl">🤖</span>
          </div>
        </div>
        <h1 className="text-2xl font-display font-bold gradient-text">AI Assistant</h1>
        <p className="text-sm text-white/40 mt-1">Powered by Gemini — context-aware crowd intelligence</p>
      </div>

      {/* Chat Container */}
      <GlassPanel className="p-0 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' } as React.CSSProperties}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onSuggestionClick={handleSend} />
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neon-cyan to-astra-500 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🤖</span>
              </div>
              <div className="glass-panel p-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-glass-border p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about crowds, routes, predictions..."
              className="glass-input flex-1"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-astra-500 text-white font-semibold text-sm
                         hover:opacity-90 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                         shadow-glow flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function MessageBubble({ message, onSuggestionClick }: { message: ChatMessage; onSuggestionClick: (text: string) => void }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-gradient-to-br from-neon-purple to-neon-pink'
          : 'bg-gradient-to-br from-neon-cyan to-astra-500'
      }`}>
        <span className="text-sm">{isUser ? '👤' : '🤖'}</span>
      </div>

      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block p-4 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-neon-purple/20 to-neon-pink/10 border border-neon-purple/20 text-white/90'
            : 'glass-panel text-white/80'
        }`}>
          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
            __html: message.content
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
              .replace(/\n/g, '<br />')
          }} />
        </div>

        {/* Confidence badge */}
        {message.confidence !== undefined && message.confidence < 1 && (
          <p className="text-[10px] text-white/20 mt-1 font-mono">
            Confidence: {Math.round(message.confidence * 100)}%
          </p>
        )}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestions.map((s: string) => (
              <button
                key={s}
                onClick={() => onSuggestionClick(s)}
                className="px-3 py-1.5 text-xs rounded-lg bg-glass-light border border-glass-border text-white/50
                           hover:text-neon-cyan hover:border-neon-cyan/30 transition-all duration-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
