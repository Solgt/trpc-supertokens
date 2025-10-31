import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SuperTokensProvider } from "./components/supertokensProvider";
import Link from "next/link";
import { ComponentWrapper } from "./config/frontend";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "SuperTokens + tRPC + Nextjs",
    description: "SuperTokens + tRPC demo app",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    "use client";
    return (
        <html lang="en">
            <body className={`${inter.className} app-wrapper`}>
                <SuperTokensProvider>
                    <div className="App app-container">
                        <header>
                            <nav className="header-container">
                                <Link href="/">🏠</Link>
                                <ul className="header-container-right">
                                    <li>
                                        <a
                                            href="https://trpc.io/docs"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            tRPC Docs
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://supertokens.com/docs//"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            SuperTokens Docs
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="https://github.com/supertokens/create-supertokens-app"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            SuperTokens CLI Repo
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        </header>
                        <div className="fill" id="home-container">
                            <ComponentWrapper>
                                <>{children}</>
                            </ComponentWrapper>
                        </div>
                    </div>
                </SuperTokensProvider>
            </body>
        </html>
    );
}
