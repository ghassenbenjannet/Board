import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') await auth.login(email, password);
      else await auth.register(name, email, password);
      navigate('/boards');
    } catch {
      setError('Impossible de se connecter pour le moment.');
    }
  };

  return (
    <div className="auth-shell">
      <form className="card" onSubmit={onSubmit}>
        <h1>Board SaaS</h1>
        <p>Whiteboard collaboratif temps réel</p>
        {mode === 'register' && <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />}
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <span className="error">{error}</span>}
        <button type="submit">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</button>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}
        </button>
      </form>
    </div>
  );
}
