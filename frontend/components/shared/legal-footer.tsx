import Link from "next/link";
import { LEGAL_CONSTANTS } from "@/constants/legal";

/**
 * Footer component with links to Privacy Policy, Terms of Service, and contact information.
 * Used across the application for consistent legal link access.
 */
const LegalFooter = () => {
  return (
    <footer className="w-full py-3 px-4 bg-base-200/50 border-t border-border/50">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-base-content/60">
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="link link-hover">
            Privacy Policy
          </Link>
          <span className="opacity-40">|</span>
          <Link href="/terms" className="link link-hover">
            Terms of Service
          </Link>
          <span className="opacity-40">|</span>
          <a
            href={`mailto:${LEGAL_CONSTANTS.HOSPITAL_EMAIL}`}
            className="link link-hover"
          >
            Contact
          </a>
        </div>
        <span className="hidden sm:inline opacity-40">|</span>
        <span>{LEGAL_CONSTANTS.HOSPITAL_NAME}</span>
      </div>
    </footer>
  );
};

export default LegalFooter;
