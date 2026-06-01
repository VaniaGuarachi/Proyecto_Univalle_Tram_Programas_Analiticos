"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando formulario de inicio de sesion...</div>}>
      <LoginForm />
    </Suspense>
  );
}
