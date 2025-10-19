"use client";

import { useRouter } from "nextjs-toploader/app";

const NotFound = () => {
  const router = useRouter();

  return (
    <main className="flex flex-col justify-center items-center space-y-4 h-full">
      <h1 className="font-semibold text-5xl">Oops!</h1>
      <p className="text-muted">We couldn't find what you were looking for!</p>
      <button
        onClick={() => router.back()}
        className="border border-border btn btn-ghost"
      >
        Go back
      </button>
    </main>
  );
};

export default NotFound;
