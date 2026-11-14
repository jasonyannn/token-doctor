import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Token Doctor · AI Token Efficiency Intelligence",
  description:
    "Diagnose wasted tokens. Accelerate AI workflows. Reduce inference costs.",
  openGraph: { images: ["/brand/logo.png"] },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
