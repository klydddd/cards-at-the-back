import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container container-wide footer-inner">
                <span>
                    go<span className="brand-accent">kards</span>
                </span>
                <nav className="footer-links" aria-label="Legal">
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/terms">Terms</Link>
                </nav>
            </div>
        </footer>
    );
}
