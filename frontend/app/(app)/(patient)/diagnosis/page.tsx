import StartingDiagnosisForm from "@/components/patient/diagnosis-page/starting-diagnosis-form";

const PatientHomePage = () => {
  return (
    <main className="relative flex flex-col justify-center items-center space-y-12 h-full min-h-[80vh] bg-black overflow-hidden">
      {/* Green gradient orb from below - using inline style for guaranteed visibility */}
      <div
        className="absolute bottom-[-1000] left-1/2 -translate-x-1/2 w-[100vw] h-[100vw] max-w-[1600px] max-h-[1600px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(16, 185, 129, 0.3) 30%, rgba(16, 185, 129, 0.1) 60%, transparent 100%)",
          filter: "blur(80px)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 space-y-3 text-center px-4">
        <h1 className="font-semibold text-5xl md:text-6xl tracking-[-0.04em] text-white mb-1 leading-[1.1]">
          How are you feeling today?
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light">
          Describe your symptoms
        </p>
      </div>
      <div className="relative z-10 w-full max-w-2xl px-4">
        <StartingDiagnosisForm />
      </div>
    </main>
  );
};

export default PatientHomePage;
