import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex h-screen items-center justify-center">
      <section className="space-y-6 text-center max-w-md w-full px-4">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-error">403 Forbidden</h1>
          <p className="text-muted">
            You do not have permission to access this resource. If you believe
            this is a mistake, please contact support.
          </p>
        </div>
        <Link href="/" className="btn btn-primary w-full">
          Return to Home
        </Link>
      </section>
    </main>
  );
}
