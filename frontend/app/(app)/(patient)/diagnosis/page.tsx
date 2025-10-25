import StartingDiagnosisForm from "@/components/patient/diagnosis-page/starting-diagnosis-form";

const PatientHomePage = () => {
  return (
    <main className="flex flex-col justify-center items-center space-y-16 h-full min-h-[80vh] bg-base-200">
      <div className="space-y-4 text-center">
        <h1 className="font-semibold text-5xl tracking-tight text-base-content mb-2">
          How are you feeling today?
        </h1>
        <p className="text-muted text-lg">Describe your symptoms</p>
      </div>
      <div className="w-full max-w-2xl">
        <StartingDiagnosisForm />
      </div>
    </main>
  );
};

export default PatientHomePage;
