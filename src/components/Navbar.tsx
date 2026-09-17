"use client";

import Link from 'next/link';
import { toggleTheme } from '@/lib/theme';
import { MoonIcon, SunIcon } from './Icons';

export default function Navbar() {
    // No theme state here on purpose. The blocking script in app/layout.tsx
    // stamps data-theme before first paint, and CSS picks the right icon off
    // that attribute — so there is nothing to hydrate and nothing to flash.
    //
    // The previous version ran setTheme(theme) in an effect on every mount,
    // which wrote localStorage unconditionally and so froze an implicit OS
    // preference into an explicit stored one: a user on OS-dark who never
    // touched this button could never follow their OS back to light.
    const handleToggle = () => {
        toggleTheme();
    };

    return (
        <nav className="navbar">
            <div className="container container-wide navbar-inner">
                <Link href="/" className="navbar-brand">
                    go<span className="brand-accent">kards</span>
                </Link>
                <div className="navbar-links">
                    <button
                        type="button"
                        className="navbar-toggle"
                        onClick={handleToggle}
                        aria-label="Toggle dark mode"
                        title="Toggle dark mode"
                    >
                        <MoonIcon size={18} className="theme-icon theme-icon-moon" />
                        <SunIcon size={18} className="theme-icon theme-icon-sun" />
                    </button>
                    <div className="divider" />
                    <Link href="/challenges" className="btn btn-ghost btn-sm">
                        Challenges
                    </Link>
                    <Link href="/create" className="btn btn-ghost btn-sm">
                        Create
                    </Link>
                    <Link href="/ai-parse" className="btn btn-primary btn-sm">
                        AI Parse
                    </Link>
                </div>
            </div>
        </nav>
    );
}
