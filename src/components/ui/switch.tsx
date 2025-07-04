"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = ({ checked = false, onCheckedChange, ...rest }: SwitchProps) => {
  const [isChecked, setIsChecked] = useState(checked);

  const handleToggle = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onCheckedChange?.(newValue);
  };

  return (
    <motion.button
      role="switch"
      aria-checked={isChecked}
      {...(rest as any)}
      onClick={(e) => {
        rest?.onClick?.(e as any);
        handleToggle();
      }}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full",
        isChecked ? "bg-gray-800" : "bg-gray-200"
      )}
      transition={{
        type: "spring",
        stiffness: 700,
        damping: 30,
      }}
    >
      <motion.span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-gray-900",
          isChecked ? "bg-yellow-300" : "bg-gray-900"
        )}
        animate={{
          x: isChecked ? 20 : 4,
        }}
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
          bounce: 0,
        }}
      >
        {isChecked && (
          <motion.div
            className="absolute h-full w-full z-0 rounded-full bg-yellow-500 blur-lg"
            initial={{
              scale: 0,
            }}
            animate={{
              scale: 1,
            }}
            transition={{
              type: "spring",
              duration: 0.02,
            }}
          />
        )}
      </motion.span>
    </motion.button>
  );
};

export default Switch;
