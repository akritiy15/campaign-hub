import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campaign Hub",
  description: "Manage cold-outreach campaigns and leads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-indigo-600">
              Campaign Hub
            </Link>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/docs`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              API docs ↗
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
