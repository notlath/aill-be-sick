import Markdown from "react-markdown";
import ChatBubble from "./chat-bubble";
import { Message } from "@/app/generated/prisma";
import remarkBreaks from "remark-breaks";

type ChatContainerProps = {
  messages: Message[];
  isPending: boolean;
};

const ChatContainer = ({ messages, isPending }: ChatContainerProps) => {
  return (
    <section className="flex flex-col flex-1 space-y-2 px-[12.5rem] py-8">
      {messages.map((message, idx) => (
        <ChatBubble
          key={message.id + message.content}
          messagesLength={messages.length}
          idx={idx}
          {...message}
        />
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
    </section>
  );
};

export default ChatContainer;
