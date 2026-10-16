import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Fix | Issue reporting",
  description: "Report and track campus facilities and technology issues.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
