import ChallengesClient from './ChallengesClient';

export const metadata = {
    title: 'Challenges · gokards',
    description: 'Browse every published challenge and test what you know.',
};

export default function ChallengesPage() {
    return <ChallengesClient />;
}
