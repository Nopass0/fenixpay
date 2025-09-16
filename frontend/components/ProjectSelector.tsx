"use client";

import React from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function ProjectSelector() {
  const { project, setProject } = useProject();

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={project} onValueChange={(value: any) => setProject(value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="chase">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Chase</span>
            </div>
          </SelectItem>
          <SelectItem value="quattrex">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span>Quattrex</span>
            </div>
          </SelectItem>
          <SelectItem value="fenixpay">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>FenixPay</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectToggle() {
  const { project, setProject } = useProject();

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getNextProject = () => {
    switch (project) {
      case "chase":
        return "quattrex";
      case "quattrex":
        return "fenixpay";
      case "fenixpay":
        return "chase";
      default:
        return "chase";
    }
  };

  const getProjectDisplay = (projectType: string) => {
    switch (projectType) {
      case "chase":
        return { color: "bg-emerald-500", name: "Chase" };
      case "quattrex":
        return { color: "bg-violet-500", name: "Quattrex" };
      case "fenixpay":
        return { color: "bg-blue-500", name: "FenixPay" };
      default:
        return { color: "bg-gray-500", name: "Unknown" };
    }
  };

  const currentDisplay = getProjectDisplay(project);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setProject(getNextProject() as any)}
      className="flex items-center gap-2"
    >
      <div className={`w-3 h-3 rounded-full ${currentDisplay.color}`} />
      <span>{currentDisplay.name}</span>
    </Button>
  );
}