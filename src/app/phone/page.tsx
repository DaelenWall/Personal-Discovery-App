import { Suspense } from "react";
import { PhoneApp } from "@/components/phone-app";

export default function Page() {
  return (
    <Suspense fallback={<p>Opening your commonplace…</p>}>
      <PhoneApp />
    </Suspense>
  );
}
