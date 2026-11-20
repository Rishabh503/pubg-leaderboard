import { useEffect, useMemo, useState } from 'react';
import { Crosshair, Trophy, RotateCcw, Copy, Check, Swords, Clock3, ChevronRight, Trash2 } from 'lucide-react';

const initial = { players: ['Aditya', 'Rishabh', 'Shresth'], matches: [] };
const key = 'dropzone-trio-v1';

export default function App() {
  const [data, setData] = useState(() => { try { return { ...initial, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return initial; } });
  const [copied, setCopied] = useState(false);
  const [day, setDay] = useState(new Date().toLocaleDateString('en-CA'));
  const [boardMode, setBoardMode] = useState('global');
  const [historyMode, setHistoryMode] = useState('all');
  const [sharedReady, setSharedReady] = useState(false);
  const [sharedStatus, setSharedStatus] = useState('Connecting…');
  useEffect(() => {
    let active = true;
    const localData = data;
    const sync = async (initialize = false) => {
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('API unavailable');
        const result = await response.json();
        if (!active) return;
        if (result.data) setData(result.data);
        else if (initialize) {
          const save = await fetch('/api/leaderboard', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: localData }) });
          if (!save.ok) throw new Error('Could not initialize shared data');
        }
        setSharedReady(true);
        setSharedStatus('Shared');
      } catch {
        if (active) { setSharedReady(true); setSharedStatus('Local only · check DATABASE_URL'); }
      }
    };
    sync(true);
    const timer = setInterval(() => sync(false), 5000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(data));
    if (sharedReady && sharedStatus === 'Shared') fetch('/api/leaderboard', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) }).catch(() => setSharedStatus('Sync issue'));
  }, [data, sharedReady]);
  const dayMatches = useMemo(() => data.matches.filter(m => new Date(m.at).toLocaleDateString('en-CA') === day), [data, day]);
  const makeStandings = matches => data.players.map((name, id) => ({ id, name, points: matches.reduce((sum, match) => sum + (match.winners.includes(id) ? match.points : 0), 0), wins: matches.filter(m => m.winners.includes(id)).length })).sort((a, b) => b.points - a.points || b.wins - a.wins || a.id - b.id);
  const standings = useMemo(() => makeStandings(data.matches), [data]);
  const dailyStandings = useMemo(() => makeStandings(dayMatches), [data.players, dayMatches]);
  const shownMatches = historyMode === 'all' ? data.matches : historyMode === 'today' ? dayMatches : data.matches.filter(m => new Date(m.at).toLocaleDateString('en-CA') !== new Date().toLocaleDateString('en-CA'));
  const shownStandings = boardMode === 'global' ? standings : dailyStandings;
  const record = (winner, count) => setData(d => ({ ...d, matches: [{ id: Date.now(), winners: count === 1 ? [winner] : winner, points: count === 1 ? 4 : 2, count, at: new Date().toISOString() }, ...d.matches] }));
  const deleteMatch = id => setData(d => ({ ...d, matches: d.matches.filter(match => match.id !== id) }));
  const updateName = (id, name) => setData(d => ({ ...d, players: d.players.map((p, i) => i === id ? name : p) }));
  const copy = async () => { await navigator.clipboard.writeText(standings.map((p, i) => `${i + 1}. ${p.name} — ${p.points} pts`).join('\n')); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const reset = () => { if (window.confirm('Reset all scores and match history?')) setData(d => ({ ...d, matches: [] })); };
  const winnerName = ids => ids.map(id => data.players[id]).join(' & ');
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon"><Crosshair size={19}/></span><span>DROPZONE<span className="brand-sub">TRIO TRACKER</span></span></a><div className="season"><i/> {sharedStatus.toUpperCase()} <span>·</span> ERANGEL</div></header>
    <section className="hero"><div><div className="eyebrow"><span/> YOUR CREW. YOUR CROWN.</div><h1>TRIO <em>LEADERBOARD</em></h1><p>Every drop counts. Track the wins, own the bragging rights.</p></div><div className="match-count"><span className="count-label">MATCHES PLAYED</span><strong>{String(data.matches.length).padStart(2, '0')}</strong><span className="count-foot">THIS SESSION</span></div></section>
    <div className="lower-grid"><section className="panel record-panel"><div className="section-head"><div><Swords size={17}/><h2>RECORD A MATCH</h2></div><span className="section-note">PICK THE WINNER</span></div><div className="mode-label">SOLO WIN <span>·</span> 4 POINTS</div><div className="winner-grid">{data.players.map((p,i)=><button className="winner-btn" key={`solo${i}`} onClick={()=>record(i,1)}><span>{p}</span><ChevronRight size={15}/></button>)}</div><div className="mode-label duo-label">DUO WIN <span>·</span> 2 POINTS EACH</div><div className="duo-grid">{[[0,1],[0,2],[1,2]].map(([a,b])=><button className="duo-btn" key={`${a}${b}`} onClick={()=>record([a,b],2)}><span>{data.players[a]} <b>+</b> {data.players[b]}</span><ChevronRight size={15}/></button>)}</div><div className="scoring-note">LOSERS RECEIVE <b>0 POINTS</b></div></section>
    <section className="board panel"><div className="section-head"><div><Trophy size={17}/><h2>{boardMode === 'global' ? 'GLOBAL LEADERBOARD' : 'DAILY LEADERBOARD'}</h2></div><div className="board-controls"><select aria-label="Leaderboard period" value={boardMode} onChange={e=>setBoardMode(e.target.value)}><option value="global">Global</option><option value="daily">By date</option></select>{boardMode==='daily'&&<input aria-label="Leaderboard date" type="date" value={day} onChange={e=>setDay(e.target.value)}/>}</div></div><div className="table-head"><span>RANK / PLAYER</span><span>WINS</span><span>POINTS</span></div>{shownStandings.map((p, i) => <div className={`player-row ${i === 0 && (boardMode==='global'?data.matches.length:dayMatches.length) ? 'leader' : ''}`} key={p.id}><div className="player-info"><span className={`rank ${i===0?'gold':''}`}>{String(i+1).padStart(2,'0')}</span><span className="avatar">{(p.name.trim()[0] || '?').toUpperCase()}</span><input aria-label={`Player ${i+1} name`} value={p.name} maxLength={24} onChange={e=>updateName(p.id,e.target.value)} /></div><span className="wins">{p.wins}</span><strong className="points">{p.points}<small> PTS</small></strong></div>)}<div className="board-actions"><span>POINTS DECIDE THE DROP.</span><div><button className="text-btn" onClick={reset}><RotateCcw size={14}/> RESET</button><button className="copy-btn" onClick={copy}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'COPIED':'COPY SCORES'}</button></div></div></section>
    </div>
    <section className="panel history-panel history-full"><div className="section-head"><div><Clock3 size={17}/><h2>MATCH HISTORY</h2></div><div className="board-controls"><select aria-label="Match history period" value={historyMode} onChange={e=>setHistoryMode(e.target.value)}><option value="all">All matches</option><option value="today">Today</option><option value="past">Past matches</option></select><span className="history-count">{shownMatches.length} SHOWN</span></div></div>{shownMatches.length ? <div className="history-list">{shownMatches.slice(0,20).map((m,index)=><div className="history-item" key={m.id}><span className="history-index">#{String(shownMatches.length-index).padStart(2,'0')}</span><div className="history-detail"><strong>{winnerName(m.winners)}</strong><span>{m.count===1?'SOLO CHICKEN DINNER':'DUO CHICKEN DINNER'} <i>·</i> {new Date(m.at).toLocaleDateString()} · {new Date(m.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div><b className="history-points">+{m.points}<small> PTS</small></b><button className="delete-match" aria-label={`Delete match won by ${winnerName(m.winners)}`} title="Delete match" onClick={()=>{if(window.confirm('Delete this match? Scores will be recalculated.')) deleteMatch(m.id)}}><Trash2 size={14}/></button></div>)}</div> : <div className="empty"><div className="empty-icon"><Crosshair size={19}/></div><strong>NO MATCHES HERE</strong><span>Record a result to see it in your history.</span></div>}</section>
    <footer><span>DROPZONE <i>·</i> TRIO TRACKER</span><span>GOOD LUCK. HAVE FUN.</span></footer>
  </main>;
}
