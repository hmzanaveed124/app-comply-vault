import "~/styles/globals.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ThemeProvider } from "~/theme/provider";

import { type Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "ComplyVault",
  description:
    "Meeting records your CCO can seal for exam documentation — with human review before anything is final.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <style>{"@layer theme, base, antd, components, utilities;"}</style>
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('complyvault-theme')==='dark')}catch(e){}})()`,
          }}
        />
        <AntdRegistry layer>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
