import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getCurrentTheme } from "@/data/theme";
import { getTheme } from "@/domain/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bar Manager",
  description: "Inventory, recipes, service, and purchasing for modern bars.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = getTheme(await getCurrentTheme());
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-theme={theme.id}
      style={theme.variables as CSSProperties}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
