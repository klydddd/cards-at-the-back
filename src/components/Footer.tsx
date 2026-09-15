import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container container-wide footer-inner">
                <span>
                    go<span className="brand-accent">kards</span>
                </span>
                <nav className="footer-links" aria-label="Footer">
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/terms">Terms</Link>
                    <Link href="/contact">Contact</Link>
                </nav>
            </div>
        </footer>
    );
}
