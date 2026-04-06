import { LEGAL_CONSTANTS } from "@/constants/legal";
import {
  Shield,
  Database,
  Eye,
  Lock,
  UserCheck,
  Clock,
  FlaskConical,
  Users,
  Mail,
  FileText,
} from "lucide-react";
import Link from "next/link";
import BackButton from "@/components/shared/back-button";

const PrivacyPolicyPage = () => {
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
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Privacy Policy</h1>
                <p className="text-sm opacity-70">
                  Version {LEGAL_CONSTANTS.PRIVACY_VERSION} | Last Updated:{" "}
                  {LEGAL_CONSTANTS.LAST_UPDATED}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Research Project Notice */}
        <div className="alert alert-info mb-6">
          <FlaskConical className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Research Project Notice</h3>
            <p className="text-sm">
              This is a thesis research project developed for{" "}
              <strong>{LEGAL_CONSTANTS.HOSPITAL_NAME}</strong> in{" "}
              {LEGAL_CONSTANTS.BARANGAY_NAME}. Your data helps improve disease
              detection and public health monitoring in your community.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1: About This Research */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">1</span>
                <FlaskConical className="w-5 h-5 text-primary" />
                <h2 className="card-title">About This Research</h2>
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>AI&apos;ll Be Sick</strong> is a thesis research project
                  titled &quot;{LEGAL_CONSTANTS.THESIS_TITLE}&quot; developed by{" "}
                  {LEGAL_CONSTANTS.RESEARCH_TEAM} from {LEGAL_CONSTANTS.UNIVERSITY}.
                </p>
                <p>
                  This system is deployed at{" "}
                  <strong>{LEGAL_CONSTANTS.HOSPITAL_NAME}</strong> to assist
                  healthcare workers in identifying common infectious diseases
                  based on symptoms you describe.
                </p>
                <p>
                  <strong>Ethics Status:</strong> {LEGAL_CONSTANTS.ETHICS_STATUS}
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: What Data We Collect */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">2</span>
                <Database className="w-5 h-5 text-primary" />
                <h2 className="card-title">What Data We Collect</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p>When you use AI&apos;ll Be Sick, we collect and store:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Symptoms you describe</strong> - The health concerns
                    you type into the system
                  </li>
                  <li>
                    <strong>AI-generated disease predictions</strong> - The
                    system&apos;s analysis of your symptoms
                  </li>
                  <li>
                    <strong>Location information</strong> - Your barangay, city,
                    and region for disease surveillance
                  </li>
                  <li>
                    <strong>Account information</strong> - Email address, name,
                    age, and gender (if provided)
                  </li>
                  <li>
                    <strong>Chat history</strong> - Conversations with the AI
                    assistant
                  </li>
                  <li>
                    <strong>Timestamps</strong> - When you use the system
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: How We Use Your Data */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">3</span>
                <Eye className="w-5 h-5 text-primary" />
                <h2 className="card-title">How We Use Your Data</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p>Your data is used for the following purposes:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Disease detection assistance</strong> - To analyze
                    your symptoms and suggest possible conditions
                  </li>
                  <li>
                    <strong>Epidemiological surveillance</strong> - To help
                    healthcare workers track disease patterns in the community
                  </li>
                  <li>
                    <strong>Research analysis</strong> - To improve the AI system
                    (using anonymized data only)
                  </li>
                  <li>
                    <strong>Healthcare pattern identification</strong> - To
                    identify potential disease outbreaks in the area
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: Data Security & Control */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">4</span>
                <Lock className="w-5 h-5 text-primary" />
                <h2 className="card-title">Data Security & Control</h2>
              </div>
              <div className="space-y-3 text-sm">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Your data is stored securely in systems managed by{" "}
                    <strong>{LEGAL_CONSTANTS.HOSPITAL_NAME}</strong>
                  </li>
                  <li>
                    Only authorized healthcare workers can access identifiable
                    patient data
                  </li>
                  <li>
                    Researchers only have access to anonymized, aggregate data
                  </li>
                  <li>
                    Data retention and security policies are determined by the
                    health center
                  </li>
                  <li>
                    Your data is <strong>never sold</strong> to third parties
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Your Rights */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">5</span>
                <UserCheck className="w-5 h-5 text-primary" />
                <h2 className="card-title">Your Rights</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p>As a user of this system, you have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Access your data</strong> - View your diagnosis
                    history and account information at any time
                  </li>
                  <li>
                    <strong>Request account deletion</strong> - You may request
                    to delete your account
                  </li>
                  <li>
                    <strong>Withdraw from the system</strong> - Stop using the
                    service at any time
                  </li>
                  <li>
                    <strong>Contact us</strong> - Reach out with any questions or
                    concerns about your data
                  </li>
                </ul>
                <div className="alert alert-warning mt-3">
                  <FileText className="w-5 h-5" />
                  <div>
                    <p className="text-sm">
                      <strong>Important:</strong> Diagnosis records are
                      automatically retained by the health center for medical
                      record-keeping and public health surveillance purposes,
                      even if you delete your account. This is required for
                      healthcare compliance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Data Retention */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">6</span>
                <Clock className="w-5 h-5 text-primary" />
                <h2 className="card-title">Data Retention</h2>
              </div>
              <div className="space-y-3 text-sm">
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Data retention periods are determined by{" "}
                    <strong>{LEGAL_CONSTANTS.HOSPITAL_NAME}</strong> policies
                  </li>
                  <li>
                    Medical records are kept for healthcare and epidemiological
                    purposes
                  </li>
                  <li>
                    Your data is <strong>not publicly shared</strong> or sold
                  </li>
                  <li>
                    Diagnosis records are retained as part of health center
                    records
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7: Research Participation */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">7</span>
                <FlaskConical className="w-5 h-5 text-primary" />
                <h2 className="card-title">Research Participation</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p>By using this system, you agree to participate in this research project:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Your data may be used in the thesis research (in anonymized
                    form only)
                  </li>
                  <li>
                    Findings may appear in academic papers or publications
                  </li>
                  <li>
                    Your identity will always be protected in any publications
                  </li>
                  <li>
                    You can withdraw from the research at any time by contacting
                    us
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8: For Minors */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">8</span>
                <Users className="w-5 h-5 text-primary" />
                <h2 className="card-title">For Minors (Under 18)</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p>
                  This system may be used by individuals of all ages. If you are
                  under 18 years old:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    A parent or guardian should supervise your use of this system
                  </li>
                  <li>
                    Your parent or guardian consents on your behalf when creating
                    an account
                  </li>
                  <li>
                    Always inform a parent or guardian about any health concerns
                  </li>
                  <li>
                    Seek professional medical care with adult supervision
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 9: Contact Information */}
          <section className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <span className="badge badge-primary badge-lg">9</span>
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="card-title">Contact Information</h2>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-1">Health Center</h3>
                  <p>{LEGAL_CONSTANTS.HOSPITAL_NAME}</p>
                  <p>Phone: {LEGAL_CONSTANTS.HOSPITAL_PHONE}</p>
                  <p>Address: {LEGAL_CONSTANTS.HOSPITAL_ADDRESS}</p>
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
            <Link href="/terms" className="link link-primary">
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicyPage;
