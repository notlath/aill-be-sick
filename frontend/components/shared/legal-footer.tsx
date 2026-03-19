import Link from "next/link";
import { LEGAL_CONSTANTS } from "@/constants/legal";

/**
 * Footer component with links to Privacy Policy, Terms of Service, and contact information.
 * Used across the application for consistent legal link access.
 */
const LegalFooter = () => {
  return (
    <footer className="w-full py-4 px-4 bg-white/5 border-t border-white/10 backdrop-blur-sm text-white/50">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs tracking-wide">
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span className="opacity-30 text-[10px]">●</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <span className="opacity-30 text-[10px]">●</span>
          <a
            href={`mailto:${LEGAL_CONSTANTS.HOSPITAL_EMAIL}`}
            className="hover:text-white transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default LegalFooter;
