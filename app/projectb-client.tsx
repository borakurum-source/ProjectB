"use client";

import "../features/projectb/index.css";
import App from "../features/projectb/App";
import { AuthProvider } from "../features/projectb/context/AuthContext";

export default function ProjectBClient() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
