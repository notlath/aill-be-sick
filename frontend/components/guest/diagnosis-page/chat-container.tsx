import Markdown from "react-markdown";
import ChatBubble from "./chat-bubble";
import { Message } from "@/stores/messages-store";
import remarkBreaks from "remark-breaks";
import { forwardRef } from "react";

type ChatContainerProps = {
  messages: Message[];
  isPending: boolean;
};

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ messages, isPending }, ref) => {
    return (
      <section className="flex flex-col flex-1 space-y-2 py-8">
        {messages.map((message) => (
          <ChatBubble key={message.id + message.content} {...message} />
        ))}
        {isPending && (
          <article className="self-start bg-gray-200 p-3 px-4 rounded-xl max-w-[60%]">
            <div>
              <Markdown
                remarkPlugins={[remarkBreaks]}
                components={{
                  p: ({ children }) => <p className="my-2">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-bold">{children}</strong>
                  ),
                }}
              >
                Diagnosing...
              </Markdown>
            </div>
          </article>
        )}
        <div ref={ref} />
      </section>
    );
  }
);

ChatContainer.displayName = "ChatContainer";

export default ChatContainer;
