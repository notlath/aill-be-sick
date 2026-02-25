"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={"light"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast flex flex-row items-start group-[.toaster]:bg-base-100 group-[.toaster]:text-base-content group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          icon: "flex-shrink-0 mt-0.5",
          title: "font-semibold text-sm",
          description: "text-sm text-muted",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-content",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-content",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
