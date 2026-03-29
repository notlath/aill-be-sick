"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPatientAccount } from "@/actions/create-patient-account";
import {
  CreatePatientAccountSchema,
  CreatePatientAccountSchemaType,
} from "@/schemas/CreatePatientAccountSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  Loader2,
  UserPlus,
  X,
  Copy,
  CheckCircle2,
  Mail,
  Key,
  AlertCircle,
} from "lucide-react";

import { Input } from "@/components/ui/input";

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CreatedAccountEmail = {
  type: "email";
  email: string;
  temporaryPassword: string;
  message: string;
};

type CreatedAccountAccessCode = {
  type: "accessCode";
  accessCode: string;
  temporaryPassword: string;
  message: string;
};

type CreatedAccount = CreatedAccountEmail | CreatedAccountAccessCode;

export default function CreatePatientModal({
  isOpen,
  onClose,
}: CreatePatientModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const form = useForm<CreatePatientAccountSchemaType>({
    defaultValues: {
      name: "",
      email: "",
      birthday: "",
      hasEmail: true,
    },
    resolver: zodResolver(CreatePatientAccountSchema),
  });

  // Watch the hasEmail field to conditionally show/hide email input
  const hasEmail = useWatch({ control: form.control, name: "hasEmail" });

  const { execute: createAccount, isExecuting: isCreating } = useAction(
    createPatientAccount,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else if (data?.success) {
          setCreatedAccount(data.success as CreatedAccount);
          toast.success("Patient account created successfully");
          form.reset();
        }
      },
      onError: () => {
        toast.error("Failed to create patient account");
      },
    }
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setCreatedAccount(null);
      setCopied(false);
    }
  }, [isOpen, form]);

  // Clear email field when switching to no-email mode
  useEffect(() => {
    if (!hasEmail) {
      form.setValue("email", "");
      form.clearErrors("email");
    }
  }, [hasEmail, form]);

  const handleSubmit = form.handleSubmit((formData) => {
    createAccount(formData);
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCopyCredentials = async () => {
    if (!createdAccount) return;

    let credentials: string;
    if (createdAccount.type === "email") {
      credentials = `Email: ${createdAccount.email}\nTemporary Password: ${createdAccount.temporaryPassword}`;
    } else {
      credentials = `Access Code: ${createdAccount.accessCode}\nTemporary Password: ${createdAccount.temporaryPassword}`;
    }

    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      toast.success("Credentials copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy credentials");
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal [&::backdrop]:bg-black/50"
      onCancel={onClose}
      onClick={onClose}
    >
      <div
        className="modal-box bg-base-100 max-w-md"
        onClick={handleContentClick}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl">
            {createdAccount ? "Account Created" : "Create Patient Account"}
          </h3>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdAccount ? (
          // Success state - show credentials based on account type
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-base-content/70">
                {createdAccount.message}
              </p>
            </div>

            <div className="bg-base-200 rounded-xl p-4 space-y-3">
              {createdAccount.type === "email" ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-base-content/60 uppercase tracking-wide flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      Email
                    </label>
                    <p className="font-mono text-sm mt-1 break-all">
                      {createdAccount.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-base-content/60 uppercase tracking-wide flex items-center gap-1.5">
                      <Key className="h-3 w-3" />
                      Temporary Password
                    </label>
                    <p className="font-mono text-sm mt-1 break-all select-all">
                      {createdAccount.temporaryPassword}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-base-content/60 uppercase tracking-wide flex items-center gap-1.5">
                      <Key className="h-3 w-3" />
                      Access Code
                    </label>
                    <p className="font-mono text-lg mt-1 break-all select-all font-semibold tracking-wider">
                      {createdAccount.accessCode}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
                      Temporary Password
                    </label>
                    <p className="font-mono text-sm mt-1 break-all select-all">
                      {createdAccount.temporaryPassword}
                    </p>
                  </div>
                </>
              )}
            </div>

            {createdAccount.type === "email" ? (
              <div className="alert alert-info py-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-xs">
                  A verification email has been sent to the patient. They must
                  click the link in the email before they can access their
                  diagnoses.
                </span>
              </div>
            ) : (
              <div className="alert alert-warning py-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="text-xs">
                  Write down the access code and password for the patient. The
                  patient will use the access code instead of an email address
                  to log in.
                </span>
              </div>
            )}

            <div className="alert py-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-xs">
                The patient will be asked to change their password when they
                first log in.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="btn btn-primary w-full gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Credentials
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-ghost w-full"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                placeholder="Juan Dela Cruz"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <span className="text-error text-xs">
                  {form.formState.errors.name.message}
                </span>
              )}
            </div>

            {/* Email toggle */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={hasEmail}
                  onChange={(e) => form.setValue("hasEmail", e.target.checked)}
                />
                <span className="label-text">Patient has an email address</span>
              </label>
            </div>

            {hasEmail ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="patient@email.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <span className="text-error text-xs">
                    {form.formState.errors.email.message}
                  </span>
                )}
                <p className="text-xs text-base-content/60">
                  A verification email will be sent to this address.
                </p>
              </div>
            ) : (
              <div className="alert alert-info py-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="text-xs">
                  <p className="font-medium">No email? No problem.</p>
                  <p>
                    An access code will be generated for this patient. Share the
                    code with them so they can log in.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <Input type="date" {...form.register("birthday")} />
              {form.formState.errors.birthday && (
                <span className="text-error text-xs">
                  {form.formState.errors.birthday.message}
                </span>
              )}
            </div>

            <p className="text-sm text-base-content/60">
              {hasEmail
                ? "A temporary password will be generated. Share it with the patient along with instructions to verify their email."
                : "An access code and temporary password will be generated. Share both with the patient."}
            </p>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="btn btn-primary"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Create Account
              </button>
            </div>
          </form>
        )}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
