"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function WellbitDocsPage() {
  return (
    <div className="p-4">
      <SwaggerUI url="/api/wellbit/openapi.yaml" />
    </div>
  );
}
