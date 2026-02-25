"use client";

import { deleteChat } from "@/actions/delete-chat";
import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DeleteChatButtonProps = {
  chatId: string;
};

const DeleteChatButton = ({ chatId }: DeleteChatButtonProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { execute, isExecuting } = useAction(deleteChat, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        setIsDeleting(false);
        setErrorMessage(data.error);
        return;
      }

      setErrorMessage(null);
      router.refresh();
    },
    onError: () => {
      setIsDeleting(false);
      setErrorMessage("Failed to delete chat");
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    execute({ chatId });
  };

  const isBusy = isExecuting || isDeleting;

  const modal = (
    <div className={`modal ${isConfirmOpen ? "modal-open" : ""}`}>
      <div className="modal-box">
        <h3 className="font-semibold text-lg">Delete chat?</h3>
        <p className="mt-3 text-muted text-sm">
          This will permanently delete this chat and all related records.
        </p>
        {errorMessage && (
          <div className="alert alert-error mt-3">
            <span>{errorMessage}</span>
          </div>
        )}
        <div className="modal-action">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (isBusy) return;
              setIsConfirmOpen(false);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error text-white"
            onClick={handleDelete}
            disabled={isBusy}
          >
            {isBusy ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
      <form
        method="dialog"
        className="modal-backdrop"
        onClick={() => {
          if (isBusy) return;
          setIsConfirmOpen(false);
        }}
      >
        <button type="button">close</button>
      </form>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle"
        aria-label="Delete chat"
        onClick={() => {
          setErrorMessage(null);
          setIsDeleting(false);
          setIsConfirmOpen(true);
        }}
      >
        <Trash2 className="size-4 text-error" strokeWidth={2.5} />
      </button>
      {isMounted ? createPortal(modal, document.body) : null}
    </>
  );
};

export default DeleteChatButton;