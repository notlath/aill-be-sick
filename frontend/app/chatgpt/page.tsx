"use client";
import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  Bot,
  User,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: "Welcome! I'm your AI assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setLoading(true);
    setInput("");

    try {
      // Replace this with your backend API call
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((msgs) => [
        ...msgs,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again!",
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-onest font-bold mb-2 flex items-center justify-center gap-3 text-base-content">
            <MessageCircle size={40} />
            Chat Assistant
          </h1>
          <p className="text-lg font-onest font-medium opacity-70">
            Ask me anything and I'll do my best to help
          </p>
          {/* DaisyUI Test Button */}
          <div className="mt-4">
            <button className="btn btn-primary font-onest font-semibold">
              DaisyUI Test Button
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="card bg-base-100 shadow-xl border border-base-300">
          <div className="card-body p-0">
            {/* Chat Messages */}
            <div className="h-[600px] overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat ${
                    msg.role === "user" ? "chat-end" : "chat-start"
                  }`}
                >
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      {msg.role === "assistant" ? (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-content">
                          <Bot size={20} />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral text-neutral-content">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chat-header font-onest text-xs opacity-50 mb-1">
                    {msg.role === "assistant" ? "AI Assistant" : "You"}
                  </div>
                  <div
                    className={`chat-bubble font-onest ${
                      msg.role === "user" ? "chat-bubble-primary" : ""
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat chat-start">
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-content">
                        <Bot size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="chat-header font-onest text-xs opacity-50 mb-1">
                    AI Assistant
                  </div>
                  <div className="chat-bubble chat-bubble-neutral font-onest">
                    <div className="flex items-center space-x-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-base-300 p-4">
              <form onSubmit={sendMessage} className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    className="input input-bordered w-full font-onest focus:input-primary"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className={`btn font-onest font-medium ${
                    loading || !input.trim() ? "btn-disabled" : "btn-primary"
                  }`}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm opacity-60">
          <div className="flex items-center justify-center space-x-2 font-onest">
            <span>Built with Next.js & Tailwind CSS</span>
            <Sparkles size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
