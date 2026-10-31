import AuthPanel from '../components/AuthPanel';

function Login({ onAuthSuccess }) {
  return <AuthPanel onAuthSuccess={onAuthSuccess} />;
}

export default Login;
