import ChatContainer from "@/components/patient/diagnosis-page/chat-container";
import DiagnosisForm from "@/components/patient/diagnosis-page/diagnosis-form";

const ChatPage = async ({
  params,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ symptoms: string }>;
}) => {
  const { chatId } = await params;

  return (
    <main className="relative flex flex-col h-full">
      <ChatContainer chatId={chatId} />
      <div className="mt-auto p-4">
        <DiagnosisForm chatId={chatId} />
      </div>
    </main>
  );
};

export default ChatPage;
