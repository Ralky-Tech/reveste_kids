import { useLocation, useNavigate } from 'react-router-dom';
import Footer from './Footer';

export default function Menu({ children, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hideSidebarPages = ['/', '/register', '/feed', '/feed-tiktok'];
  const showSidebar = !hideSidebarPages.includes(location.pathname);

  return (
    <>
      {showSidebar ? (
        <div className="closet-layout">
          <aside className="closet-sidebar compact-brand">
            <img
              src={
                theme === 'dark'
                  ? '/logo_sem_fundo.png'
                  : '/logo-dark-sem-fundo.png'
              }
              alt="logo"
              className="closet-logo"
              onClick={() => navigate('/feed')}
              style={{ cursor: 'pointer' }}
            />
            <div className="closet-actions-menu">
              <button
                type="button"
                className="closet-home-btn"
                onClick={() => navigate('/feed')}
              >
                <img
                  src={
                    theme === 'dark'
                      ? '/home_sem_fundo.png'
                      : '/home_sem_fundo_dark.png'
                  }
                  alt="Home"
                  className="closet-home-icon"
                />
                <span className="closet-home-label">Home</span>
              </button>
            </div>
          </aside>

          <main className="closet-container">{children}</main>
        </div>
      ) : (
        <main>{children}</main>
      )}
      {showSidebar && <Footer />}
    </>
  );
}
