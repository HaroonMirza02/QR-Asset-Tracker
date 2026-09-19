import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Box, Check, ChevronDown, CirclePlay, Clock3, Laptop, MapPin, Menu, Package, QrCode, Search, ShieldCheck, Smartphone, Users, X } from 'lucide-react';
import { Brand } from './Brand';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';
import { useScrollReveal } from './useScrollReveal';

type DemoAsset = { assetCode: string; name: string; category: string; status: string; description: string | null; assignedTo: { type: string; displayName?: string; name?: string; title?: string } | null; qrCodeUrl: string };
const features = [
  { icon: QrCode, title: 'One scan. The essentials.', text: 'Give every asset a unique QR code. Open its public profile from any phone.', tag: 'QR labels & mobile access' },
  { icon: Users, title: 'A place for everything.', text: 'Assign equipment to the people and places that use it. Know who has what.', tag: 'Employee & location assignment' },
  { icon: Clock3, title: 'A clear history of changes.', text: 'Follow assignments, status changes, and updates in one clear asset history.', tag: 'Status & audit history' },
];
function ProductDemo() {
  const [assets, setAssets] = useState<DemoAsset[]>([]);
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    apiClient.get('/api/public/demo', { signal: controller.signal }).then(r => { setAssets(r.data.data); setActive(r.data.data[0]?.assetCode || ''); }).catch(e => { if (e.code !== 'ERR_CANCELED') setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  const selected = assets.find(a => a.assetCode === active);
  useEffect(() => {
    let valid = true; setQr('');
    if (selected) import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(selected.qrCodeUrl, { width: 180, margin: 1, color: { dark: '#19152d', light: '#ffffff' } })).then(v => { if (valid) setQr(v); }).catch(() => {});
    return () => { valid = false; };
  }, [selected]);
  const filtered = assets.filter(a => `${a.name} ${a.assetCode}`.toLowerCase().includes(search.toLowerCase()));
  const scanPath = selected ? (() => { const url = new URL(selected.qrCodeUrl); return url.pathname + url.search; })() : '';
  return <div className="lp-demo-window">
    <div className="lp-window-bar"><div className="lp-window-dots"><i /><i /><i /></div><span><ShieldCheck size={12} /> Meridian demo workspace</span><span className="lp-live"><i /> Demo data</span></div>
    <div className="lp-demo-body"><aside className="lp-demo-nav"><span className="lp-brand-icon"><img src="/images/eztrack-logo-ui.png" alt="EZTrack" width="40" height="40" /></span><span className="lp-demo-nav-active"><Box size={19} /></span><Users size={19} /><MapPin size={19} /></aside>
      <div className="lp-demo-directory"><div className="lp-demo-title"><div><span className="lp-overline">YOUR WORKSPACE, ORGANIZED</span><h3>Asset directory</h3></div><span className="lp-count">{assets.length} demo assets</span></div>
        <label className="lp-demo-search"><Search size={16} /><input aria-label="Search demo assets" placeholder="Search by name or asset code…" value={search} onChange={e => setSearch(e.target.value)} /><span>⌕</span></label>
        <div className="lp-demo-table"><div className="lp-demo-table-head"><span>ASSET</span><span>STATUS</span></div>
          {loading ? <p className="lp-demo-message" role="status">Loading demo assets…</p> : error ? <div className="lp-demo-message" role="alert">The demo is temporarily unavailable.<button onClick={() => setAttempt(a => a + 1)}>Try again <ArrowRight size={14} /></button></div> : !filtered.length ? <p className="lp-demo-message">No assets found. Try another search.</p> : filtered.map(a => <button key={a.assetCode} className={`lp-demo-row ${a.assetCode === active ? 'is-active' : ''}`} onClick={() => setActive(a.assetCode)} aria-pressed={a.assetCode === active}><span className="lp-demo-asset-icon">{a.category === 'Laptop' ? <Laptop size={20} /> : <Package size={20} />}</span><span className="lp-demo-asset-name"><strong>{a.name}</strong><small>{a.assetCode} · {a.category}</small></span><span className={`lp-status ${a.status === 'Available' ? 'available' : a.status === 'Assigned' ? 'assigned' : 'repair'}`}><i />{a.status}</span></button>)}
        </div><p className="lp-demo-caption">Read-only demo · Select an asset to explore its public profile.</p>
      </div>
      <div className="lp-demo-detail" key={active}>{selected ? <><div className="lp-detail-top"><span>ASSET AT A GLANCE</span><ArrowUpRight size={17} /></div><div className="lp-device-icon"><Laptop size={58} strokeWidth={1.2} /></div><span className="lp-overline">{selected.assetCode}</span><h4>{selected.name}</h4><span className={`lp-status ${selected.status === 'Available' ? 'available' : selected.status === 'Assigned' ? 'assigned' : 'repair'}`}><i />{selected.status}</span><dl><div><dt>Category</dt><dd>{selected.category}</dd></div><div><dt>Assigned to</dt><dd>{selected.assignedTo?.displayName || selected.assignedTo?.name || 'Unassigned'}</dd></div></dl><div className="lp-qr-preview">{qr && <img src={qr} width="82" height="82" alt={`Scannable QR code for ${selected.name}`} />}<div><strong>Try a real scan</strong><p>Point your phone camera<br />at this asset’s QR code.</p></div></div><Link className="lp-demo-open" to={scanPath}>Open public asset page <ArrowUpRight size={16} /></Link></> : <div className="lp-empty-detail"><QrCode size={40} /><p>Your selected asset<br />will appear here.</p></div>}</div>
    </div>
  </div>;
}
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [menu, setMenu] = useState(false);
  const revealRoot = useScrollReveal();
  return <div className="landing-page" ref={revealRoot}>
    <header className="lp-header"><div className="lp-container lp-nav"><Brand /><nav className={menu ? 'lp-links is-open' : 'lp-links'} aria-label="Main navigation"><a href="#features" onClick={() => setMenu(false)}>Features</a><a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a><a href="#demo" onClick={() => setMenu(false)}>Product demo</a><a href="#questions" onClick={() => setMenu(false)}>FAQs</a></nav><div className="lp-nav-actions"><Link className="lp-login" to={isAuthenticated ? '/assets' : '/login'}>{isAuthenticated ? 'Dashboard' : 'Log in'}</Link><Link className="lp-button lp-button-small" to={isAuthenticated ? '/assets' : '/signup'}>{isAuthenticated ? 'Open workspace' : 'Get started'}<ArrowRight size={15} /></Link><button className="lp-menu" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></div></div></header>
    <main>
      <section className="lp-hero"><div className="lp-container lp-hero-grid"><div className="lp-hero-copy"><span className="lp-eyebrow"><span /> A LITTLE LABEL. A LOT OF CLARITY.</span><h1>Your assets.<br />All accounted <span className="lp-serif">for.</span></h1><p>From the laptop on a desk to the tools in the field. Track, assign, and manage everything your team relies on—with one simple scan.</p><div className="lp-hero-actions"><Link to={isAuthenticated ? '/assets' : '/signup'} className="lp-button">{isAuthenticated ? 'Go to your workspace' : 'Start your workspace'}<ArrowRight size={17} /></Link><a href="#demo" className="lp-button lp-button-secondary"><CirclePlay size={19} />See it in action</a></div><div className="lp-hero-checks"><span><Check size={14} />No credit card</span><span><Check size={14} />Separate workspace</span><span><Check size={14} />Mobile ready</span></div></div><div className="lp-hero-art"><div className="lp-art-orbit" /><img src="/images/eztrack-devices-hd.webp" srcSet="/images/eztrack-devices-mobile.webp 960w, /images/eztrack-devices-hd.webp 1536w" sizes="(max-width: 760px) 100vw, 750px" width="1536" height="1024" fetchPriority="high" alt="EZTrack product illustration on a laptop and phone" /><div className="lp-floating-note"><span><Check size={17} /></span><div><strong>Everything in its place.</strong><small>From your desk to their pocket.</small></div></div><span className="lp-art-caption">DESKTOP CONTROL. POCKET-SIZED ACCESS.</span></div></div></section>
      <section className="lp-usecases"><div className="lp-container"><span>BUILT FOR THE WAY<br /><strong>YOUR TEAM WORKS</strong></span><div><Laptop />IT & equipment</div><div><Package />Operations</div><div><MapPin />Facilities</div><div><Users />Growing teams</div><span className="lp-usecase-end"><QrCode />One connected inventory</span></div></section>
      <section className="lp-section lp-features lp-container" id="features"><div className="lp-section-heading"><div><span className="lp-overline">LESS GUESSWORK. MORE CLARITY.</span><h2>Everything you need.<br /><span className="lp-muted">Nothing in your way.</span></h2></div><p>Move beyond scattered spreadsheets.<br />Bring your assets, people, and places<br />together in one thoughtful workspace.</p></div><div className="lp-feature-grid">{features.map((f, i) => <article key={f.title} className="lp-feature-card"><div className="lp-feature-top"><span className="lp-feature-icon"><f.icon size={25} strokeWidth={1.6} /></span><span>0{i + 1}</span></div><h3>{f.title}</h3><p>{f.text}</p><span className="lp-feature-tag">{f.tag}<ArrowUpRight size={14} /></span></article>)}</div></section>
      <section className="lp-demo-section" id="demo"><div className="lp-container"><div className="lp-centered-heading"><span className="lp-eyebrow"><span /> THE PRODUCT, NOT JUST THE PROMISE</span><h2>A little order.<br className="lp-mobile-break" /> A big difference.</h2><p>Explore real demo assets. Search the directory, select a device,<br className="lp-desktop-break" /> and open the same public profile you’d see from a QR scan.</p></div><ProductDemo /><div className="lp-demo-foot"><span><ShieldCheck size={16} />Public demo records only. Your workspace stays separate.</span><Link to="/signup">Make it yours <ArrowRight size={16} /></Link></div></div></section>
      <section className="lp-section lp-container lp-how" id="how-it-works"><div><span className="lp-overline">FROM SETUP TO SCAN</span><h2>Goodbye, “where is it?”<br />Hello, <span className="lp-serif">there it is.</span></h2><p>Three simple steps to a more<br />organized workday.</p><Link to="/signup" className="lp-text-link">Create your workspace <ArrowRight size={17} /></Link></div><ol>{[{ title: 'Add what matters.', text: 'Create an asset with its name, category, and details. A unique QR code is generated for you.' }, { title: 'Give it a home.', text: 'Print the label and assign the asset to an employee or location. No more passing spreadsheets around.' }, { title: 'Keep the story current.', text: 'Scan to view. Sign in to update. See status and assignment changes in the asset’s history.' }].map((s, i) => <li key={s.title}><span>0{i + 1}</span><div><h3>{s.title}</h3><p>{s.text}</p></div></li>)}</ol></section>
      <section className="lp-faq-section" id="questions"><div className="lp-container lp-faq-grid"><div><span className="lp-overline">A FEW GOOD QUESTIONS</span><h2>Simple by design.<br />Clear by default.</h2></div><div>{[{ q: 'Do I need an app to scan an asset?', a: 'No. Use your phone’s camera to open the QR link in a browser. The link must point to a website your phone can reach. Only assets marked public are visible without signing in.' }, { q: 'What happens when I sign up?', a: 'You get a new organization workspace and an Admin account. You can start adding your own assets immediately. The demo records stay in a separate demo organization.' }, { q: 'Can everyone edit our assets?', a: 'No. Admins can create, assign, and update assets. Viewers have read-only access. Public QR profiles show a limited set of information without internal identifiers or employee contact details.' }, { q: 'What can I track?', a: 'Laptops, vehicles, tools, furniture, and equipment. Assign assets to employees or locations, and track whether they are available, assigned, in repair, lost, or retired.' }].map(f => <details key={f.q}><summary>{f.q}<ChevronDown size={17} /></summary><p>{f.a}</p></details>)}</div></div></section>
      <section className="lp-container lp-final-wrap"><div className="lp-final-cta"><div className="lp-cta-pattern"><QrCode size={250} strokeWidth={.6} /></div><span className="lp-eyebrow">LESS SEARCHING. MORE DOING.</span><h2>A clearer picture of<br />everything you own.</h2><p>Your next organized workday starts here.</p><Link to={isAuthenticated ? '/assets' : '/signup'} className="lp-button lp-button-white">{isAuthenticated ? 'Open your workspace' : 'Get started'}<ArrowRight size={17} /></Link></div></section>
    </main><footer className="lp-container lp-footer"><Brand /><span>Every asset has a place.</span><div><a href="#demo">Explore the demo</a><Link to="/login">Log in <ArrowUpRight size={13} /></Link></div><small>© {new Date().getFullYear()} EZTrack</small></footer>
  </div>;
}








