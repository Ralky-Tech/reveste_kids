import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useOutletContext,
  Outlet,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Menu from './components/Menu';
import FeedTikTok from './pages/FeedTikTok';
import MyCloset from './pages/MyCloset';
import AddClothing from './pages/AddClothing';
import Matches from './pages/Matches';
import SearchClosets from './pages/SearchClosets';
import SearchPieces from './pages/SearchPieces';
import Login from './pages/Login';
import Register from './pages/Register';

function LoginPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token) navigate('/feed', { replace: true });
  }, [token, navigate]);

  if (token) return null;
  return <Login onAuthSuccess={() => navigate('/feed')} />;
}

function FeedPage() {
  const { theme, toggleTheme } = useOutletContext();
  return <FeedTikTok theme={theme} toggleTheme={toggleTheme} />;
}

function LayoutWithTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Menu theme={theme}>
      <Outlet context={{ theme, toggleTheme }} />
    </Menu>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <BrowserRouter>
      <Routes>
        <Route element={<LayoutWithTheme />}>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />

          <Route path="/feed" element={<FeedPage />} />
          <Route path="/feed-tiktok" element={<FeedPage />} />

          <Route path="/closet" element={<MyCloset />} />
          <Route path="/add-clothing" element={<AddClothing />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/search-closets" element={<SearchClosets />} />
          <Route path="/search-pieces" element={<SearchPieces />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
