"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Wraps the app so light/dark mode works everywhere. next-themes toggles a
// `class="dark"` on <html>, which our Tailwind/Shadcn tokens already respond to.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}