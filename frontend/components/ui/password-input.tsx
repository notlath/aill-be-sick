import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PasswordInputProps {
  id?: string;
  placeholder?: string;
  className?: string;
  minLength?: number;
  required?: boolean;
  disabled?: boolean;
  // Add other Input props as needed
}

export const PasswordInput = ({
  id,
  placeholder,
  className = "",
  minLength,
  required,
  disabled,
  ...props
}: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className={`${className} pr-10`} // Add padding-right for the toggle button
        minLength={minLength}
        required={required}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        onClick={toggleShowPassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted hover:text-base-content disabled:opacity-50"
        disabled={disabled}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
