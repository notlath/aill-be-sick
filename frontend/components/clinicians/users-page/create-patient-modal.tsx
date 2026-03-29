"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPatientAccount } from "@/actions/create-patient-account";
import {
  CreatePatientAccountSchema,
  CreatePatientAccountSchemaType,
} from "@/schemas/CreatePatientAccountSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Loader2, UserPlus, X, Copy, CheckCircle2 } from "lucide-react";

import { Input } from "@/components/ui/input";

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreatedAccount {
  email: string;
  temporaryPassword: string;
}

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
    },
    resolver: zodResolver(CreatePatientAccountSchema),
  });

  const { execute: createAccount, isExecuting: isCreating } = useAction(
    createPatientAccount,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else if (data?.success) {
          setCreatedAccount({
            email: data.success.email,
            temporaryPassword: data.success.temporaryPassword,
          });
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

    const credentials = `Email: ${createdAccount.email}\nTemporary Password: ${createdAccount.temporaryPassword}`;

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
          // Success state - show credentials
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted">
                The patient account has been created. Share these credentials
                with the patient so they can log in.
              </p>
            </div>

            <div className="bg-base-200 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide">
                  Email
                </label>
                <p className="font-mono text-sm mt-1 break-all">
                  {createdAccount.email}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide">
                  Temporary Password
                </label>
                <p className="font-mono text-sm mt-1 break-all select-all">
                  {createdAccount.temporaryPassword}
                </p>
              </div>
            </div>

            <div className="alert alert-info py-3">
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <Input type="date" {...form.register("birthday")} />
              {form.formState.errors.birthday && (
                <span className="text-error text-xs">
                  {form.formState.errors.birthday.message}
                </span>
              )}
            </div>

            <p className="text-sm text-muted">
              A temporary password will be generated automatically. You can
              share it with the patient after the account is created.
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
