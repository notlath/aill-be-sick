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
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        {/* Chat Container */}
        <div className="flex flex-1 flex-col overflow-hidden bg-base-200">
          {/* Chat Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-6 pt-16 pb-6">
            <div className="mx-auto max-w-4xl space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat ${
                    msg.role === "user" ? "chat-end" : "chat-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-2 break-words whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "ml-auto bg-primary text-primary-content"
                        : "bg-base-300 text-base-content"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat-start chat">
                  <div className="max-w-xs rounded-2xl bg-base-300 px-4 py-2 break-words whitespace-pre-wrap text-base-content">
                    <div className="flex items-center space-x-2">
                      <span className="loading loading-xs loading-spinner"></span>
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area - Fixed at bottom of chat container */}
          <div className="bg-base-200 pt-2 pb-4">
            <div className="mx-auto max-w-4xl">
              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    className="textarea w-full resize-none rounded-xl text-base leading-tight focus:textarea-primary"
                    rows={2}
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
                    suppressHydrationWarning={true}
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
                  className={`btn btn-square font-medium btn-lg ${
                    loading || !input.trim() ? "btn-disabled" : "btn-primary"
                  }`}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-xs loading-spinner"></span>
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
