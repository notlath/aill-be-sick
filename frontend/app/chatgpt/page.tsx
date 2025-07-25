"use client";
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import Layout from "../../components/Layout";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "system",
      content: "Nu sakit mo baks ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
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
    <Layout pageTitle="AI'll Be Sick">
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {/* Chat Container */}
        <div className="flex-1 bg-base-100 flex flex-col overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pt-16 px-6 pb-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat ${
                    msg.role === "user" ? "chat-end" : "chat-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-2xl break-words whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-content ml-auto"
                        : "bg-base-300 text-base-content"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat chat-start">
                  <div className="px-4 py-2 rounded-2xl max-w-xs bg-base-300 text-base-content break-words whitespace-pre-wrap">
                    <div className="flex items-center space-x-2">
                      <span className="loading loading-spinner loading-xs"></span>
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at bottom of chat container */}
          <div className=" pb-4 pt-2 bg-base-100">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={sendMessage} className="flex gap-2 items-end">
                <div className="flex-1">
                  <textarea
                    className="textarea textarea-bordered w-full resize-none focus:textarea-primary rounded-xl text-base leading-tight py-3"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Type your message..."
                    disabled={loading}
                    autoFocus
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height =
                        Math.min(target.scrollHeight, 120) + "px";
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className={`btn font-medium btn-square rounded-xl mb-2 ${
                    loading || !input.trim() ? "btn-disabled" : "btn-primary"
                  }`}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                    </>
                  ) : (
                    <>
                      <Send size={19} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
