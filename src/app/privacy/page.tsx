import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { CONTACT_URL } from '@/lib/legal';

export const metadata = {
    title: 'Privacy Policy · gokards',
    description: 'What gokards collects, how it is used, and who it is shared with.',
};

const SECTIONS = [
    { id: 'summary', title: 'The short version' },
    { id: 'collect', title: 'What we collect' },
    { id: 'use', title: 'How we use it' },
    { id: 'public', title: 'Everything you publish is public' },
    { id: 'third-parties', title: 'Services we rely on' },
    { id: 'local', title: 'Data stored in your browser' },
    { id: 'retention', title: 'How long we keep data' },
    { id: 'rights', title: 'Your choices and rights' },
    { id: 'children', title: 'Children' },
    { id: 'security', title: 'Security' },
    { id: 'changes', title: 'Changes to this policy' },
    { id: 'contact', title: 'Contact' },
];

export default function PrivacyPage() {
    return (
        <LegalPage
            eyebrow="Legal"
            title="Privacy Policy"
            lede="gokards is a study tool for making flashkards and quizzes. This policy explains what information the app handles, why, and where it goes."
            sections={SECTIONS}
            related={{ href: '/terms', label: 'Terms of Service' }}
        >
            <section id="summary">
                <h2>The short version</h2>
                <ul>
                    <li>gokards has no accounts. We don&apos;t ask for your email, password, or real name.</li>
                    <li>Decks, quizzes, the names you type, and leaderboard entries are stored in our database and are <strong>visible to anyone</strong> with the link or on the home page.</li>
                    <li>When you use AI Parse or generate an AI quiz, the text of your file or kards is sent to Google&apos;s Gemini API to produce the result.</li>
                    <li>We use Vercel Analytics to count page views. We don&apos;t use advertising trackers and we don&apos;t sell data.</li>
                </ul>
            </section>

            <section id="collect">
                <h2>What we collect</h2>
                <h3>Content you create</h3>
                <ul>
                    <li><strong>Decks and kards</strong>: the title, description, subject, creator name, and the front and back of every kard.</li>
                    <li><strong>Quizzes</strong>: the generated questions, the question types you chose, answers, score, subject, and creator name.</li>
                    <li><strong>Quiz attempts</strong>: when you take a shared quiz, the player name you enter, your answers, your score, and how long you took.</li>
                    <li><strong>Study progress</strong>: spaced-repetition data for each kard, such as ease, interval, due date, and when you last reviewed it.</li>
                </ul>
                <p>
                    Names are whatever you type. You don&apos;t have to use your real name, and we recommend a nickname
                    if you&apos;d rather not be identifiable.
                </p>

                <h3>Files you upload</h3>
                <p>
                    When you use AI Parse, text is extracted from your <code>.md</code>, <code>.pdf</code>,{' '}
                    <code>.docx</code>, or <code>.pptx</code> file inside your browser. Images are read with on-device
                    OCR. <strong>The original file is never uploaded to or stored on our servers.</strong> Only the
                    extracted text is sent on, as described below.
                </p>

                <h3>Usage and technical data</h3>
                <p>
                    Vercel Analytics records anonymous page-view information such as the page visited, referrer,
                    approximate country, browser, operating system, and device type. It does not use cookies. Our
                    hosting provider also keeps standard server logs, which include IP addresses, for security and
                    debugging.
                </p>
            </section>

            <section id="use">
                <h2>How we use it</h2>
                <ul>
                    <li>To save and show your decks, quizzes, and leaderboards.</li>
                    <li>To generate kards and quiz questions with AI when you ask for them.</li>
                    <li>To schedule reviews based on your spaced-repetition progress.</li>
                    <li>To grade shared quiz attempts on the server and rank the leaderboard.</li>
                    <li>To understand which features get used, and to find and fix problems or abuse.</li>
                </ul>
                <p>We don&apos;t use your content to build advertising profiles, and we don&apos;t sell or rent it to anyone.</p>
            </section>

            <section id="public">
                <h2>Everything you publish is public</h2>
                <p>
                    gokards has no sign-in and no private decks. Anything you save, including decks, kards, quizzes,
                    creator names, and leaderboard entries, can be viewed by anyone who visits the site or has a share
                    link. Decks appear in the public list on the home page.
                </p>
                <p>
                    <strong>Don&apos;t put personal, confidential, or sensitive information in your kards or uploads.</strong>{' '}
                    That includes things like passwords, health or financial details, other people&apos;s personal
                    information, or material from work or school that you aren&apos;t allowed to share.
                </p>
            </section>

            <section id="third-parties">
                <h2>Services we rely on</h2>
                <p>gokards uses a few providers to run. Each handles data under its own privacy policy.</p>
                <dl className="legal-list">
                    <dt>Supabase</dt>
                    <dd>Hosts the database where decks, kards, quizzes, attempts, and study progress are stored.</dd>
                    <dt>Google Gemini API</dt>
                    <dd>
                        Receives the extracted text of files you parse, and the kards of a deck when you generate an AI
                        quiz. Google processes this text to return a response and may keep it for a limited time under
                        its own terms.
                    </dd>
                    <dt>Vercel</dt>
                    <dd>Hosts the website, runs the server routes, and provides the anonymous page-view analytics.</dd>
                    <dt>jsDelivr CDN</dt>
                    <dd>Serves the OCR engine and language data that your browser downloads when you parse an image, so jsDelivr can see your IP address. Your image stays on your device.</dd>
                </dl>
                <p>
                    These providers may process data in countries other than your own. We may also disclose information
                    if the law requires it, or to protect gokards and its users from fraud or abuse.
                </p>
            </section>

            <section id="local">
                <h2>Data stored in your browser</h2>
                <p>gokards uses your browser&apos;s local storage, not cookies, to remember:</p>
                <ul>
                    <li>that you agreed to these policies, and which version you agreed to,</li>
                    <li>your light or dark theme choice, and</li>
                    <li>a copy of your study progress for each deck, used when the database can&apos;t be reached.</li>
                </ul>
                <p>You can remove this at any time by clearing site data in your browser settings.</p>
            </section>

            <section id="retention">
                <h2>How long we keep data</h2>
                <p>
                    Decks, quizzes, attempts, and progress are kept until they are deleted. Because there are no
                    accounts, you can&apos;t delete content yourself from inside the app. Contact us and we&apos;ll remove
                    it. Analytics and server logs are kept for the periods set by Vercel.
                </p>
            </section>

            <section id="rights">
                <h2>Your choices and rights</h2>
                <p>
                    Depending on where you live, you may have the right to access, correct, or delete information about
                    you, or to object to how it&apos;s used. Since gokards doesn&apos;t link content to accounts, please send us
                    the link to the deck or quiz, and the name that was used, so we can find it.
                </p>
                <p>You can also simply choose not to use AI features, and use a nickname instead of your name.</p>
            </section>

            <section id="children">
                <h2>Children</h2>
                <p>
                    gokards isn&apos;t directed at children under 13, and we don&apos;t knowingly collect personal information
                    from them. If you believe a child has shared personal information on gokards, contact us and
                    we&apos;ll remove it.
                </p>
            </section>

            <section id="security">
                <h2>Security</h2>
                <p>
                    Data travels over HTTPS and our API keys are kept on the server. No online service is perfectly
                    secure, though, and content on gokards is public by design, so treat anything you save as something
                    others can read.
                </p>
            </section>

            <section id="changes">
                <h2>Changes to this policy</h2>
                <p>
                    We may update this policy as gokards changes. When we do, we&apos;ll update the date at the top of this
                    page. Continuing to use gokards after a change means you accept the updated policy.
                </p>
            </section>

            <section id="contact">
                <h2>Contact</h2>
                <p>
                    For questions or removal requests, open an issue on the{' '}
                    <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer">gokards GitHub repository</a>.
                    Please don&apos;t post private information in a public issue. Mention that you need to share details
                    privately and we&apos;ll follow up. You can also read our <Link href="/terms">Terms of Service</Link>.
                </p>
            </section>
        </LegalPage>
    );
}
