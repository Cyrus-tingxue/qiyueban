import { Outlet } from 'react-router-dom';
import Header from './Header';
import NavBar from './NavBar';
import AnnouncementModal from './AnnouncementModal';
import './Layout.css';

function Layout() {
    return (
        <>
            <AnnouncementModal />
            <div className="layout">
                {/* 背景心脏图片 - 素材文件放入 public/assets/images/backgrounds/heart.png */}
                <img
                    src="/assets/images/backgrounds/heart.png"
                    alt=""
                    className="layout-bg-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="layout-content">
                    <Header />
                    <NavBar />
                    <main className="main-content">
                        <Outlet />
                    </main>
                </div>
            </div>
        </>
    );
}

export default Layout;
