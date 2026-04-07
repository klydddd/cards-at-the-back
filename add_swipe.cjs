const fs = require('fs');

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function doReplace(text, target, replacement) {
    const regex = new RegExp(escapeRegExp(target).replace(/\\n/g, '\\r?\\n'));
    if (!regex.test(text)) {
        console.warn('Could not find target:\n' + target);
    }
    return text.replace(regex, replacement);
}

try {
    // ---- PRACTICE ----
    let pPath = 'src/app/deck/[id]/practice/page.tsx';
    let p = fs.readFileSync(pPath, 'utf8');

    p = doReplace(p,
        "const [swipeOffset, setSwipeOffset] = useState(0);\n    const [swipeAction, setSwipeAction] = useState(null);\n    const [finished, setFinished] = useState(false);",
        "const [swipeOffset, setSwipeOffset] = useState(0);\n    const [swipeAction, setSwipeAction] = useState(null);\n    const [finished, setFinished] = useState(false);\n    const [isAnimating, setIsAnimating] = useState(false);"
    );

    p = doReplace(p,
        "const goTo = useCallback(\n        (index) => {\n            setCurrent(index);\n            setFlipKey((k) => k + 1);\n        },",
        "const goTo = useCallback(\n        (index) => {\n            setSwipeOffset(0);\n            setSwipeAction(null);\n            setIsAnimating(false);\n            setCurrent(index);\n            setFlipKey((k) => k + 1);\n        },"
    );

    p = doReplace(p,
        "const handleMarkLearned = useCallback(() => {\n        if (cards.length === 0 || showCheckIn) return;\n        const newLearned = markCardAsLearned(id, cards[current].id);\n        setLearnedIds(new Set(newLearned));",
        "const handleMarkLearned = useCallback(() => {\n        if (cards.length === 0 || showCheckIn) return;\n        setIsAnimating(true);\n        setSwipeAction('learned');\n        setSwipeOffset(1000);\n        const newLearned = markCardAsLearned(id, cards[current].id);\n        setLearnedIds(new Set(newLearned));"
    );

    p = doReplace(p,
        "const handleMarkLearning = useCallback(() => {\n        if (cards.length === 0 || showCheckIn) return;\n        const newLearned = markCardAsLearning(id, cards[current].id);\n        setLearnedIds(new Set(newLearned));",
        "const handleMarkLearning = useCallback(() => {\n        if (cards.length === 0 || showCheckIn) return;\n        setIsAnimating(true);\n        setSwipeAction('learning');\n        setSwipeOffset(-1000);\n        const newLearned = markCardAsLearning(id, cards[current].id);\n        setLearnedIds(new Set(newLearned));"
    );

    p = doReplace(p,
        "transform: \`translateX(${swipeOffset * 0.4}px)\`,\n                        transition: swipeOffset === 0 ? 'transform 0.3s ease' : 'none',\n                        opacity: swipeOffset === 0 ? 1 : Math.max(0.7, 1 - Math.abs(swipeOffset) / 600),",
        "transform: \`translateX(${swipeOffset * 0.4}px) rotate(${swipeOffset * 0.02}deg)\`,\n                        transition: swipeOffset === 0 || isAnimating ? 'transform 0.3s ease, opacity 0.3s ease' : 'none',\n                        opacity: swipeOffset === 0 ? 1 : Math.max(0.7, 1 - Math.abs(swipeOffset) / 600),"
    );

    fs.writeFileSync(pPath, p);
    console.log('updated practice');

    // ---- REVIEW ----
    let rPath = 'src/app/deck/[id]/review/page.tsx';
    let r = fs.readFileSync(rPath, 'utf8');

    r = doReplace(r,
        "const [flipKey, setFlipKey] = useState(0);\n    const [finished, setFinished] = useState(false);\n    const [sessionStats, setSessionStats] = useState({ again: 0, good: 0 });",
        "const [flipKey, setFlipKey] = useState(0);\n    const [finished, setFinished] = useState(false);\n    const [sessionStats, setSessionStats] = useState({ again: 0, good: 0 });\n    const [swipeOffset, setSwipeOffset] = useState(0);\n    const [swipeAction, setSwipeAction] = useState(null);\n    const [isAnimating, setIsAnimating] = useState(false);"
    );

    r = doReplace(r,
        "const handleRate = useCallback(async (rating) => {\n        if (dueCards.length === 0 || finished) return;\n\n        const card = dueCards[current];\n        const statKey = rating === Rating.AGAIN ? 'again' : 'good';",
        "const handleRate = useCallback(async (rating) => {\n        if (dueCards.length === 0 || finished) return;\n        setIsAnimating(true);\n        if (rating === Rating.AGAIN) {\n            setSwipeAction('learning');\n            setSwipeOffset(-1000);\n        } else {\n            setSwipeAction('learned');\n            setSwipeOffset(1000);\n        }\n\n        const card = dueCards[current];\n        const statKey = rating === Rating.AGAIN ? 'again' : 'good';"
    );

    r = doReplace(r,
        "if (current < dueCards.length - 1 || rating === Rating.AGAIN) {\n            setTimeout(() => {\n                setCurrent(prev => prev + 1);\n                setFlipKey(k => k + 1);\n            }, 200);\n        } else {\n            setTimeout(() => setFinished(true), 200);\n        }",
        "if (current < dueCards.length - 1 || rating === Rating.AGAIN) {\n            setTimeout(() => {\n                setSwipeOffset(0);\n                setSwipeAction(null);\n                setIsAnimating(false);\n                setCurrent(prev => prev + 1);\n                setFlipKey(k => k + 1);\n            }, 300);\n        } else {\n            setTimeout(() => setFinished(true), 300);\n        }"
    );

    r = doReplace(r,
        "{/* Flip Card */}\n                <div className=\"mb-md\">\n                    <FlipCard key={flipKey} ref={flipCardRef} front={card.front} back={card.back} />\n                </div>",
        "{/* Flip Card with swipe animation */}\n                <div\n                    className=\"mb-md\"\n                    style={{\n                        position: 'relative',\n                        transform: \`translateX(${swipeOffset * 0.4}px) rotate(${swipeOffset * 0.02}deg)\`,\n                        transition: swipeOffset === 0 || isAnimating ? 'transform 0.3s ease, opacity 0.3s ease' : 'none',\n                        opacity: swipeOffset === 0 ? 1 : Math.max(0.7, 1 - Math.abs(swipeOffset) / 600),\n                    }}\n                >\n                    {swipeAction && (\n                        <div\n                            style={{\n                                position: 'absolute',\n                                top: '50%',\n                                left: '50%',\n                                transform: 'translate(-50%, -50%)',\n                                zIndex: 10,\n                                background: swipeAction === 'learned' ? 'var(--success)' : 'var(--warning)',\n                                color: '#fff',\n                                padding: '8px 20px',\n                                borderRadius: '100px',\n                                fontWeight: 700,\n                                fontSize: '0.85rem',\n                                pointerEvents: 'none',\n                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',\n                            }}\n                        >\n                            {swipeAction === 'learned' ? 'Know It →' : '← Still Learning'}\n                        </div>\n                    )}\n                    <FlipCard key={flipKey} ref={flipCardRef} front={card.front} back={card.back} />\n                </div>"
    );

    fs.writeFileSync(rPath, r);
    console.log('updated review');

} catch (e) {
    console.error(e);
}
