import Link from 'next/link';
import { LEGAL_LAST_UPDATED } from '@/lib/legal';

type LegalPageProps = {
    eyebrow: string;
    title: string;
    lede: string;
    sections: { id: string; title: string }[];
    related: { href: string; label: string };
    children: React.ReactNode;
};

export default function LegalPage({ eyebrow, title, lede, sections, related, children }: LegalPageProps) {
    return (
        <div className="page">
            <div className="container legal">
                <header className="legal-header">
                    <p className="eyebrow">{eyebrow}</p>
                    <h1>{title}</h1>
                    <p className="legal-lede">{lede}</p>
                    <p className="legal-updated">Last updated {LEGAL_LAST_UPDATED}</p>
                </header>

                <nav className="index-card legal-toc" aria-label="On this page">
                    <div className="index-card-head">On this page</div>
                    <ol className="index-card-body">
                        {sections.map((section) => (
                            <li key={section.id}>
                                <a href={`#${section.id}`}>{section.title}</a>
                            </li>
                        ))}
                    </ol>
                </nav>

                <div className="legal-body">{children}</div>

                <p className="legal-crosslink">
                    See also our <Link href={related.href}>{related.label}</Link>.
                </p>
            </div>
        </div>
    );
}
