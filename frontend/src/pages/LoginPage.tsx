import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Brand } from './Brand';
import './LandingPage.css';
export function LoginPage() {
  const { login, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); clearAuthError(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await login({ email: String(form.get('email')).trim(), password: String(form.get('password')) });
      navigate('/assets', { replace: true });
    } catch { /* AuthContext exposes the server error. */ } finally { setBusy(false); }
  }
  return <main className="lp-auth"><aside className="lp-auth-aside"><Brand /><div><span className="lp-eyebrow">EVERYTHING, RIGHT WHERE YOU LEFT IT.</span><h1>Welcome back to<br /><span className="lp-serif">a little more order.</span></h1><p>Your assets, your people, your places. Pick up where you left off in one connected workspace.</p><img src="/images/eztrack-devices-hd.webp" srcSet="/images/eztrack-devices-mobile.webp 960w, /images/eztrack-devices-hd.webp 1536w" sizes="(max-width: 760px) 100vw, 750px" width="1536" height="1024" alt="Asset tracking on a laptop and phone" /></div><small>Every asset has a place. Find yours.</small></aside><div className="lp-auth-main"><form className="lp-auth-form" onSubmit={submit}><div className="lp-auth-mobile-brand"><Brand /></div><h2>Good to see you again.</h2><p>Log in to your asset workspace.</p>{authError && <div className="lp-auth-error" role="alert">{authError}</div>}<label htmlFor="login-email">Email address<input id="login-email" name="email" type="email" autoComplete="username" placeholder="you@company.com" required /></label><label htmlFor="login-password">Password<input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required /></label><button className="lp-button" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}<ArrowRight size={17} /></button><span className="lp-auth-note"><ShieldCheck size={13} />Secure access to your organization’s assets.</span><p className="lp-auth-switch">New here? <Link to="/signup">Create a workspace</Link></p><details className="lp-demo-credentials"><summary>Just exploring? Use a demo account.</summary><p><strong>Admin</strong><br />admin@meridian-ops.example<br /><code>Admin1234!</code></p><p><strong>Viewer</strong><br />viewer@meridian-ops.example<br /><code>Viewer1234!</code></p></details></form></div></main>;
}



