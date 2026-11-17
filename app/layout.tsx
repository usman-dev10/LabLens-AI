import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabLens | Understand your lab report",
  description: "Educational lab-report explanations in plain English and Roman Urdu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
