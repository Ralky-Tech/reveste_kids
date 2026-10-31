import { useState } from 'react';
import { Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import './AuthPanel.css';

function AuthPanel({ onAuthSuccess }) {
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setMessage('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    resetMessages();
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      localStorage.setItem('token', data.token);

      const payload = JSON.parse(atob(data.token.split('.')[1]));

      localStorage.setItem('role', payload.role);

      localStorage.setItem(
        'user',
        JSON.stringify({
          _id: payload.id,
          email: payload.email,
          role: payload.role,
        })
      );

      setMessage('Login realizado com sucesso.');

      setTimeout(() => {
        onAuthSuccess();
      }, 700);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-panel">
      <div className="auth-main">
        <div className="auth-left">
          <img
            src="/logo_sem_fundo.png"
            alt="ReVeste Kids"
            className="auth-logo"
          />

          <div className="auth-left-content">
            <div className="auth-preview-image">
              <img src="/card-login.png" alt="Preview ReVeste Kids" />
            </div>

            <h1 className="auth-title-big">
              <span className="line">Novas</span>

              <span className="line">fases da</span>

              <span className="line highlight">infância</span>

              <span className="line">
                <span className="highlight">circulando</span>

                <span className="dot">.</span>
              </span>
            </h1>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <h2 className="auth-title">Entrar no ReVeste Kids</h2>

            <form className="auth-form" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? 'Processando...' : 'Entrar'}
              </button>
            </form>

            <button type="button" className="forgot-password">
              Esqueceu a senha?
            </button>

            {message && <p className="auth-message success">{message}</p>}

            {error && <p className="auth-message error">{error}</p>}

            <button type="button" className="google-btn">
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
              />
              Entrar com o Google
            </button>

            <div className="auth-toggle">
              <Link to="/register" className="toggle-btn">
                Criar nova conta
              </Link>
            </div>

            <div className="auth-brand">
              <img src="/ralky-white.png" alt="Ralky" className="brand-logo" />

              <span>Ralky</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="auth-footer">
        <div className="auth-footer-links">
          <button>Ralky</button>

          <button>Sobre</button>

          <button>Ajuda</button>

          <button>API</button>

          <button>Comunidade</button>

          <button>Diretrizes</button>

          <button>Segurança</button>

          <button>Privacidade</button>

          <button>Termos</button>

          <button>Contato</button>
        </div>

        <div className="auth-footer-bottom">
          <span>Português (Brasil)</span>

          <span>© 2026 ReVeste by Ralky</span>
        </div>
      </footer>
    </section>
  );
}

export default AuthPanel;
