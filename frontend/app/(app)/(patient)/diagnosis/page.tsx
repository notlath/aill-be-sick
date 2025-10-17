import StartingDiagnosisForm from "@/components/patient/diagnosis-page/starting-diagnosis-form";

const PatientHomePage = () => {
  return (
    <main className="flex flex-col justify-center items-center space-y-12 h-full">
      <div className="space-y-4 text-center">
        <h1 className="font-semibold text-5xl text-center">
          How are you feeling today?
        </h1>
        <p className="text-muted">Describe your symptoms</p>
      </div>
      <StartingDiagnosisForm />
    </main>
  );
};

export default PatientHomePage;
