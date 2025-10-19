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
    <main className="space-y-8 p-12">
      <div className="space-y-2">
        <h1 className="font-semibold text-5xl">Diagnosis history</h1>
        <p className="text-muted">
          You can view all your previous diagnoses and their details here.
        </p>
      </div>
      <section>
        {chats.map((chat) => (
          <DiagnosisLink key={chat.id} {...chat} />
        ))}
      </section>
    </main>
  );
};

export default HistoryPage;
