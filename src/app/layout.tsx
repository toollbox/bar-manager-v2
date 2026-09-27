import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bar Manager",
  description: "Inventory, recipes, service, and purchasing for modern bars.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
