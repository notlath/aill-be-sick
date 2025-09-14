"use client";

import Image from "next/image";
import { addCase } from "@/actions/add-case";
import { detectDisease } from "@/actions/detect-disease";

export default function NewPage() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const { success: detectedDisease, error } = await detectDisease(formData);

    if (error || !detectedDisease) {
      window.alert(`Error: ${error}`);

      return;
    }

    const symptoms = formData.get("symptoms") as string;

    const {
      success: addSuccess,
      allCases,
      error: addSuccessError,
    } = await addCase(detectedDisease, symptoms);

    if (addSuccessError || !addSuccess) {
      window.alert(`Error adding case: ${addSuccessError}`);

      return;
    }

    console.log(allCases);

    window.alert(
      error
        ? `Error: ${error}`
        : `Detected disease: ${detectedDisease} for symptoms: ${formData.get(
            "symptoms",
          )}`,
    );
  };

  return (
    <div className="justify-items-center items-center gap-16 grid grid-rows-[20px_1fr_20px] p-8 sm:p-20 pb-20 min-h-screen font-sans">
      <main className="flex flex-col items-center sm:items-start gap-[32px] row-start-2">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="font-mono text-sm/6 sm:text-left text-center list-decimal list-inside">
          <li className="mb-2 tracking-[-.01em]">
            Enter what you're currently feeling
          </li>
          <li className="tracking-[-.01em]">
            Click the "Detect disease" button to analyze your symptoms.
          </li>
          <li className="tracking-[-.01em]">
            Check the console log to see updated cases.
          </li>
        </ol>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <input
            id="symptoms"
            name="symptoms"
            className="flex justify-center items-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] px-4 sm:px-5 border dark:border-white/[.145] hover:border-transparent border-black/[.08] border-solid rounded-full h-10 sm:h-12 font-medium text-sm sm:text-base transition-colors"
            placeholder="Symptoms (e.g., I'm feeling tired, I have a headache)"
            required
          />
          <div className="flex sm:flex-row flex-col items-center gap-4">
            <button
              type="submit"
              className="flex justify-center items-center gap-2 bg-foreground hover:bg-[#383838] dark:hover:bg-[#ccc] px-4 sm:px-5 border border-transparent border-solid rounded-full w-full sm:w-auto h-10 sm:h-12 font-medium text-background text-sm sm:text-base transition-colors cursor-pointer"
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Detect disease
            </button>
          </div>
        </form>
      </main>
      <footer className="flex flex-wrap justify-center items-center gap-[24px] row-start-3">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
