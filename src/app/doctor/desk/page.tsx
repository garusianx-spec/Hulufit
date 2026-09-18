"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ConsultationDesk } from "@/components/doctor/ConsultationDesk";

function DeskRoute() {
  const search = useSearchParams();
  return <ConsultationDesk initialPatientId={search.get("patient") ?? undefined} />;
}

export default function ConsultationDeskPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-canvas" />}>
      <DeskRoute />
    </Suspense>
  );
}
