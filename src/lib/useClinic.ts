import { useEffect, useState } from "react";

export interface Clinic { id: string; name: string; slug: string }

export function useClinic(): Clinic | null {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  useEffect(() => {
    fetch("/api/clinician/session")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setClinic(d));
  }, []);
  return clinic;
}
