import { getChats } from "@/utils/chat";
import Link from "next/link";

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
    <main className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="font-semibold text-5xl">Diagnosis history</h1>
        <p className="text-muted">
          You can view all your previous diagnoses and their details here.
        </p>
      </div>
      <section className="space-y-2">
        {chats.map((chat) => (
          <Link
            href={`/diagnosis/${chat.chatId}`}
            key={chat.id}
            className="bg-base-100 p-4 border border-border card"
          >
            <h2 className="font-semibold text-2xl">
              Diagnosis on {chat.createdAt.toDateString()}
            </h2>
          </Link>
        ))}
      </section>
    </main>
  );
};

export default HistoryPage;
