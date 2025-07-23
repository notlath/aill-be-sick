// export default function LoginPage() {
//   return (

//   );
// }

import Image from "next/image";
import { login, signup } from "@/actions/auth";

export default function Home() {
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
            Enter your email and password.
          </li>
          <li className="tracking-[-.01em]">
            Check your email to confirm your account (if signing up).
          </li>
        </ol>
        <form className="flex flex-col gap-4 w-full">
          <input
            id="email"
            name="email"
            type="email"
            className="flex justify-center items-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] px-4 sm:px-5 border dark:border-white/[.145] hover:border-transparent border-black/[.08] border-solid rounded-full h-10 sm:h-12 font-medium text-sm sm:text-base transition-colors"
            placeholder="Email"
            required
          />
          <input
            id="password"
            name="password"
            type="password"
            className="flex justify-center items-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] px-4 sm:px-5 border dark:border-white/[.145] hover:border-transparent border-black/[.08] border-solid rounded-full h-10 sm:h-12 font-medium text-sm sm:text-base transition-colors"
            placeholder="Password"
            required
          />
          <div className="flex sm:flex-row flex-col items-center gap-4">
            <button
              type="submit"
              formAction={login}
              className="flex justify-center items-center gap-2 bg-foreground hover:bg-[#383838] dark:hover:bg-[#ccc] px-4 sm:px-5 border border-transparent border-solid rounded-full w-full sm:w-auto h-10 sm:h-12 font-medium text-background text-sm sm:text-base transition-colors cursor-pointer"
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Login
            </button>
            <button
              formAction={signup}
              type="submit"
              className="flex justify-center items-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] px-4 sm:px-5 border dark:border-white/[.145] hover:border-transparent border-black/[.08] border-solid rounded-full w-full sm:w-auto md:w-[158px] h-10 sm:h-12 font-medium text-sm sm:text-base transition-colors cursor-pointer"
            >
              Sign up
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
