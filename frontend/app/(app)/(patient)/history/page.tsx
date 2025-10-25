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
    <main className="max-w-5xl mx-auto space-y-10 p-8">
      <div className="space-y-2">
        <h1 className="font-semibold text-4xl tracking-tight text-base-content mb-1">
          Diagnosis history
        </h1>
        <p className="text-muted text-lg">
          You can view all your previous diagnoses and their details here.
        </p>
      </div>
      <section className="rounded-3xl bg-base-100/80 border border-base-300/30 shadow-xl backdrop-blur-xl p-6 flex flex-col gap-2">
        {chats.map((chat) => (
          <DiagnosisLink key={chat.id} {...chat} />
        ))}
      </section>
    </main>
  );
};

export default HistoryPage;
