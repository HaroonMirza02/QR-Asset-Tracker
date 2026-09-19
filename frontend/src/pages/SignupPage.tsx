import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { Brand } from './Brand';
import './LandingPage.css';
export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await signup({ name: String(form.get('name')), organization: String(form.get('organization')), email: String(form.get('email')), password: String(form.get('password')) });
      navigate('/assets', { replace: true });
    } catch (e) { setError(getErrorMessage(e)); } finally { setBusy(false); }
  }
  return <main className="lp-auth"><aside className="lp-auth-aside"><Brand /><div><span className="lp-eyebrow">A PLACE FOR EVERYTHING.</span><h1>A more organized<br /><span className="lp-serif">workday awaits.</span></h1><p>Bring your assets together. Know where they are, who has them, and what happens next.</p><img src="/images/eztrack-devices-hd.webp" srcSet="/images/eztrack-devices-mobile.webp 960w, /images/eztrack-devices-hd.webp 1536w" sizes="(max-width: 760px) 100vw, 750px" width="1536" height="1024" alt="Asset tracking across desktop and mobile" /></div><small>Every asset has a place. Find yours.</small></aside><div className="lp-auth-main"><form className="lp-auth-form" onSubmit={submit}><div className="lp-auth-mobile-brand"><Brand /></div><h2>Create your workspace.</h2><p>A fresh start for your team’s assets.</p>{error && <div className="lp-auth-error" role="alert">{error}</div>}<label htmlFor="signup-name">Your name<input id="signup-name" name="name" autoComplete="name" placeholder="Alex Morgan" minLength={2} maxLength={100} required /></label><label htmlFor="signup-org">Organization name<input id="signup-org" name="organization" autoComplete="organization" placeholder="Your company or team" minLength={2} maxLength={150} required /></label><label htmlFor="signup-email">Work email<input id="signup-email" name="email" type="email" autoComplete="email" placeholder="alex@company.com" maxLength={254} required /></label><label htmlFor="signup-password">Password<input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="At least 10 characters" minLength={10} maxLength={72} required /></label><button className="lp-button" disabled={busy}>{busy ? 'Creating your workspace…' : 'Create workspace'}<ArrowRight size={17} /></button><span className="lp-auth-note"><ShieldCheck size={13} />Your organization gets its own separate workspace.</span><p className="lp-auth-switch">Already have an account? <Link to="/login">Log in</Link></p></form></div></main>;
}




