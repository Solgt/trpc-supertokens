"use client";

import Link from "next/link";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

export function HomePage() {
    const session = useSessionContext();

    if (session.loading) {
        return null;
    }

    return (
        <>
            <section className="logos">
                <img src="/ST.svg" alt="SuperTokens" />
                <span>x</span>
                <img src="/next.svg" alt="Next" />
                <span>x</span>
                <img src="/trpc_logo.svg" alt="Next" />
            </section>
            <section className="main-container">
                <div className="inner-content">
                    <h1>
                        <strong>SuperTokens</strong> x <strong>Next.js</strong>{" "}
                        x <strong>tRPC</strong> <br /> example project <br />
                    </h1>
                    <h3>
                        bootstrapped with <br />
                        <code
                            style={{ backgroundColor: "lightgray", padding: 1 }}
                        >
                            npx create-supertokens-app@latest
                        </code>
                    </h3>
                    <div>
                        {session.doesSessionExist ? (
                            <p>
                                You&apos;re signed in already, <br /> check out
                                the Dashboard! 👇
                            </p>
                        ) : (
                            <p>Sign-in to continue</p>
                        )}
                    </div>
                    <nav className="buttons">
                        {session.doesSessionExist ? (
                            <Link
                                href="/dashboard"
                                className="dashboard-button"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link href="/auth" className="dashboard-button">
                                Sign-up / Login
                            </Link>
                        )}
                    </nav>
                </div>
            </section>
        </>
    );
}
