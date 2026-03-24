import Link from "next/link";

const WaitingForApprovalPage = () => {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <section className="card bg-base-100 shadow-xl max-w-lg w-full">
        <div className="card-body">
          <h1 className="card-title text-2xl">
            Clinician account pending approval
          </h1>
          <p>
            Your account was created successfully. An administrator needs to
            approve it before you can access clinician tools.
          </p>
          <p className="text-sm text-muted">
            Check your email for updates. If you think this is taking too long,
            please contact your administrator.
          </p>
          <div className="card-actions justify-end mt-2">
            <Link href="/clinician-login" className="btn btn-primary">
              Back to clinician login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default WaitingForApprovalPage;
