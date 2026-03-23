import Link from "next/link";
import { LEGAL_CONSTANTS } from "@/constants/legal";

/**
 * Footer component with links to Privacy Policy, Terms of Service, and contact information.
 * Used across the application for consistent legal link access.
 * Theme-aware - works in both light and dark modes.
 * 
 * Uses `mt-auto` to push itself to the bottom of flex containers, ensuring it 
 * sticks to the bottom of the scrollable area when content is short.
 */
const LegalFooter = () => {
  return (
    <footer className="relative z-10 mt-auto w-full py-4 px-4 bg-base-100/50 border-t border-base-300/50 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs tracking-wide text-base-content/50">
        <div className="flex items-center gap-4">
          <Link 
            href="/privacy" 
            className="hover:text-base-content transition-colors duration-200"
          >
            Privacy Policy
          </Link>
          <span className="opacity-30 text-[10px]">•</span>
          <Link 
            href="/terms" 
            className="hover:text-base-content transition-colors duration-200"
          >
            Terms of Service
          </Link>
          <span className="opacity-30 text-[10px]">•</span>
          <a
            href={`mailto:${LEGAL_CONSTANTS.HOSPITAL_EMAIL}`}
            className="hover:text-base-content transition-colors duration-200"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default LegalFooter;
