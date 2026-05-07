import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                return JSON.parse(savedUser);
            } catch {
                localStorage.removeItem('user');
                return null;
            }
        }
        return null;
    });
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (!token) {
            return;
        }

        let active = true;

        const refreshProfile = async () => {
            try {
                const profile = await authService.getProfile();
                if (!active) return;
                setUser(profile);
                localStorage.setItem('user', JSON.stringify(profile));
            } catch {
                if (!active) return;
                setUser(null);
                setToken(null);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        };

        refreshProfile();

        return () => {
            active = false;
        };
    }, [token]);

    const login = (userData, tokenStr) => {
        setUser(userData);
        setToken(tokenStr);
        localStorage.setItem('token', tokenStr);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const isLoggedIn = !!token && !!user;

    return (
        <AuthContext.Provider value={{ user, token, isLoggedIn, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
