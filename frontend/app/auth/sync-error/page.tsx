import Link from "next/link";

export default function SyncErrorPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Account Synchronization Error</h1>
            <p className="mb-6 max-w-md text-muted-foreground">
                We successfully verified your Google account, but we encountered an issue setting up your profile in our database.
            </p>
            <div className="flex gap-4">
                <Link href="/login" className="btn btn-primary">
                    Return to Login
                </Link>
                <Link href="/" className="btn btn-secondary">
                    Try Again
                </Link>
            </div>
        </div>
    );
}
