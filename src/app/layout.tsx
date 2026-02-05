import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zana Christian H/S",
  description: "Student Information System (Frontend Prototype)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
