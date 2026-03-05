"use client";

import { PropsWithChildren, useEffect, useState } from "react";

type ThreadTransitionProps = PropsWithChildren<{
  className?: string;
}>;

const ThreadTransition = ({ children, className = "" }: ThreadTransitionProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`transform-gpu transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default ThreadTransition;
