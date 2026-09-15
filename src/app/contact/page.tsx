import Link from 'next/link';
import ContactForm from '@/components/ContactForm';
import { CONTACT_EMAIL, isContactTopic } from '@/lib/legal';

export const metadata = {
    title: 'Contact · gokards',
    description: 'Get in touch about gokards: questions, bug reports, content removal, abuse, or privacy requests.',
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
    const { topic } = await searchParams;

    return (
        <div className="page">
            <div className="container contact">
                <header className="legal-header">
                    <p className="eyebrow">Contact</p>
                    <h1>Get in touch</h1>
                    <p className="legal-lede">
                        Found a bug, have an idea, or need something taken down? Send a message and we&apos;ll get back
                        to you by email.
                    </p>
                </header>

                <div className="contact-layout">
                    <ContactForm key={topic} initialTopic={isContactTopic(topic) ? topic : 'general'} />

                    <aside className="contact-aside">
                        <section>
                            <h3>Email</h3>
                            <p>
                                Prefer your own inbox? Write to{' '}
                                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                            </p>
                        </section>
                        <section>
                            <h3>Removal requests</h3>
                            <p>
                                gokards has no accounts, so include a link to the deck or quiz and the name that was used.
                                That&apos;s how we find it.
                            </p>
                        </section>
                        <section>
                            <h3>Response time</h3>
                            <p>gokards is a small project. We usually reply within a few days.</p>
                        </section>
                        <p className="contact-legal">
                            Messages are handled as described in our <Link href="/privacy">Privacy Policy</Link>.
                        </p>
                    </aside>
                </div>
            </div>
        </div>
    );
}
