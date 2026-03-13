"use client";

import { useEffect, useRef, useCallback } from "react";
import { addAllowedClinicianEmail } from "@/actions/manage-clinicians";
import { ManageClinicianEmailSchema, ManageClinicianEmailSchemaType } from "@/schemas/ManageClinicianEmailSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface AddClinicianEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddClinicianEmailModal({ isOpen, onClose }: AddClinicianEmailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const form = useForm<ManageClinicianEmailSchemaType>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(ManageClinicianEmailSchema),
  });

  const { execute: addEmail, isExecuting: isAdding } = useAction(
    addAllowedClinicianEmail,
    {
      onSuccess: ({ data }) => {
        if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success("Email added to whitelist");
          form.reset();
          handleClose();
        }
      },
      onError: () => {
        toast.error("Failed to add email");
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
    }
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit((formData) => {
    addEmail(formData);
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
          <h3 className="font-bold text-xl">Add Clinician Email</h3>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              placeholder="doctor@hospital.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <span className="text-error text-xs">
                {form.formState.errors.email.message}
              </span>
            )}
          </div>

          <p className="text-sm text-muted">
            This email will be authorized to register as a clinician in the system.
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
              disabled={isAdding}
              className="btn btn-primary"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Email
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
