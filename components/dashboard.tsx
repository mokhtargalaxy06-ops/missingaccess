'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDownUp, ArrowRight, AudioLines, BookOpen, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Compass, ExternalLink, FileText, Globe2, HandHeart, Heart, Headphones, LayoutGrid, Leaf, ListChecks, LoaderCircle, LogOut, Menu, Mic, MoreHorizontal, Pause, Plus, Search, ShieldCheck, Sparkles, Square, Upload, Users, X } from 'lucide-react';
import type { Contribution, RequestItem, User } from '@/lib/types';

type View = 'board' | 'library' | 'contributions' | 'review';
async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not complete this action.');
  return data;
}
const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const statusLabel = (value: string) => ({ open: 'Open request', review: 'In review', completed: 'Ready to listen', pending: 'In review', approved: 'Published', rejected: 'Changes requested' }[value] || value);
const icons = [HandHeart, BookOpen, Leaf, Headphones, Users, Mic];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [contributions, setContributions] = useState<(Contribution & { title: string })[]>([]);
  const [view, setView] = useState<View>('board');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('All languages');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<'auth' | 'create' | 'about' | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api('/api/auth'), api('/api/requests')]);
      setUser(a.user); setRequests(b.requests); setError('');
      if (a.user) { const c = await api('/api/contributions'); setContributions(c.contributions); }
      else setContributions([]);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timeout); }, [toast]);
  function navigate(next: View) { setView(next); setMobileNav(false); setSearch(''); setStatus('all'); }
  function create() { setModal(user ? 'create' : 'auth'); }
  const open = requests.filter(r => r.status === 'open').length;
  const complete = requests.filter(r => r.status === 'completed').length;
  const pending = contributions.filter(c => c.status === 'pending' && c.user_id !== user?.id);
  const filtered = requests.filter(r => (view !== 'library' || r.status === 'completed') && (language === 'All languages' || language === r.language) && (status === 'all' || status === r.status) && `${r.title} ${r.description} ${r.category}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === 'needed' ? b.supporters-a.supporters : b.sample-a.sample === 0 ? b.created_at.localeCompare(a.created_at) : a.sample-b.sample);
  const mine = contributions.filter(c => c.user_id === user?.id);
  const list = view === 'review' ? pending : mine;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`} inert={!!modal || !!selected}>
      <button className="brand" onClick={() => navigate('board')} aria-label="Missing Access home"><span className="brand-mark"><AudioLines size={25}/></span><span>missing<span className="brand-light">access</span><small>A little help. A world of access.</small></span></button>
      <div className="workspace-label">THE COMMUNITY <span>✦</span></div>
      <nav aria-label="Main navigation">
        <button className={view === 'board' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('board')}><LayoutGrid size={19}/>Request board<span className="nav-count">{open}</span></button>
        <button className={view === 'contributions' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('contributions')}><HandHeart size={19}/>My contributions</button>
        <button className={view === 'library' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('library')}><BookOpen size={19}/>Accessible library{complete > 0 && <span className="nav-count">{complete}</span>}</button>
        {user?.role === 'reviewer' && <button className={view === 'review' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('review')}><ShieldCheck size={19}/>Review queue<span className="nav-count">{pending.length}</span></button>}
      </nav>
      <div className="sidebar-story"><div className="story-icon"><SproutArt/></div><h3>Good grows when<br/>we share it.</h3><p>Your voice, your time, your skills.<br/>Someone is waiting for them.</p><button onClick={() => setModal('about')}>Discover our purpose <ArrowRight size={15}/></button></div>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setModal('about')}><CircleHelp size={19}/>How it works</button><div className="sidebar-divider"/>{user ? <div className="profile"><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role === 'reviewer' ? 'Community reviewer' : 'Community volunteer'}</small></div><button className="icon-button" aria-label="Sign out" onClick={async () => { try { await api('/api/auth', json({ action: 'logout' })); await refresh(); setToast('You have signed out.'); } catch (e) { setToast((e as Error).message); } }}><LogOut size={17}/></button></div> : <button className="join-button" onClick={() => setModal('auth')}><span className="avatar"><Users size={18}/></span><span>Find your place here<small>Join the community</small></span><ArrowRight size={17}/></button>}</div>
    </aside>
    <div className="main-wrap" inert={!!modal || !!selected}>
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={22}/></button><span>Workspace</span><span className="slash">/</span><strong>{{ board: 'Request board', library: 'Accessible library', contributions: 'My contributions', review: 'Review queue' }[view]}</strong></div><div className="top-actions"><span className="community-dot"/>A community of care<button className="top-help icon-button" onClick={() => setModal('about')} aria-label="Help"><CircleHelp size={19}/></button>{!user && <button className="signin" onClick={() => setModal('auth')}>Sign in <ArrowRight size={14}/></button>}</div></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">SMALL ACTS. OPEN DOORS.</div><h1>{{ board: 'Make the Quran reachable.', library: 'Quran translations, open to everyone.', contributions: 'Your time makes a difference.', review: 'A little care before we share.' }[view]}</h1><p>{{ board: 'Read the Quran and help others hear its meaning in their own language.', library: 'Listen to Quran translations recorded by volunteers and checked against their sources.', contributions: 'Follow the recordings you have shared and the difference you are making.', review: 'Check every recording against its source, then help it reach someone.' }[view]}</p></div><button className="button dark" onClick={create}><Plus size={18}/>Create a request</button></div>
        {view === 'board' && <section className="hero"><div className="hero-copy"><span className="hero-label"><span/> GIVE WHAT ONLY YOU CAN</span><h2>Your voice could be<br/>someone’s way in.</h2><p>Help someone listen to the meaning of the Quran<br className="desktop-break"/> in a language they understand.</p><button className="button white" onClick={() => document.getElementById('requests')?.scrollIntoView({ behavior: 'smooth' })}>Find a way to help <ArrowRight size={17}/></button><span className="hero-footnote"><Heart size={13}/> A small act. A lasting benefit.</span></div><HeroArt/></section>}
        {(view === 'board' || view === 'library') && <>
          <section className="stats" aria-label="Community statistics"><Stat icon={<HandHeart/>} value={open} label="Requests waiting for a voice" color="green"/><Stat icon={<Headphones/>} value={complete} label="Quran translations recorded" color="peach"/><Stat icon={<Globe2/>} value={new Set(requests.map(r=>r.language)).size} label="Languages on the board" color="purple"/><div className="stat-note"><span className="mini-flower">✳</span><p>Everyone has<br/><strong>something to give.</strong></p></div></section>
          <section id="requests" className="board-section"><div className="section-title"><div><h2>{view === 'library' ? 'The Quran listening library' : 'A little help starts here'} <span>{filtered.length}</span></h2><p>{view === 'library' ? 'Every published recording has passed a human review.' : 'Arabic verses. Sourced translations. A voice you can give.'}</p></div><button className="text-button" onClick={() => setModal('about')}>How it works <ArrowRight size={15}/></button></div>
          <div className="filters"><label className="search-box"><Search size={18}/><input aria-label="Search requests" placeholder="Search for a way to help…" value={search} onChange={e=>setSearch(e.target.value)}/>{search && <button className="icon-button" aria-label="Clear search" onClick={()=>setSearch('')}><X size={15}/></button>}</label><label className="select-box"><Globe2 size={16}/><select aria-label="Filter by language" value={language} onChange={e=>setLanguage(e.target.value)}><option>All languages</option>{Array.from(new Set(requests.map(r=>r.language))).sort().map(l=><option key={l}>{l}</option>)}</select><ChevronDown size={14}/></label>{view === 'board' && <label className="select-box"><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="open">Open requests</option><option value="review">In review</option><option value="completed">Completed</option></select><ChevronDown size={14}/></label>}<label className="select-box sort"><ArrowDownUp size={15}/><select aria-label="Sort requests" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="needed">Most supported</option></select><ChevronDown size={14}/></label></div>
          {error && <div className="error-banner" role="alert">{error}<button onClick={()=>void refresh()}>Try again</button></div>}
          {loading ? <div className="empty"><LoaderCircle className="spin"/><h3>Opening the community board…</h3></div> : filtered.length ? <div className="request-grid">{filtered.map((item, i) => <RequestCard key={item.id} item={item} index={i} onClick={()=>setSelected(item.id)}/>)}</div> : <div className="empty"><Headphones size={34}/><h3>{view === 'library' ? 'The first voice could be yours.' : 'No requests match just yet.'}</h3><p>{view === 'library' ? 'Approved recordings will appear here. Start by helping with an open request.' : 'Try another filter, or create a request for the help you need.'}</p><button className="button dark" onClick={()=>{ if(view==='library') navigate('board'); else {setSearch('');setLanguage('All languages');setStatus('all');} }}>{view==='library'?'Explore requests':'Reset filters'}<ArrowRight size={16}/></button></div>}
          <div className="board-footer"><ShieldCheck size={15}/><span>Source-linked. Human-reviewed. Shared with care.</span><span className="footer-right">Built for belonging <Heart size={12}/></span></div></section>
        </>}
        {(view === 'contributions' || view === 'review') && <section className="activity-section">{!user ? <div className="empty"><HandHeart size={36}/><h3>Your contribution story starts here.</h3><p>Sign in to record, share, and follow your contributions.</p><button className="button dark" onClick={()=>setModal('auth')}>Join the community<ArrowRight size={16}/></button></div> : list.length === 0 ? <div className="empty"><CheckCheck size={36}/><h3>{view==='review'?'You’re all caught up.':'A little time can go a long way.'}</h3><p>{view==='review'?'Recordings from other volunteers will appear here for your review.':'Choose an open request to make your first contribution.'}</p><button className="button dark" onClick={()=>navigate('board')}>Explore requests<ArrowRight size={16}/></button></div> : list.map(c=><button key={c.id} className="activity-row" onClick={()=>setSelected(c.request_id)}><span className="card-symbol green"><Mic/></span><div><h3>{c.title}</h3><p>{view==='review'?`Recorded by ${c.name}`:c.review_note || 'Thank you for giving your voice.'}</p></div><span className={`status ${c.status}`}>{statusLabel(c.status)}</span><ArrowRight size={19}/></button>)}</section>}
      </main>
    </div>
    {modal === 'auth' && <Modal title="A little help starts with you." onClose={()=>setModal(null)}><AuthForm onSuccess={async()=>{setModal(null);await refresh();setToast('Welcome to the community.');}}/></Modal>}
    {modal === 'create' && <Modal title="Open a door for someone." onClose={()=>setModal(null)} wide><CreateForm onSuccess={async(id,existing)=>{setModal(null);await refresh();setSelected(id);setToast(existing?'This resource has already been requested. You can support it here.':'Your request is now on the board.');}}/></Modal>}
    {modal === 'about' && <Modal title="Good grows when we share it." onClose={()=>setModal(null)}><p className="modal-intro">Missing Access helps people access the Quran through Arabic text, sourced translations of its meaning, and volunteer audio readings.</p><div className="steps">{[['01','Ask for a little help','Choose a QuranEnc translation, surah, and verse, and explain who an audio reading would help.'],['02','Give your voice','Read the selected translation faithfully, then upload or record it here.'],['03','Share it with care','A different reviewer checks accuracy, listening quality, and permission before publication.']].map(([n,t,d])=><div key={n}><span>{n}</span><section><h3>{t}</h3><p>{d}</p></section></div>)}</div><div className="info-box"><Leaf size={20}/><p>Every request is based on a QuranEnc source. Starter requests contain Arabic verses and French or English translations retrieved from the provider. Volunteer recordings are readings of translations of the meaning, not Arabic Quran recitation.</p></div></Modal>}
    {selected && <Modal title="A request. A real opportunity." onClose={()=>setSelected(null)} wide><RequestDetail id={selected} user={user} onRefresh={refresh} onSignIn={()=>{setSelected(null);setModal('auth');}} onToast={setToast}/></Modal>}
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={16}/></button></div>}
  </div>;
}

function Stat({ icon, value, label, color }: { icon: ReactNode; value: number; label: string; color: string }) { return <div className="stat"><span className={`stat-icon ${color}`}>{icon}</span><div><strong>{value.toString().padStart(2,'0')}</strong><p>{label}</p></div></div>; }
function RequestCard({ item, index, onClick }: { item: RequestItem; index: number; onClick: ()=>void }) {
  return <article className="request-card">
    <div className="card-top"><span className={`card-symbol ${['green','peach','purple'][index%3]}`}><BookOpen size={23}/></span><span className={`status ${item.status}`}><span/>{statusLabel(item.status)}</span></div>
    <div className="card-category">Quran translation{item.sample === 1 && <span>Starter</span>}</div>
    <h3><button onClick={onClick}>{item.title}</button></h3>
    <p className="card-arabic" lang="ar" dir="rtl">{item.source_arabic}</p>
    <p className="card-description" dir="auto">{item.source_text}</p>
    <p className="card-source">{item.source_label}</p>
    <div className="card-tags"><span><Globe2 size={13}/>{item.language}</span><span><AudioLines size={14}/>Translation reading</span></div>
    <div className="card-bottom"><span><Clock3 size={14}/>{Math.max(1,Math.ceil(item.source_text.split(/\s+/).length/120))} min read</span><button onClick={onClick}>{item.status==='completed'?'Listen now':item.status==='review'?'View verse':'Read & contribute'}<ArrowRight size={16}/></button></div>
  </article>;
}

function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: ()=>void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(()=>{
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow; document.body.style.overflow='hidden';
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if(e.key==='Escape') close.current();
      if(e.key==='Tab') {
        const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), audio[controls], [tabindex="0"]') || []).filter(el=>el.getClientRects().length>0);
        const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey && (document.activeElement===first || document.activeElement===ref.current)){e.preventDefault();last?.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }
    document.addEventListener('keydown',key);
    return ()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className={`modal ${wide?'wide':''}`} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow">MISSING ACCESS</span><h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={22}/></button></div>{children}</div></div>;
}
function AuthForm({ onSuccess }: { onSuccess: ()=>void }) {
  const [register,setRegister]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault();setBusy(true);setError(''); const values=Object.fromEntries(new FormData(event.currentTarget));try{await api('/api/auth',json({...values,action:register?'register':'login'}));onSuccess();}catch(e){setError((e as Error).message);}finally{setBusy(false);} }
  return <form onSubmit={submit} className="form"><p className="modal-intro">{register?'Join a community making knowledge easier to reach.':'Welcome back. Your next small act is waiting.'}</p>{register&&<label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={60} placeholder="How should we call you?"/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label>Password<input name="password" type="password" autoComplete={register?'new-password':'current-password'} required minLength={10} maxLength={128} placeholder="At least 10 characters"/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button dark full" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} {register?'Create my account':'Sign in'}</button><button type="button" className="text-button centered" onClick={()=>{setRegister(!register);setError('');}}>{register?'Already part of the community? Sign in':'New here? Create an account'}</button></form>;
}

function CreateForm({ onSuccess }: { onSuccess: (id:string,existing:boolean)=>void }) {
  const [translations,setTranslations]=useState<{key:string;title:string;language:string}[]>([]);
  const [key,setKey]=useState(''),[sura,setSura]=useState('1'),[aya,setAya]=useState('1');
  const [preview,setPreview]=useState<{text:string;arabic:string;footnotes:string;url:string;label:string}|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[sourceBusy,setSourceBusy]=useState(true);
  const loadTranslations=useCallback(async()=>{
    setSourceBusy(true);setError('');
    try { const d=await api('/api/content');setTranslations(d.translations);setKey(d.translations.find((t:{key:string})=>t.key==='french_montada')?.key || d.translations[0]?.key || ''); }
    catch(e){setError((e as Error).message);}finally{setSourceBusy(false);}
  },[]);
  useEffect(()=>{void loadTranslations();},[loadTranslations]);
  async function previewVerse(){
    setSourceBusy(true);setError('');
    try{setPreview(await api(`/api/content?translation=${encodeURIComponent(key)}&sura=${sura}&aya=${aya}`));}
    catch(e){setError((e as Error).message);}finally{setSourceBusy(false);}
  }
  async function submit(event: FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');
    const values=Object.fromEntries(new FormData(event.currentTarget));
    try{const d=await api('/api/requests',json({...values,source_kind:'quran',translation:key,sura,aya,permission:values.permission==='on'}));onSuccess(d.id,!!d.existing);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <form className="form" onSubmit={submit}>
    <p className="modal-intro">Choose a Quran verse and a translation of its meaning. Arabic text, translation, and references come directly from QuranEnc.</p>
    <div className="source-picker">
      <label>Quran translation<select value={key} onChange={e=>{setKey(e.target.value);setPreview(null);}} required disabled={sourceBusy}><option value="">Select a translation</option>{translations.map(t=><option key={t.key} value={t.key}>{t.title.replace(/<[^>]*>/g,'')}</option>)}</select></label>
      <div className="form-grid"><label>Surah<input type="number" min={1} max={114} required value={sura} onChange={e=>{setSura(e.target.value);setPreview(null);}}/></label><label>Verse<input type="number" min={1} max={286} required value={aya} onChange={e=>{setAya(e.target.value);setPreview(null);}}/></label></div>
      <button type="button" className="button secondary" disabled={sourceBusy} onClick={()=>void(translations.length?previewVerse():loadTranslations())}>{sourceBusy?<LoaderCircle className="spin" size={16}/>:<BookOpen size={16}/>} {translations.length?'Preview Quran verse':'Load translations'}</button>
      {preview&&<div className="quran-preview"><p className="quran-arabic" lang="ar" dir="rtl">{preview.arabic}</p><blockquote className="source-text" dir="auto">{preview.text}</blockquote>{preview.footnotes&&<details className="quran-notes"><summary>Translator’s footnotes</summary><p dir="auto">{preview.footnotes}</p></details>}<a href={preview.url} target="_blank" rel="noreferrer">{preview.label} <ExternalLink size={12}/></a></div>}
      <small>The recording language follows your selected translation. Please verify permission to record and redistribute that translation.</small>
    </div>
    <label>Give your request a title<input name="title" required minLength={8} maxLength={100} placeholder="e.g. Al-Fatihah — a French reading of the meaning"/></label>
    <label>Who would an audio version help?<textarea name="description" required minLength={15} maxLength={1000} rows={3} placeholder="Describe the listening need, without names or private contact details."/></label>
    <label className="checkbox"><input name="permission" type="checkbox" required/><span>I have checked the provider’s terms and have permission to record and share this translation publicly.</span></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button dark full" disabled={busy || sourceBusy || !key}>{busy?<LoaderCircle className="spin" size={18}/>:<Plus size={18}/>}Publish request</button>
  </form>;
}

function RequestDetail({ id,user,onRefresh,onSignIn,onToast }: { id:string;user:User|null;onRefresh:()=>Promise<void>;onSignIn:()=>void;onToast:(s:string)=>void }) {
  const [item,setItem]=useState<RequestItem|null>(null),[contributions,setContributions]=useState<Contribution[]>([]),[supported,setSupported]=useState(false),[error,setError]=useState('');
  const load=useCallback(async()=>{try{const d=await api(`/api/requests/${id}`);setItem(d.request);setContributions(d.contributions);setSupported(d.supported);}catch(e){setError((e as Error).message);}},[id]);
  useEffect(()=>{void load();},[load]);
  async function changed(){await load();await onRefresh();}
  if(!item)return <div className="empty">{error?<p className="form-error">{error}</p>:<LoaderCircle className="spin"/>}</div>;
  return <div className="request-detail"><div className="detail-tags"><span className={`status ${item.status}`}>{statusLabel(item.status)}</span><span><Globe2 size={14}/>{item.language}</span>{!!item.sample&&<span className="sample-tag">Starter request</span>}</div><h2 className="detail-title">{item.title}</h2><p className="detail-description">{item.description}</p><p className="quran-arabic" lang="ar" dir="rtl">{item.source_arabic}</p><div className="source-heading"><h3><FileText size={17}/>Translation to record</h3>{item.source_url?<a href={item.source_url} target="_blank" rel="noreferrer">View source<ExternalLink size={13}/></a>:<span>{item.source_label}</span>}</div><blockquote className="source-text" dir="auto">{item.source_text}</blockquote>{item.source_footnotes&&<details className="quran-notes"><summary>Translator’s footnotes</summary><p dir="auto">{item.source_footnotes}</p></details>}{item.source_kind==='quran'&&<p className="muted">A translation of the meaning. Preserve the wording and source reference.</p>}
    {contributions.map(c=><div className="recording-item" key={c.id}><div className="recording-heading"><span><Headphones size={18}/><strong>{c.name}’s recording</strong></span><span className={`status ${c.status}`}>{statusLabel(c.status)}</span></div><audio controls preload="metadata" src={`/api/audio/${c.id}`}/>{c.note&&<p>{c.note}</p>}{c.review_note&&<p className="review-note"><strong>Reviewer feedback:</strong> {c.review_note}</p>}{user?.role==='reviewer'&&c.status==='pending'&&c.user_id!==user.id&&<ReviewForm id={c.id} onSuccess={async()=>{await changed();onToast('Review saved. Thank you for taking care.');}}/>}{c.status==='pending'&&c.user_id===user?.id&&<p className="muted">A different community reviewer will check your recording.</p>}</div>)}
    {item.status==='open'?(user?<Recorder requestId={id} onSuccess={async()=>{await changed();onToast('Recording submitted for review. Thank you!');}}/>:<div className="contribution-callout"><span className="card-symbol green"><Mic/></span><div><h3>You could be the voice they need.</h3><p>Sign in to record or upload your contribution.</p></div><button className="button dark" onClick={onSignIn}>I can help<ArrowRight size={16}/></button></div>):item.status==='review'&&<div className="info-box"><ShieldCheck size={21}/><p>A volunteer has submitted a recording. It will be available to everyone once a reviewer approves it.</p></div>}
    <button className="button secondary full" disabled={supported} onClick={async()=>{if(!user){onSignIn();return;}try{await api(`/api/requests/${id}`,{method:'POST'});setSupported(true);await onRefresh();onToast('Your support has been added to this request.');}catch(e){setError((e as Error).message);}}}><Heart size={16}/>{supported?'You support this request':'I would benefit from this too'}</button>{error&&<p className="form-error" role="alert">{error}</p>}
  </div>;
}

function Recorder({ requestId,onSuccess }: { requestId:string;onSuccess:()=>Promise<void> }) {
  const [file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),chunks=useRef<Blob[]>([]),mounted=useRef(true);
  useEffect(()=>{if(!file){setUrl('');return;}const object=URL.createObjectURL(file);setUrl(object);return()=>URL.revokeObjectURL(object);},[file]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());};},[]);
  useEffect(()=>{if(!recording)return;const timer=setInterval(()=>setSeconds(s=>s+1),1000);return()=>clearInterval(timer);},[recording]);
  useEffect(()=>{if(seconds>=300&&recording)recorder.current?.stop();},[seconds,recording]);
  async function start(){setError('');setBusy(true);try{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Recording is unavailable in this browser. Please upload an audio file instead.');stream.current=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current){stream.current.getTracks().forEach(t=>t.stop());return;}const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(m=>MediaRecorder.isTypeSupported(m));const rec=new MediaRecorder(stream.current,mime?{mimeType:mime}:undefined);recorder.current=rec;chunks.current=[];rec.ondataavailable=e=>{if(e.data.size)chunks.current.push(e.data);};rec.onstop=()=>{setFile(new File(chunks.current,'community-recording',{type:rec.mimeType}));setRecording(false);stream.current?.getTracks().forEach(t=>t.stop());};rec.start();setRecording(true);setSeconds(0);setFile(null);}catch(e){stream.current?.getTracks().forEach(t=>t.stop());if(mounted.current)setError((e as Error).name==='NotAllowedError'?'Microphone permission was denied. You can allow it in your browser or upload a recording.':(e as Error).message);}finally{if(mounted.current)setBusy(false);}}
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!file)return;setBusy(true);setError('');const data=new FormData(e.currentTarget);data.set('request_id',requestId);data.set('audio',file);data.set('permission','true');try{await api('/api/contributions',{method:'POST',body:data});await onSuccess();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
  return <form className="recorder form" onSubmit={submit}><div><h3><Mic size={19}/>Give this text a voice</h3><p>Read the exact translation at a gentle pace. This recording is a translation reading, not Arabic recitation.</p></div><div className="record-actions"><button type="button" className={`button ${recording?'recording-button':'dark'}`} onClick={()=>recording?recorder.current?.stop():void start()} disabled={busy}>{recording?<Square size={15}/>:<Mic size={17}/>} {recording?`Stop · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Start recording'}</button><span>or</span><label className="upload-label"><Upload size={17}/>Upload audio<input type="file" accept="audio/*,.webm,.m4a" disabled={recording||busy} onChange={e=>{const f=e.target.files?.[0];if(f){if(f.size>20*1024*1024){setError('Choose a file smaller than 20 MB.');return;}setFile(f);setError('');}}}/></label></div><small>Up to 5 minutes in-browser · Uploads up to 20 MB · MP3, WAV, OGG, WebM, M4A</small>{url&&<div className="audio-preview"><span>{file?.name}</span><audio src={url} controls/></div>}<label>Note for the reviewer <span className="optional">(optional)</span><textarea name="note" maxLength={1000} rows={2} placeholder="Anything the reviewer should know?"/></label><label className="checkbox"><input type="checkbox" required/><span>I made this recording and have permission to share it and the source text publicly.</span></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button dark full" disabled={!file||recording||busy}>{busy?<LoaderCircle className="spin" size={17}/>:<ShieldCheck size={17}/>}Submit for review</button></form>;
}
function ReviewForm({ id,onSuccess }: { id:string;onSuccess:()=>Promise<void> }) {
  const [note,setNote]=useState(''),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function review(decision:string){setBusy(true);setError('');try{await api(`/api/contributions/${id}`,json({decision,note,checked}));await onSuccess();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="review-form form"><label>Review feedback<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={2} placeholder="Explain any changes needed, or leave a thank-you."/></label><label className="checkbox"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/><span>I listened to the recording, checked it against the source, and verified permission to publish.</span></label><div className="form-grid"><button type="button" className="button secondary" disabled={busy} onClick={()=>void review('rejected')}>Request changes</button><button type="button" className="button dark" disabled={!checked||busy} onClick={()=>void review('approved')}><Check size={17}/>Approve & publish</button></div>{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}

function SproutArt(){return <svg viewBox="0 0 90 75" aria-hidden="true"><path d="M44 68V29" fill="none" stroke="#446b52" strokeWidth="2"/><path d="M44 48C20 50 14 32 16 21c18-2 31 8 28 27" fill="#91b29a"/><path d="M44 36C44 13 62 8 75 11c-1 18-14 28-31 25" fill="#446b52"/><path d="M25 68h40" stroke="#b9b5a4" strokeWidth="2"/><circle cx="18" cy="10" r="3" fill="#d0ac70"/><path d="M72 47v10m-5-5h10" stroke="#d0ac70" strokeWidth="2"/></svg>;}
function HeroArt(){return <div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span><div className="floating-label source-label"><span><BookOpen size={18}/></span><div>One Quran verse<small>A meaning worth sharing</small></div><Check size={15}/></div><div className="audio-art"><div className="audio-art-top"><span><Mic size={19}/></span><span>A voice that opens doors<small>Made with a little care</small></span><MoreHorizontal size={20}/></div><div className="waveform">{[14,23,35,20,43,58,32,49,72,46,61,85,57,39,69,49,77,54,33,59,39,23,42,27,15].map((h,i)=><i key={i} style={{height:h}}/>)}</div><div className="audio-art-bottom"><span className="play-art"><Pause size={15} fill="currentColor"/></span><div/><span>01:24</span><Heart size={16}/></div></div><div className="floating-label accessible-label"><span><Headphones size={20}/></span><div>Someone can listen now.<small>That’s the difference you make.</small></div><span className="little-heart">♡</span></div><div className="art-caption">FROM YOUR VOICE, TO THEIR WORLD</div></div>;}
