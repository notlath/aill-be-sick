import { create } from "zustand";

// Types for guest/local messages. These mirror the Prisma enums used on the backend
// but are kept local and simple for guests (no DB persistence).
export type MessageRole = "USER" | "AI";
export type MessageType = "SYMPTOMS" | "ANSWER" | "QUESTION" | "DIAGNOSIS";

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  type: MessageType;
  createdAt: string; // ISO timestamp
}

interface MessagesState {
  messages: Message[];
  isLoading: boolean;

  // setters / actions
  addMessage: (message: Partial<Message> & { content?: string }) => Message;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  updateMessageContent: (id: string, content: string) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (v: boolean) => void;
  getMessagesByRole: (role: MessageRole) => Message[];
}

const genId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as any).randomUUID === "function"
  ) {
    try {
      return (crypto as any).randomUUID();
    } catch {
      // fallthrough
    }
  }
  // fallback
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

export const useMessagesStore = create<MessagesState>((set: any, get: any) => ({
  messages: [],
  isLoading: false,

  addMessage: (message: Partial<Message> & { content?: string }) => {
    const id = message.id ?? genId();
    const now = new Date().toISOString();
    const msg: Message = {
      id,
      content: message.content ?? "",
      role: message.role ?? "USER",
      type: message.type ?? "SYMPTOMS",
      createdAt: message.createdAt ?? now,
    };
    set((s: MessagesState) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  updateMessage: (id: string, patch: Partial<Message>) =>
    set((s: MessagesState) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  updateMessageContent: (id: string, content: string) =>
    set((s: MessagesState) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),

  removeMessage: (id: string) =>
    set((s: MessagesState) => ({
      messages: s.messages.filter((m) => m.id !== id),
    })),

  clearMessages: () => set(() => ({ messages: [] })),

  setLoading: (v: boolean) => set(() => ({ isLoading: v })),

  getMessagesByRole: (role: MessageRole) =>
    get().messages.filter((m: Message) => m.role === role),
}));

export default useMessagesStore;
