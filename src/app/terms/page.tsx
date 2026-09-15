import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { CONTACT_EMAIL } from '@/lib/legal';

export const metadata = {
    title: 'Terms of Service · gokards',
    description: 'The rules for using gokards.',
};

const SECTIONS = [
    { id: 'agreement', title: 'Agreeing to these terms' },
    { id: 'service', title: 'What gokards is' },
    { id: 'eligibility', title: 'Who can use gokards' },
    { id: 'content', title: 'Your content' },
    { id: 'acceptable-use', title: 'Acceptable use' },
    { id: 'ai', title: 'AI-generated content' },
    { id: 'quizzes', title: 'Shared quizzes and leaderboards' },
    { id: 'removal', title: 'Removing content' },
    { id: 'availability', title: 'Availability and changes' },
    { id: 'disclaimer', title: 'Disclaimers' },
    { id: 'liability', title: 'Limitation of liability' },
    { id: 'changes', title: 'Changes to these terms' },
    { id: 'contact', title: 'Contact' },
];

export default function TermsPage() {
    return (
        <LegalPage
            eyebrow="Legal"
            title="Terms of Service"
            lede="These terms cover your use of gokards. They're written to be read, so please take a few minutes with them."
            sections={SECTIONS}
            related={{ href: '/privacy', label: 'Privacy Policy' }}
        >
            <section id="agreement">
                <h2>Agreeing to these terms</h2>
                <p>
                    By using gokards, you agree to these Terms of Service and to our{' '}
                    <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the app.
                </p>
            </section>

            <section id="service">
                <h2>What gokards is</h2>
                <p>
                    gokards is a free study tool. You can create flashkard decks by hand or from an uploaded file with
                    AI, practice with flip kards and spaced repetition, generate quizzes, and share quizzes with others.
                    gokards has no accounts, and all saved content is public.
                </p>
            </section>

            <section id="eligibility">
                <h2>Who can use gokards</h2>
                <p>
                    You must be at least 13 years old to use gokards. If you&apos;re under the age of majority where you
                    live, you should have a parent or guardian&apos;s permission.
                </p>
            </section>

            <section id="content">
                <h2>Your content</h2>
                <p>
                    You keep ownership of the decks, kards, and quizzes you create. By saving content on gokards, you
                    give us a worldwide, non-exclusive, royalty-free license to store, display, copy, and share it as
                    needed to run the service. That includes showing it publicly and letting others practice with it or
                    take quizzes made from it.
                </p>
                <p>You are responsible for what you upload and save, and you confirm that:</p>
                <ul>
                    <li>you have the right to use and share it, including any notes, slides, or documents you upload, and</li>
                    <li>it doesn&apos;t contain personal or confidential information that you aren&apos;t comfortable making public.</li>
                </ul>
            </section>

            <section id="acceptable-use">
                <h2>Acceptable use</h2>
                <p>When using gokards, you agree not to:</p>
                <ul>
                    <li>post content that is illegal, hateful, harassing, sexually explicit, or that threatens or targets anyone;</li>
                    <li>share other people&apos;s personal information without their permission;</li>
                    <li>upload material that infringes someone else&apos;s copyright or other rights;</li>
                    <li>share exam content or answers where doing so breaks your school&apos;s academic integrity rules;</li>
                    <li>use offensive or impersonating names on leaderboards;</li>
                    <li>edit, vandalize, or spam decks and quizzes created by others;</li>
                    <li>send automated or excessive requests, especially to the AI features, or try to overload the service;</li>
                    <li>try to trick the AI features into ignoring their instructions or producing harmful output;</li>
                    <li>probe, scrape, or bypass security measures, or access data and admin functions you aren&apos;t meant to.</li>
                </ul>
            </section>

            <section id="ai">
                <h2>AI-generated content</h2>
                <p>
                    AI Parse and AI quizzes are powered by Google&apos;s Gemini models. AI output can be incomplete, out of
                    date, or simply wrong. Always check generated kards and answers against your course material before
                    relying on them.
                </p>
                <p>
                    By using these features, you agree that the text involved will be sent to Google for processing,
                    and you agree to follow Google&apos;s generative AI usage policies. AI features may be limited, changed,
                    or turned off at any time.
                </p>
            </section>

            <section id="quizzes">
                <h2>Shared quizzes and leaderboards</h2>
                <p>
                    When you take a shared quiz, your player name, score, and completion time are shown on that
                    quiz&apos;s leaderboard to anyone with the link. Scores are calculated on the server. We may remove
                    attempts that look automated, manipulated, or that break these terms.
                </p>
            </section>

            <section id="removal">
                <h2>Removing content</h2>
                <p>
                    We may remove any content, or limit access to gokards, at our discretion, including when we believe
                    it breaks these terms or the law. If you think content on gokards infringes your rights or should be
                    taken down, <Link href="/contact?topic=removal">contact us</Link> with a
                    link to it and a short explanation.
                </p>
            </section>

            <section id="availability">
                <h2>Availability and changes</h2>
                <p>
                    gokards is a personal project offered free of charge. We may change, pause, or discontinue any part
                    of it at any time, and we can&apos;t promise it will always be available. Data may be lost. Keep your
                    own copy of anything important.
                </p>
            </section>

            <section id="disclaimer">
                <h2>Disclaimers</h2>
                <p>
                    gokards is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>, without
                    warranties of any kind, whether express or implied. These include warranties of merchantability,
                    fitness for a particular purpose, accuracy, and non-infringement. gokards is a study aid, and we
                    don&apos;t guarantee any grade, exam result, or learning outcome.
                </p>
            </section>

            <section id="liability">
                <h2>Limitation of liability</h2>
                <p>
                    To the fullest extent the law allows, gokards and the people who build it are not liable for any
                    indirect, incidental, special, consequential, or punitive damages. We are also not liable for any
                    loss of data, content, or opportunity that results from your use of gokards, from content posted by
                    others, or from AI-generated output. Some jurisdictions don&apos;t allow these limits, so parts of this
                    section may not apply to you.
                </p>
            </section>

            <section id="changes">
                <h2>Changes to these terms</h2>
                <p>
                    We may update these terms from time to time. When we do, we&apos;ll change the date at the top of this
                    page. If you keep using gokards after an update, you accept the new terms.
                </p>
            </section>

            <section id="contact">
                <h2>Contact</h2>
                <p>
                    Questions about these terms? Use our <Link href="/contact">contact page</Link> or email{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. To report content that breaks these terms,
                    choose <Link href="/contact?topic=abuse">Report abuse</Link>.
                </p>
            </section>
        </LegalPage>
    );
}
