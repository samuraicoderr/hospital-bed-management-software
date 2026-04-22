import React from "react";

export default function AuthDivider({ text = "or continue with" }: { text?: string }) {
  return (
    <div className="auth-divider">
      <span className="auth-divider-text">{text}</span>
    </div>
  );
}
