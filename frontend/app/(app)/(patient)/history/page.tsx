import DiagnosisLink from "@/components/patient/history-page/diagnosis-link";
import { getChats } from "@/utils/chat";

const HistoryPage = async () => {
  const { success: chats, error } = await getChats({ messages: true });

  if (!chats) {
    // TODO: Error handling
    console.error(`Could not get chats: ${error}`);
    return <div>Error loading chats</div>;
  }

  if (error) {
    // TODO: Error handling
    console.error(`Could not get chats: ${error}`);
    return <div>Error loading chats</div>;
  }

  return (
    <main className="space-y-10 mx-auto p-8 pt-12 max-w-5xl">
      <div className="space-y-2">
        <h1 className="mb-1 font-semibold text-base-content text-4xl tracking-tight">
          Diagnosis history
        </h1>
        <p className="text-muted text-lg">
          You can view all your previous diagnoses and their details here.
        </p>
      </div>
      <section className="flex flex-col gap-2">
        {chats.map((chat) => (
          <DiagnosisLink key={chat.id} {...chat} />
        ))}
      </section>
    </main>
  );
};

export default HistoryPage;
