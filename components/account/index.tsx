"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";

const accountsKey = "token-doctor-password-accounts";
const activeKey = "token-doctor-password-session";
type Mode = "Sign in" | "Sign up";

export function loadAccount() {
  try {
    return localStorage.getItem(activeKey) ?? "";
  } catch {
    return "";
  }
}

async function verifier(password: string, salt: number[]) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 600000,
      salt: Uint8Array.from(salt),
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits)).join(",");
}

export function TestAccount({
  account,
  setAccount,
  request,
}: {
  account: string;
  setAccount: (email: string) => void;
  request: number;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("Sign in");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  function open(nextMode: Mode) {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setError("");
    dialog.current?.showModal();
  }
  useEffect(() => {
    if (request && !account) open("Sign up");
  }, [request]);

  return (
    <div className="account-actions">
      {account ? (
        <>
          <span className="account-email" title={account}>
            {account}
          </span>
          <Button
            onClick={() => {
              try {
                localStorage.removeItem(activeKey);
                setAccount("");
              } catch {
                setError("Browser storage is unavailable.");
              }
            }}
          >
            Sign out
          </Button>
          {error && <span role="alert">{error}</span>}
        </>
      ) : (
        <>
          <Button onClick={() => open("Sign in")}>Sign in</Button>
          <Button variant="primary" onClick={() => open("Sign up")}>
            Sign up
          </Button>
        </>
      )}
      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        className="panel account-dialog"
        aria-labelledby="account-heading"
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const address = email.trim().toLowerCase();
            if (busy) return;
            setBusy(true);
            const submittedDialog = dialog.current;
            try {
              const accounts: {
                email: string;
                salt: number[];
                hash: string;
              }[] = JSON.parse(localStorage.getItem(accountsKey) ?? "[]");
              const exists = accounts.find((row) => row.email === address);
              if (mode === "Sign up" && exists) {
                setError("This test account already exists. Choose Sign in.");
                return;
              }
              if (mode === "Sign in" && !exists) {
                setError("No test account found. Choose Sign up first.");
                return;
              }
              const salt =
                exists?.salt ??
                Array.from(crypto.getRandomValues(new Uint8Array(16)));
              const hash = await verifier(password, salt);
              if (!submittedDialog?.open) return;
              if (exists && exists.hash !== hash) {
                setError("Incorrect password.");
                return;
              }
              if (!exists)
                localStorage.setItem(
                  accountsKey,
                  JSON.stringify([...accounts, { email: address, salt, hash }]),
                );
              localStorage.setItem(activeKey, address);
              setPassword("");
              setAccount(address);
              setError("");
              dialog.current?.close();
            } catch {
              setError("Could not access test accounts in browser storage.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 id="account-heading">{mode}</h2>
          <p>
            Use a test email, such as demo@example.com. Accounts stay in this
            browser. Use a test password with at least eight characters.
          </p>
          <label>
            Test email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setPassword("");
                setError("");
              }}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === "Sign up" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <Button variant="primary" type="submit" disabled={busy}>
              {mode}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode(mode === "Sign in" ? "Sign up" : "Sign in");
                setPassword("");
                setError("");
              }}
            >
              {mode === "Sign in" ? "Switch to sign up" : "Switch to sign in"}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
