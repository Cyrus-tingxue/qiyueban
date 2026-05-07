import { Component } from 'react';

// ErrorBoundary is a class component, so we read lang from localStorage directly
function getTranslation(key) {
    const lang = localStorage.getItem('lang') || 'zh';
    const translations = {
        zh: { pageError: '页面出错了', reload: '重新加载' },
        en: { pageError: 'Something went wrong', reload: 'Reload' },
    };
    return translations[lang]?.[key] || translations.zh[key] || key;
}

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '50vh',
                    color: '#e0d8d0',
                    fontFamily: 'var(--font-sans)',
                    padding: '2rem',
                }}>
                    <h2 style={{ color: '#c42b2b', marginBottom: '1rem' }}>{getTranslation('pageError')}</h2>
                    <p style={{ color: '#8a8078' }}>{this.state.error?.message}</p>
                    <button
                        onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                        style={{
                            marginTop: '1rem',
                            padding: '8px 24px',
                            background: '#c42b2b',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {getTranslation('reload')}
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
