
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AnnouncementModal.css';

const AnnouncementModal = () => {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="announcement-modal-overlay">
            <div className="announcement-modal">
                <button className="announcement-close" onClick={handleClose}>&times;</button>
                <h2>网站公告</h2>
                <div className="announcement-content">
                    <p>欢迎来到柒月半论坛！</p>
                    <p>能不能帮cyrus的dy号点点关注，不行就算了（卑微）</p>
                    <p>dy号：cyrusOliver</p>
                    <div className="announcement-image-container">
                        <img src="/assets/images/ui/dy.png" alt="抖音号cyrusOliver" className="announcement-image" />
                    </div>
                </div>
                <button className="announcement-btn" onClick={handleClose}>我才不关注</button>
            </div>
        </div>
    );
};

export default AnnouncementModal;
