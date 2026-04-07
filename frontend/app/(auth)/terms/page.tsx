import { LEGAL_CONSTANTS } from "@/constants/legal";
import {
  FileText,
  AlertTriangle,
  Info,
  UserCheck,
  AlertCircle,
  FlaskConical,
  Database,
  Users,
  Scale,
  RefreshCw,
  Mail,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import BackButton from "@/components/shared/back-button";

const TermsOfServicePage = () => {
  return (
    <main className="min-h-screen bg-base-200 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-4">
          <BackButton />
        </div>

        {/* Header */}
        <div className="card bg-base-100 shadow-lg mb-6">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-xl">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Terms of Service</h1>
                <p className="text-sm opacity-70">
                  Version {LEGAL_CONSTANTS.TERMS_VERSION} | Last Updated:{" "}
                  {LEGAL_CONSTANTS.LAST_UPDATED}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CRITICAL: Medical Disclaimer - Most Prominent */}
        <div className="alert alert-error mb-6 shadow-lg">
          <AlertTriangle className="w-8 h-8" />
          <div>
            <h2 className="font-bold text-lg">
              IMPORTANT: This is NOT Medical Advice
            </h2>
            <div className="text-sm space-y-2 mt-2">
              <p>
                <strong>AI&apos;ll Be Sick is a research tool, NOT a replacement for
                professional medical care.</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  This system provides suggestions only, NOT confirmed diagnoses
                </li>
                <li>
                  AI predictions may be <strong>inaccurate or incomplete</strong>
                </li>
                <li>
                  <strong>Always consult a licensed healthcare professional</strong>{" "}
                  for medical advice
                </li>
                <li>
                  In emergencies, call emergency services or go to the nearest
                  hospital immediately
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1: About This Service */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">1</span>
                <Info className="w-5 h-5 text-primary" />
                <h2 className="card-title">About This Service</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>AI&apos;ll Be Sick</strong> is a thesis research project,
                  NOT a commercial medical service.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    This is a pilot program deployed at{" "}
                    <strong>{LEGAL_CONSTANTS.HOSPITAL_NAME}</strong>
                  </li>
                  <li>
                    Developed by {LEGAL_CONSTANTS.RESEARCH_TEAM} from{" "}
                    {LEGAL_CONSTANTS.UNIVERSITY}
                  </li>
                  <li>
                    Designed to assist healthcare workers in{" "}
                    {LEGAL_CONSTANTS.BARANGAY_NAME}
                  </li>
                  <li>
                    Part of a research study on AI-assisted disease detection
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Acceptance of Terms */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">2</span>
                <UserCheck className="w-5 h-5 text-primary" />
                <h2 className="card-title">Acceptance of Terms</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>By creating an account and using AI&apos;ll Be Sick, you agree to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>These Terms of Service in their entirety</li>
                  <li>
                    Our <Link href="/privacy" className="link link-primary">Privacy Policy</Link>
                  </li>
                  <li>Participate in this research project</li>
                  <li>Use the system responsibly and honestly</li>
                </ul>
                <p className="mt-2">
                  If you do not agree to these terms, please do not use this
                  service.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Medical Disclaimer (Detailed) */}
          <section className="card bg-base-100 shadow border-2 border-warning">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">3</span>
                <Stethoscope className="w-5 h-5 text-warning" />
                <h2 className="card-title text-warning">
                  Medical Disclaimer (Please Read Carefully)
                </h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="alert alert-warning">
                  <AlertCircle className="w-5 h-5" />
                  <p>
                    <strong>
                      This tool is designed to ASSIST, not REPLACE, professional
                      medical judgment.
                    </strong>
                  </p>
                </div>

                <p>Please understand the following:</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>
                    <strong>AI predictions may be wrong.</strong> The system
                    analyzes symptoms using machine learning, which has
                    limitations.
                  </li>
                  <li>
                    <strong>Confidence scores indicate reliability.</strong> Lower
                    confidence means less certainty in the prediction.
                  </li>
                  <li>
                    <strong>Not all diseases are detected.</strong> This system
                    only recognizes these conditions:{" "}
                    {LEGAL_CONSTANTS.DISEASES.join(", ")}.
                  </li>
                  <li>
                    <strong>Your condition may be different.</strong> Many
                    diseases share similar symptoms.
                  </li>
                  <li>
                    <strong>Always seek professional care.</strong> Visit a doctor
                    or healthcare worker for proper diagnosis and treatment.
                  </li>
                  <li>
                    <strong>Do not delay treatment.</strong> If you feel seriously
                    ill, seek immediate medical attention.
                  </li>
                </ul>

                <div className="alert mt-4">
                  <Info className="w-5 h-5" />
                  <p className="text-sm">
                    The diseases this system can detect are:{" "}
                    <strong>{LEGAL_CONSTANTS.DISEASES.join(", ")}</strong>. If your
                    symptoms don&apos;t match these conditions, please consult a
                    healthcare professional directly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: User Responsibilities */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">4</span>
                <UserCheck className="w-5 h-5 text-primary" />
                <h2 className="card-title">User Responsibilities</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>As a user of this system, you agree to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Provide accurate symptom information</strong> - Be
                    honest and detailed when describing your symptoms
                  </li>
                  <li>
                    <strong>Not rely solely on AI predictions</strong> - Use this
                    as one tool among many, not your only source of health
                    information
                  </li>
                  <li>
                    <strong>Seek professional medical care</strong> when needed,
                    especially for serious symptoms
                  </li>
                  <li>
                    <strong>Protect your account credentials</strong> - Keep your
                    login information secure
                  </li>
                  <li>
                    <strong>Supervise minors</strong> - If you are a parent or
                    guardian, supervise children using this system
                  </li>
                  <li>
                    <strong>Use the system appropriately</strong> - Do not misuse
                    or attempt to manipulate the system
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: System Limitations */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">5</span>
                <AlertCircle className="w-5 h-5 text-primary" />
                <h2 className="card-title">System Limitations</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>Please be aware of these technical limitations:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Limited disease detection</strong> - Only detects{" "}
                    {LEGAL_CONSTANTS.DISEASES.length} diseases:{" "}
                    {LEGAL_CONSTANTS.DISEASES.join(", ")}
                  </li>
                  <li>
                    <strong>AI accuracy varies</strong> - Predictions depend on
                    symptom clarity and description quality
                  </li>
                  <li>
                    <strong>Requires clear symptom descriptions</strong> - Vague
                    or incomplete descriptions may lead to inaccurate results
                  </li>
                  <li>
                    <strong>Internet connection required</strong> - The system
                    needs a stable internet connection
                  </li>
                  <li>
                    <strong>Not a diagnostic tool</strong> - Results are
                    suggestions for further investigation, not confirmed diagnoses
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6: Research Participation */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">6</span>
                <FlaskConical className="w-5 h-5 text-primary" />
                <h2 className="card-title">Research Participation</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  By using this system, you consent to participate in this
                  research project:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Your data may be used for thesis research (anonymized only)
                  </li>
                  <li>Findings may appear in academic papers or publications</li>
                  <li>Your identity will be protected in all publications</li>
                  <li>
                    <strong>Ethics Status:</strong>{" "}
                    {LEGAL_CONSTANTS.ETHICS_STATUS}
                  </li>
                  <li>
                    You may withdraw from the research at any time by contacting
                    us
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7: Data & Diagnoses */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">7</span>
                <Database className="w-5 h-5 text-primary" />
                <h2 className="card-title">Data & Diagnoses</h2>
              </div>
              <div className="space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Diagnoses are automatically recorded</strong> - Every
                    AI prediction is stored for healthcare and surveillance
                    purposes
                  </li>
                  <li>
                    <strong>Required for health surveillance</strong> - This helps
                    track disease patterns in the community
                  </li>
                  <li>
                    Data is managed by {LEGAL_CONSTANTS.HOSPITAL_NAME}
                  </li>
                  <li>
                    For more details, see our{" "}
                    <Link href="/privacy" className="link link-primary">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8: Age & Consent */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">8</span>
                <Users className="w-5 h-5 text-primary" />
                <h2 className="card-title">Age & Consent</h2>
              </div>
              <div className="space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>All ages may use this system</strong> with appropriate
                    supervision
                  </li>
                  <li>
                    <strong>If you are under 18:</strong> A parent or guardian
                    must consent on your behalf
                  </li>
                  <li>
                    <strong>Parents/guardians:</strong> By allowing minors to use
                    this system, you accept these terms on their behalf
                  </li>
                  <li>
                    <strong>Adult supervision required</strong> for all minors
                    using this system
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 9: Limitation of Liability */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">9</span>
                <Scale className="w-5 h-5 text-primary" />
                <h2 className="card-title">Limitation of Liability</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>Please understand that:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    This is a <strong>research project</strong>, not a commercial
                    medical service
                  </li>
                  <li>
                    <strong>No guarantee of accuracy</strong> is made for AI
                    predictions
                  </li>
                  <li>
                    The research team and {LEGAL_CONSTANTS.HOSPITAL_NAME} are{" "}
                    <strong>not liable</strong> for medical decisions made based
                    on this tool
                  </li>
                  <li>
                    <strong>Use at your own discretion</strong> and always consult
                    healthcare professionals
                  </li>
                  <li>
                    This tool is provided <strong>&quot;as is&quot;</strong> for research
                    purposes
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 10: Changes to Terms */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">10</span>
                <RefreshCw className="w-5 h-5 text-primary" />
                <h2 className="card-title">Changes to Terms</h2>
              </div>
              <div className="space-y-2 text-sm">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    These terms may be updated as the research project evolves
                  </li>
                  <li>
                    Users will be notified of significant changes and asked to
                    re-accept
                  </li>
                  <li>
                    Continued use after changes implies acceptance of updated
                    terms
                  </li>
                  <li>
                    Version numbers help track which terms you have accepted
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 11: Contact & Questions */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">11</span>
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="card-title">Contact & Questions</h2>
              </div>
              <div className="space-y-4 text-sm">
                <p>
                  If you have questions about these terms or the research project:
                </p>
                <div>
                  <h3 className="font-semibold mb-1">Health Center</h3>
                  <p>{LEGAL_CONSTANTS.HOSPITAL_NAME}</p>
                  <p>Phone: {LEGAL_CONSTANTS.HOSPITAL_PHONE}</p>
                </div>
                {/* <div>
                  <h3 className="font-semibold mb-1">Research Team</h3>
                  <p>{LEGAL_CONSTANTS.RESEARCH_TEAM}</p>
                  <p>{LEGAL_CONSTANTS.UNIVERSITY}</p>
                  <p>Email: {LEGAL_CONSTANTS.RESEARCH_EMAIL}</p>
                </div> */}
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm opacity-70">
          <p>
            {LEGAL_CONSTANTS.HOSPITAL_NAME} | {LEGAL_CONSTANTS.BARANGAY_NAME}
          </p>
          <p className="mt-1">
            <Link href="/privacy" className="link link-primary">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default TermsOfServicePage;
