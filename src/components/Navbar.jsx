import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInitialTheme, toggleTheme, setTheme } from '../lib/theme';
import { MoonIcon, SunIcon } from './Icons';

export default function Navbar() {
    const [theme, setCurrentTheme] = useState(getInitialTheme());

    useEffect(() => {
        setTheme(theme);
    }, [theme]);

    const handleToggle = () => {
        const newTheme = toggleTheme();
        setCurrentTheme(newTheme);
    };

    return (
        <nav className="navbar">
            <div className="container navbar-inner">
                <Link to="/" className="navbar-brand">
                    cards at <span className="brand-accent">the back</span>
                </Link>
                <div className="navbar-links">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={handleToggle}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        style={{ padding: '8px', borderRadius: '50%', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px', minHeight: '44px' }}
                    >
                        {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
                    </button>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 6px' }}></div>
                    <Link to="/create" className="btn btn-ghost btn-sm">
                        Create
                    </Link>
                    <Link to="/ai-parse" className="btn btn-primary btn-sm">
                        AI Parse
                    </Link>
                </div>
            </div>
        </nav>
    );
}
