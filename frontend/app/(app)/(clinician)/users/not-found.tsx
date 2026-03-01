import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function UsersNotFound() {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
      <FileQuestion className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-2xl font-bold tracking-tight">Users Not Found</h2>
      <p className="text-muted-foreground">Could not find the requested users functionality.</p>
      <Link
        href="/users"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Return Home
      </Link>
    </div>
  );
}
