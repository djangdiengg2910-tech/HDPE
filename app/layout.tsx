import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const requestHost = forwardedHost?.split(",")[0]?.trim() ?? requestHeaders.get("host");
  const host = requestHost && /^[a-zA-Z0-9.:[\]-]+$/.test(requestHost)
    ? requestHost
    : "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") === "https" ? "https" : "http";
  const title = "Birthday Generator — Prototype";
  const description = "A local birthday experience prototype with seven scenes.";

  return {
    title,
    description,
    metadataBase: new URL(`${protocol}://${host}`),
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og.png", alt: "Birthday Generator cosmic birthday cake" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#080b24",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
