"use client";

import React from "react";
import { useProject } from "@/contexts/ProjectContext";
import QuattrexLogo from "./QuattrexLogo";
import FenixPayLogo from "./FenixPayLogo";
import { Logo } from "./ui/logo";

export function DynamicLogo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { project } = useProject();

  if (project === "quattrex") {
    return <QuattrexLogo className={className} size={size} />;
  }
  
  if (project === "fenixpay") {
    return <FenixPayLogo className={className} size={size} />;
  }

  return <Logo className={className} size={size} />;
}