import { useState, useEffect, useRef } from "react";

const SK = "companion_v4";
const PC = { high:"#e05c5c", medium:"#d4a04a", low:"#6b9e78" };
const GREETING = "Hey Meng. What does today look like?";

const SYS = `You are Meng's daily companion — calm, grounded, direct. Meng is an international tax manager at Deloitte (CSG, San Jose), preparing for a DC rotation in Subchapter C. Smart, reflective, often carrying too much. Spouse does transfer pricing at Deloitte; long-distance during rotation. Planning family in 2–5 years.

Role: daily planning/prioritization, accountability on commitments (known pattern of overpromising — flag before they say yes to something new, circle back on prior commitments), energy/stress (suggest concrete action when drained, not just acknowledgment). When overwhelmed: one next step. When avoiding: no blame, break it down. Never sycophantic. Concise. Professional context: intl tax, Sub C, transfer pricing, US-China, semis, biotech, Deloitte structure.`;

function load() { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch { return {}; } }
function save(s) { try { localStorage.setItem(SK, JSON.stringify(s)); } catch {} }
function tod() { return new Date().toISOString().slice(0,10); }
function fmtT(d) { return new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }
function fmtD(d) { return new Date(d).toLocaleDateString([],{weekday:"long",month:"short",day:"numeric"}); }
function to12(t) { if(!t) return ""; const [h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; }

// Wellness score: sleep 35%, exercise 20%, meals 15%, hydration 10%, reading 10%, selfcare 5%, space 5%
function wellnessScore(w) {
  let score=0;
  if(w.sleep){ const s=Number(w.sleep); score+=s>=80?35:s>=60?21:8; }
  if(w.exercise){ const e=Number(w.exercise); score+=e>=30?20:e>=15?12:4; }
  if(w.meals==="yes") score+=15;
  if(w.hydration==="yes") score+=10;
  if(w.reading){ const r=Number(w.reading); score+=r>=20?10:r>=10?6:2; }
  if(w.selfcare==="yes") score+=5;
  if(w.space==="yes") score+=5;
  return score>=75?"high":score>=45?"mid":"low";
}
const WELL_COLOR={high:"#6b9e78",mid:"#d4a04a",low:"#e05c5c"};
function WellDot({w}) {
  const s=wellnessScore(w);
  return <div style={{width:8,height:8,borderRadius:"50%",background:WELL_COLOR[s],flexShrink:0,boxShadow:`0 0 5px ${WELL_COLOR[s]}88`}}/>;
}

// ── Modal shell ──
function Modal({ children }) {
  return <div style={{position:"fixed",inset:0,background:"#000c",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{background:"#141414",border:"1px solid #252525",borderRadius:12,padding:20,width:"100%",maxWidth:380,display:"flex",flexDirection:"column",gap:12}}>
      {children}
    </div>
  </div>;
}

function MInput({label,type="text",value,onChange,placeholder,autoFocus}) {
  return <div>
    <div style={{fontSize:11,color:"#444",marginBottom:4}}>{label}</div>
    <input autoFocus={autoFocus} type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",background:"#1a1a1a",border:"1px solid #252525",color:"#e8e2d9",borderRadius:6,padding:"8px 10px",fontSize:13,outline:"none",fontFamily:"inherit"}}
      onFocus={e=>e.target.style.borderColor="#c49a38"} onBlur={e=>e.target.style.borderColor="#252525"} />
  </div>;
}

function MSelect({label,value,onChange,options}) {
  return <div style={{flex:1}}>
    <div style={{fontSize:11,color:"#444",marginBottom:4}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",background:"#1a1a1a",border:"1px solid #252525",color:"#e8e2d9",borderRadius:6,padding:"8px 10px",fontSize:13,outline:"none",fontFamily:"inherit"}}>
      {options.map(([v,l])=><option key={v} value={v}>{l}</option>)}
    </select>
  </div>;
}

function SaveCancel({onSave,onClose,label="Save"}) {
  return <div style={{display:"flex",gap:8,marginTop:4}}>
    <button onClick={onSave} style={{flex:1,background:"#c49a38",border:"none",color:"#0d0d0d",borderRadius:7,padding:"9px",fontSize:13,fontWeight:500,cursor:"pointer"}}>{label}</button>
    <button onClick={onClose} style={{background:"transparent",border:"1px solid #252525",color:"#555",borderRadius:7,padding:"9px 16px",fontSize:13,cursor:"pointer"}}>Cancel</button>
  </div>;
}

// ── Task Modal ──
function TaskModal({task,onSave,onClose}) {
  const [f,setF]=useState({text:task?.text||"",priority:task?.priority||"medium",due:task?.due||""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{ if(!f.text.trim()) return; onSave(task?{...task,...f}:{id:Date.now()+Math.random(),...f,done:false,created:Date.now()}); };
  return <Modal>
    <div style={{fontSize:14,fontWeight:500,color:"#ccc9c0"}}>{task?"Edit task":"Add task"}</div>
    <MInput label="Task" value={f.text} onChange={v=>s("text",v)} placeholder="What needs to get done?" autoFocus onKeyDown={e=>e.key==="Enter"&&submit()} />
    <div style={{display:"flex",gap:8}}>
      <MSelect label="Priority" value={f.priority} onChange={v=>s("priority",v)} options={[["high","High"],["medium","Medium"],["low","Low"]]} />
      <div style={{flex:1}}><div style={{fontSize:11,color:"#444",marginBottom:4}}>Due date</div>
        <input type="date" value={f.due} onChange={e=>s("due",e.target.value)}
          style={{width:"100%",background:"#1a1a1a",border:"1px solid #252525",color:"#e8e2d9",borderRadius:6,padding:"8px 10px",fontSize:13,outline:"none",fontFamily:"inherit"}}
          onFocus={e=>e.target.style.borderColor="#c49a38"} onBlur={e=>e.target.style.borderColor="#252525"} />
      </div>
    </div>
    <SaveCancel onSave={submit} onClose={onClose} label={task?"Save":"Add"} />
  </Modal>;
}

// ── Event Modal ──
function EventModal({event,onSave,onClose}) {
  const [f,setF]=useState({title:event?.title||"",date:event?.date||tod(),startTime:event?.startTime||"",endTime:event?.endTime||"",location:event?.location||""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const submit=()=>{ if(!f.title.trim()) return; onSave(event?{...event,...f}:{id:Date.now()+Math.random(),...f}); };
  return <Modal>
    <div style={{fontSize:14,fontWeight:500,color:"#ccc9c0"}}>{event?"Edit event":"Add event"}</div>
    <MInput label="Title" value={f.title} onChange={v=>s("title",v)} placeholder="Client call, team sync..." autoFocus />
    <MInput label="Date" type="date" value={f.date} onChange={v=>s("date",v)} />
    <div style={{display:"flex",gap:8}}>
      <MInput label="Start time" type="time" value={f.startTime} onChange={v=>s("startTime",v)} />
      <MInput label="End time" type="time" value={f.endTime} onChange={v=>s("endTime",v)} />
    </div>
    <MInput label="Location" value={f.location} onChange={v=>s("location",v)} placeholder="Optional" />
    <SaveCancel onSave={submit} onClose={onClose} label={event?"Save":"Add"} />
  </Modal>;
}

// ── Editable goal ──
function Goal({label,value,placeholder,onChange,accent}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value);
  const ref=useRef(null);
  useEffect(()=>{ if(editing) ref.current?.focus(); },[editing]);
  function commit(){ onChange(draft.trim()); setEditing(false); }
  return <div style={{flex:1,minWidth:0}}>
    <div style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:accent,marginBottom:5,fontWeight:500}}>{label}</div>
    {editing
      ? <textarea ref={ref} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commit();} if(e.key==="Escape"){setDraft(value);setEditing(false);} }}
          rows={2} style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${accent}44`,color:"#e8e2d9",fontSize:13,lineHeight:1.5,resize:"none",outline:"none",fontFamily:"inherit",padding:"2px 0"}} />
      : <div onClick={()=>{setDraft(value);setEditing(true);}} style={{fontSize:13,lineHeight:1.55,color:value?"#d0cbc3":"#2e2e2e",cursor:"text",minHeight:20,fontStyle:value?"normal":"italic"}}>
          {value||placeholder}
        </div>
    }
  </div>;
}

// ── Note card ──
function Note({note,onUpdate,onDelete}) {
  const [text,setText]=useState(note.text);
  const t=useRef(null);
  function onChange(v){ setText(v); clearTimeout(t.current); t.current=setTimeout(()=>onUpdate(note.id,v),400); }
  return <div style={{background:"#111",border:"1px solid #1c1c1c",borderRadius:8,padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
    <textarea value={text} onChange={e=>onChange(e.target.value)} placeholder="Anything on your mind..."
      style={{background:"transparent",border:"none",outline:"none",color:"#ccc9c0",fontSize:13.5,lineHeight:1.65,resize:"none",fontFamily:"inherit",minHeight:80,width:"100%"}} />
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:11,color:"#2e2e2e"}}>{fmtD(note.created)}</div>
      <button onClick={()=>onDelete(note.id)} style={{background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:12,padding:"2px 6px",borderRadius:4}}
        onMouseEnter={e=>e.target.style.color="#e05c5c"} onMouseLeave={e=>e.target.style.color="#333"}>Delete</button>
    </div>
  </div>;
}

// ── Mini Calendar ──
function Cal({selected,onSelect,dots}) {
  const [y,setY]=useState(()=>new Date().getFullYear());
  const [mo,setMo]=useState(()=>new Date().getMonth());
  const today=tod();
  const dim=new Date(y,mo+1,0).getDate();
  const first=new Date(y,mo,1).getDay();
  const cells=[];
  for(let i=0;i<first;i++) cells.push(null);
  for(let d=1;d<=dim;d++) cells.push(d);
  function prev(){ if(mo===0){setMo(11);setY(y=>y-1);}else setMo(m=>m-1); }
  function next(){ if(mo===11){setMo(0);setY(y=>y+1);}else setMo(m=>m+1); }
  return <div style={{background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:10,padding:"14px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <button onClick={prev} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:"0 4px"}}>‹</button>
      <div style={{fontSize:13,color:"#888",fontWeight:500}}>{new Date(y,mo).toLocaleDateString([],{month:"long",year:"numeric"})}</div>
      <button onClick={next} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:16,padding:"0 4px"}}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
      {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:"#333"}}>{d}</div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {cells.map((d,i)=>{
        if(!d) return <div key={`e${i}`}/>;
        const ds=`${y}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const isSel=ds===selected, isToday=ds===today, isFut=ds>today, hasDot=dots.has(ds);
        return <button key={ds} onClick={()=>onSelect(ds)} style={{
          background:isSel?"#c49a38":isToday?"#1e1e1e":"transparent",
          border:isToday&&!isSel?"1px solid #2a2a2a":"1px solid transparent",
          borderRadius:5,padding:"5px 2px",fontSize:12,position:"relative",
          color:isSel?"#0d0d0d":isToday?"#e8e2d9":isFut?"#444":"#777",
          cursor:"pointer",fontWeight:isToday?500:400,transition:"all 0.1s"
        }}>
          {d}
          {hasDot&&!isSel&&<div style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:"#c49a38"}}/>}
        </button>;
      })}
    </div>
  </div>;
}

// ── Row components ──
function TaskRow({t,onToggle,onEdit,onDelete,showEdit=true}) {
  return <div className="trow" style={{display:"flex",alignItems:"center",gap:12,background:"#0f0f0f",border:"1px solid #181818",borderRadius:8,padding:"11px 14px",position:"relative"}}>
    <div style={{width:7,height:7,borderRadius:"50%",background:PC[t.priority],flexShrink:0}}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13.5,color:"#ccc9c0",lineHeight:1.4}}>{t.text}</div>
      {t.due&&<div style={{fontSize:11,color:"#363636",marginTop:3}}>Due {new Date(t.due+"T00:00:00").toLocaleDateString([],{month:"short",day:"numeric"})}</div>}
    </div>
    {onToggle&&<button onClick={()=>onToggle(t.id)} style={{width:22,height:22,borderRadius:"50%",border:"1.5px solid #252525",background:"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#6b9e78";e.currentTarget.style.background="#0a180c";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525";e.currentTarget.style.background="transparent";}}/>}
    {showEdit&&<button className="trow-act" onClick={()=>onEdit(t)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:11,opacity:0,transition:"opacity 0.15s",padding:"0 4px"}}>Edit</button>}
    <button className="trow-act" onClick={()=>onDelete(t.id)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:16,opacity:0,transition:"opacity 0.15s",padding:"0 2px",lineHeight:1}}>×</button>
  </div>;
}

function EvRow({ev,onEdit,onDelete}) {
  return <div className="evrow" style={{display:"flex",alignItems:"center",gap:12,background:"#0f0f0f",border:"1px solid #181818",borderRadius:8,padding:"10px 14px"}}>
    <div style={{width:3,height:36,background:"#7a9fc2",borderRadius:2,flexShrink:0}}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13.5,color:"#ccc9c0"}}>{ev.title}</div>
      <div style={{fontSize:11,color:"#3a3a3a",marginTop:2}}>
        {ev.startTime?`${to12(ev.startTime)}${ev.endTime?` – ${to12(ev.endTime)}`:""}`:""}
        {ev.location?`  ·  ${ev.location}`:""}
      </div>
    </div>
    <button className="evrow-act" onClick={()=>onEdit(ev)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:11,opacity:0,transition:"opacity 0.15s",padding:"0 4px"}}>Edit</button>
    <button className="evrow-act" onClick={()=>onDelete(ev.id)} style={{background:"none",border:"none",color:"#2a2a2a",cursor:"pointer",fontSize:16,opacity:0,transition:"opacity 0.15s",padding:"0 2px",lineHeight:1}}>×</button>
  </div>;
}

// ── Main ──
export default function App() {
  const st=load();
  const [msgs,setMsgs]=useState(st.msgs||[{role:"assistant",content:GREETING,time:Date.now()}]);
  const [tasks,setTasks]=useState(st.tasks||[]);
  const [notes,setNotes]=useState(st.notes||[]);
  const [events,setEvents]=useState(st.events||[]);
  const [ns,setNs]=useState(st.ns||"");
  const [dg,setDg]=useState(st.dg||"");
  const [summary,setSummary]=useState(st.summary||null);
  const [sumLoading,setSumLoading]=useState(false);
  const [period,setPeriod]=useState(st.period||"");
  const [editPeriod,setEditPeriod]=useState(false);
  const [wellness,setWellness]=useState(st.wellness||{sleep:"",exercise:"",reading:"",meals:undefined,hydration:undefined,selfcare:undefined,space:undefined});
  const [wellOpen,setWellOpen]=useState(false);
  const [snaps,setSnaps]=useState(st.snaps||{});
  const [histDate,setHistDate]=useState(null);
  const [tab,setTab]=useState("day");
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [taskModal,setTaskModal]=useState(null); // null | "add" | task obj
  const [evModal,setEvModal]=useState(null);     // null | "add" | event obj
  const periodRef=useRef(null);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{ save({msgs,tasks,notes,events,ns,dg,summary,period,wellness,snaps}); },[msgs,tasks,notes,events,ns,dg,summary,period,wellness,snaps]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

  // snapshot on summary generate
  useEffect(()=>{
    if(!summary) return;
    const t=tod();
    setSnaps(p=>({...p,[t]:{summary,goal:dg,doneTasks:tasks.filter(x=>x.done&&x.completedOn===t).map(x=>x.text),events:events.filter(e=>e.date===t).map(e=>({title:e.title,startTime:e.startTime,endTime:e.endTime}))}}));
  },[summary]);

  // tasks
  const toggleTask=id=>setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done,completedOn:!t.done?tod():null}:t));
  const deleteTask=id=>setTasks(p=>p.filter(t=>t.id!==id));
  const saveTask=t=>{ setTasks(p=>p.find(x=>x.id===t.id)?p.map(x=>x.id===t.id?t:x):[...p,t]); setTaskModal(null); };

  // events
  const deleteEvent=id=>setEvents(p=>p.filter(e=>e.id!==id));
  const saveEvent=e=>{ setEvents(p=>[...(p.find(x=>x.id===e.id)?p.map(x=>x.id===e.id?e:x):[...p,e])].sort((a,b)=>(a.startTime||"").localeCompare(b.startTime||""))); setEvModal(null); };

  // notes
  const addNote=()=>setNotes(p=>[{id:Date.now(),text:"",created:Date.now()},...p]);
  const updateNote=(id,text)=>setNotes(p=>p.map(n=>n.id===id?{...n,text}:n));
  const deleteNote=id=>setNotes(p=>p.filter(n=>n.id!==id));

  const pending=tasks.filter(t=>!t.done).sort((a,b)=>({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]));
  const done=tasks.filter(t=>t.done);
  const todayEvs=events.filter(e=>e.date===tod()).sort((a,b)=>(a.startTime||"").localeCompare(b.startTime||""));

  // generate summary
  async function genSummary() {
    setSumLoading(true); setSummary(null);
    const t=tod();
    const pr=`Short honest end-of-day summary for Meng (3-4 sentences, direct, no bullet points).\nGoal: ${dg||"not set"}\nNorth star: ${ns||"not set"}\nEvents: ${events.filter(e=>e.date===t).map(e=>e.title).join(", ")||"none"}\nCompleted: ${tasks.filter(x=>x.done&&x.completedOn===t).map(x=>x.text).join(", ")||"none"}\nStill open: ${pending.map(x=>x.text).join(", ")||"none"}\nAcknowledge what was achieved, how it connects to today's goal, one thing to carry forward. Don't flatter.`;
    try {
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:300,system:SYS,messages:[{role:"user",content:pr}]})});
      const d=await r.json();
      setSummary({text:d.content?.find(b=>b.type==="text")?.text||"Error.",time:Date.now()});
    } catch { setSummary({text:"Connection issue.",time:Date.now()}); }
    setSumLoading(false);
  }

  // send chat
  async function send() {
    const text=input.trim(); if(!text||loading) return;
    setInput("");
    const userMsg={role:"user",content:text,time:Date.now()};
    const newMsgs=[...msgs,userMsg]; setMsgs(newMsgs); setLoading(true);
    const taskCtx=tasks.length?`\nTasks:\n${tasks.map(t=>`[ID:${t.id}][${t.priority.toUpperCase()}] ${t.text}${t.due?` due:${t.due}`:""}${t.done?" ✓":""}`).join("\n")}`:""
    const evCtx=todayEvs.length?`\nToday's events:\n${todayEvs.map(e=>`${e.title}${e.startTime?` at ${to12(e.startTime)}`:""}`).join("\n")}`:""
    const allEvCtx=events.length?`\nAll events:\n${events.map(e=>`[ID:${e.id}] ${e.title} on ${e.date}${e.startTime?` at ${to12(e.startTime)}`:""}`).join("\n")}`:""
    const goalCtx=(ns||dg)?`\nNorth star: ${ns||"not set"}\nToday's goal: ${dg||"not set"}`:"";
    const ASYS=`Manage tasks and events. Return ONLY valid JSON:\n{"taskActions":[{"type":"add","text":"...","priority":"high|medium|low","due":"YYYY-MM-DD or null"},{"type":"complete","id":N},{"type":"delete","id":N},{"type":"update_priority","id":N,"priority":"..."}],"eventActions":[{"type":"add","title":"...","date":"YYYY-MM-DD","startTime":"HH:MM or null","endTime":"HH:MM or null","location":"..."},{"type":"delete","id":N},{"type":"update","id":N,"title":"...","date":"...","startTime":"...","endTime":"...","location":"..."}]}\nIf none: {"taskActions":[],"eventActions":[]}\nToday: ${tod()}${taskCtx}${allEvCtx}`;
    try {
      const [mr,ar]=await Promise.all([
        fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:SYS+goalCtx+taskCtx+evCtx,messages:newMsgs.map(m=>({role:m.role,content:m.content}))})}),
        fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
},
body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:600,system:ASYS,messages:[{role:"user",content:text}]})})
      ]);
      const [md,ad]=await Promise.all([mr.json(),ar.json()]);
      try {
        const {taskActions,eventActions}=JSON.parse(ad.content?.find(b=>b.type==="text")?.text||"{}");
        if(taskActions?.length) setTasks(p=>{let u=[...p]; taskActions.forEach(a=>{
          if(a.type==="add") u.push({id:Date.now()+Math.random(),text:a.text,priority:a.priority||"medium",due:a.due||"",done:false,created:Date.now()});
          else if(a.type==="complete") u=u.map(t=>t.id===a.id?{...t,done:true,completedOn:tod()}:t);
          else if(a.type==="delete") u=u.filter(t=>t.id!==a.id);
          else if(a.type==="update_priority") u=u.map(t=>t.id===a.id?{...t,priority:a.priority}:t);
        }); return u; });
        if(eventActions?.length) setEvents(p=>{let u=[...p]; eventActions.forEach(a=>{
          if(a.type==="add") u.push({id:Date.now()+Math.random(),title:a.title,date:a.date||tod(),startTime:a.startTime||"",endTime:a.endTime||"",location:a.location||""});
          else if(a.type==="delete") u=u.filter(e=>e.id!==a.id);
          else if(a.type==="update") u=u.map(e=>e.id===a.id?{...e,...Object.fromEntries(Object.entries(a).filter(([k])=>k!=="type"&&k!=="id"&&a[k]!=null))}:e);
        }); return u.sort((a,b)=>(a.startTime||"").localeCompare(b.startTime||"")); });
      } catch {}
      const reply=md.content?.find(b=>b.type==="text")?.text||"Something went wrong.";
      setMsgs(p=>[...p,{role:"assistant",content:reply,time:Date.now()}]);
    } catch { setMsgs(p=>[...p,{role:"assistant",content:"Connection issue. Try again.",time:Date.now()}]); }
    setLoading(false); setTimeout(()=>inputRef.current?.focus(),50);
  }

  const TABS=[["day","My Day"],["chat","Coach"],["history","Calendar"],["tasks",`Tasks${pending.length?` (${pending.length})`:""}`],["dump","Canvas"]];

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#0d0d0d",color:"#e8e2d9",minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:680,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap');
        *{box-sizing:border-box;} textarea,input,select{font-family:inherit;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#222;border-radius:2px;}
        .trow:hover .trow-act{opacity:1!important;} .evrow:hover .evrow-act{opacity:1!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:.25}50%{opacity:1}}
        .bubble{animation:fadeUp .2s ease;}
        .dots span{animation:blink 1.2s ease-in-out infinite;display:inline-block;width:5px;height:5px;background:#c49a38;border-radius:50%;margin:0 2px;}
        .dots span:nth-child(2){animation-delay:.2s} .dots span:nth-child(3){animation-delay:.4s}
        select option{background:#181818;} .tab-btn:hover{color:#888!important;}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{padding:"18px 24px 14px",borderBottom:"1px solid #181818",position:"sticky",top:0,background:"#0d0d0d",zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:"#e8e2d9",letterSpacing:"-0.2px"}}>Good day, Meng.</div>
            <div style={{fontSize:11,color:"#383838",marginTop:2}}>{fmtD(Date.now())}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,paddingTop:3}}>
            <div style={{display:"flex",gap:5}}>
              {pending.filter(t=>t.priority==="high").length>0&&<div style={{background:"#1a0e0e",border:"1px solid #331515",borderRadius:4,padding:"3px 8px",fontSize:11,color:"#e05c5c"}}>{pending.filter(t=>t.priority==="high").length} urgent</div>}
              <div style={{background:"#141414",border:"1px solid #1e1e1e",borderRadius:4,padding:"3px 8px",fontSize:11,color:"#444"}}>{pending.length} open</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{fontSize:10,color:"#3a3a3a",letterSpacing:"0.06em",textTransform:"uppercase"}}>Next period</div>
              {editPeriod
                ? <input ref={periodRef} type="date" value={period} onChange={e=>setPeriod(e.target.value)} onBlur={()=>setEditPeriod(false)} onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape")setEditPeriod(false);}} style={{background:"#141414",border:"1px solid #c49a3844",color:"#c49a38",borderRadius:4,padding:"2px 6px",fontSize:11,outline:"none",fontFamily:"inherit",width:120}}/>
                : <div onClick={()=>{setEditPeriod(true);setTimeout(()=>periodRef.current?.focus(),30);}} style={{fontSize:11,color:period?"#c49a38":"#2e2e2e",cursor:"pointer",background:"#141414",border:"1px solid #1e1e1e",borderRadius:4,padding:"2px 8px",fontStyle:period?"normal":"italic"}}>
                    {period?new Date(period+"T00:00:00").toLocaleDateString([],{month:"short",day:"numeric"}):"Set date"}
                  </div>
              }
            </div>
          </div>
        </div>

        {/* Goals */}
        <div style={{display:"flex",gap:14,background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
          <Goal label="North Star" value={ns} placeholder="What are you ultimately building toward?" onChange={setNs} accent="#7a9fc2"/>
          <div style={{width:1,background:"#1c1c1c",flexShrink:0}}/>
          <Goal label="Today's Goal" value={dg} placeholder="What would make today a win?" onChange={setDg} accent="#c49a38"/>
        </div>

        {/* Wellness */}
        <div>
          <button onClick={()=>setWellOpen(p=>!p)} style={{width:"100%",background:"none",border:"none",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",padding:"4px 0"}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <WellDot w={wellness}/>
              <div style={{fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:"#3a3a3a"}}>Today's Wellness</div>
              {!wellOpen&&(()=>{
                const s=wellnessScore(wellness);
                const label={high:"Good",mid:"Fair",low:"Low"}[s];
                const color=WELL_COLOR[s];
                return <span style={{fontSize:10,color,background:"#161616",borderRadius:3,padding:"1px 8px",border:`1px solid ${color}33`}}>{label}</span>;
              })()}
            </div>
            <span style={{fontSize:12,color:"#333",transform:wellOpen?"rotate(180deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>▾</span>
          </button>
          {wellOpen&&<div style={{marginTop:10,padding:"12px 14px",background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:8,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[["sleep","Sleep"],["exercise","Exercise"],["reading","Reading"]].map(([k,l])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:"#3a3a3a",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
                  <input type="number" min="0" value={wellness[k]} placeholder={k==="sleep"?"e.g. 82":"min"} onChange={e=>setWellness(p=>({...p,[k]:e.target.value}))}
                    style={{width:"100%",background:"#141414",border:"1px solid #1e1e1e",color:"#ccc9c0",borderRadius:6,padding:"7px 8px",fontSize:13,outline:"none",fontFamily:"inherit"}}
                    onFocus={e=>e.target.style.borderColor="#3a3a3a"} onBlur={e=>e.target.style.borderColor="#1e1e1e"}/>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[["meals","Nutrition"],["hydration","Hydration"],["selfcare","Self-care"],["space","Space"]].map(([k,l])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:"#3a3a3a",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>{l}</div>
                  <div style={{display:"flex",gap:3}}>
                    {["yes","no"].map(v=>(
                      <button key={v} onClick={()=>setWellness(p=>({...p,[k]:p[k]===v?undefined:v}))} style={{flex:1,background:wellness[k]===v?(v==="yes"?"#0d1f10":"#1f0d0d"):"#141414",border:`1px solid ${wellness[k]===v?(v==="yes"?"#1a4a20":"#4a1a1a"):"#1e1e1e"}`,color:wellness[k]===v?(v==="yes"?"#6b9e78":"#e05c5c"):"#555",borderRadius:6,padding:"7px 0",fontSize:12,cursor:"pointer",transition:"all 0.15s"}}>
                        {v==="yes"?"Y":"N"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{display:"flex",padding:"0 24px",borderBottom:"1px solid #181818",overflowX:"auto"}}>
        {TABS.map(([id,label])=>(
          <button key={id} className="tab-btn" onClick={()=>setTab(id)} style={{background:"none",border:"none",whiteSpace:"nowrap",borderBottom:tab===id?"2px solid #c49a38":"2px solid transparent",color:tab===id?"#c49a38":"#3e3e3e",padding:"10px 16px",fontSize:13,fontWeight:tab===id?500:400,cursor:"pointer",letterSpacing:"0.02em",transition:"color 0.15s"}}>{label}</button>
        ))}
      </div>

      {/* ── MY DAY ── */}
      {tab==="day"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:24}}>
        {/* Events */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase"}}>Today's Events</div>
            <button onClick={()=>setEvModal("add")} style={{background:"#111",border:"1px solid #1e1e1e",color:"#555",borderRadius:5,padding:"4px 10px",fontSize:11,cursor:"pointer"}} onMouseEnter={e=>{e.target.style.borderColor="#2a2a2a";e.target.style.color="#999";}} onMouseLeave={e=>{e.target.style.borderColor="#1e1e1e";e.target.style.color="#555";}}>+ Add event</button>
          </div>
          {todayEvs.length===0?<div style={{color:"#252525",fontSize:13,fontStyle:"italic"}}>No events logged for today.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:6}}>{todayEvs.map(ev=><EvRow key={ev.id} ev={ev} onEdit={e=>setEvModal(e)} onDelete={deleteEvent}/>)}</div>}
        </div>

        {/* Open tasks due today */}
        {(()=>{const tp=pending.filter(t=>t.due===tod()); return(
          <div>
            <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Open Tasks</div>
            {tp.length===0?<div style={{color:"#252525",fontSize:13,fontStyle:"italic"}}>No tasks due today.</div>
              :<div style={{display:"flex",flexDirection:"column",gap:5}}>{tp.map(t=>(
                <div key={t.id} className="trow" style={{display:"flex",alignItems:"center",gap:10,background:"#0f0f0f",border:"1px solid #181818",borderRadius:8,padding:"10px 14px"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:PC[t.priority],flexShrink:0}}/>
                  <div style={{flex:1,fontSize:13.5,color:"#ccc9c0"}}>{t.text}</div>
                  <button onClick={()=>toggleTask(t.id)} style={{width:20,height:20,borderRadius:"50%",border:"1.5px solid #252525",background:"transparent",cursor:"pointer",flexShrink:0,transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#6b9e78";e.currentTarget.style.background="#0a180c";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525";e.currentTarget.style.background="transparent";}}/>
                </div>
              ))}</div>}
          </div>
        );})()}

        {/* Completed today */}
        {(()=>{const ct=tasks.filter(t=>t.done&&t.completedOn===tod()); return ct.length>0&&(
          <div>
            <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Completed today ({ct.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>{ct.map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",opacity:.45}}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6b9e78" strokeWidth="2" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>
                <div style={{fontSize:13,color:"#555",textDecoration:"line-through"}}>{t.text}</div>
              </div>
            ))}</div>
          </div>
        );})()}

        {/* Summary */}
        <div style={{borderTop:"1px solid #181818",paddingTop:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase"}}>End of Day Summary</div>
            <button onClick={genSummary} disabled={sumLoading} style={{background:"#111",border:"1px solid #222",color:"#666",borderRadius:5,padding:"5px 12px",fontSize:11,cursor:sumLoading?"default":"pointer"}}
              onMouseEnter={e=>{if(!sumLoading){e.target.style.background="#1a1a1a";e.target.style.color="#bbb";e.target.style.borderColor="#333";}}}
              onMouseLeave={e=>{e.target.style.background="#111";e.target.style.color="#666";e.target.style.borderColor="#222";}}>
              {sumLoading?"Generating...":summary?"Regenerate":"Generate summary"}
            </button>
          </div>
          {sumLoading&&<div style={{background:"#111",border:"1px solid #1a1a1a",borderRadius:8,padding:"14px 18px"}}><div className="dots"><span/><span/><span/></div></div>}
          {summary&&!sumLoading&&<div style={{background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:8,padding:"14px 16px"}}>
            <div style={{fontSize:13.5,color:"#bbb8b0",lineHeight:1.7}}>{summary.text}</div>
            <div style={{fontSize:11,color:"#2a2a2a",marginTop:10}}>Generated at {fmtT(summary.time)}</div>
          </div>}
          {!summary&&!sumLoading&&<div style={{color:"#252525",fontSize:13,fontStyle:"italic"}}>Tap "Generate summary" at the end of your day.</div>}
        </div>
      </div>}

      {/* ── CHAT ── */}
      {tab==="chat"&&<div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          {msgs.map((m,i)=>(
            <div key={i} className="bubble" style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:4}}>
              <div style={{maxWidth:"82%",background:m.role==="user"?"#181818":"#111",border:`1px solid ${m.role==="user"?"#222":"#1a1a1a"}`,borderRadius:m.role==="user"?"14px 14px 4px 14px":"4px 14px 14px 14px",padding:"11px 15px",fontSize:14,lineHeight:1.65,color:m.role==="user"?"#b8b4ae":"#ccc9c0",whiteSpace:"pre-wrap"}}>{m.content}</div>
              <div style={{fontSize:11,color:"#2a2a2a"}}>{fmtT(m.time)}</div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",alignItems:"flex-start"}}><div style={{background:"#111",border:"1px solid #1a1a1a",borderRadius:"4px 14px 14px 14px",padding:"14px 18px"}}><div className="dots"><span/><span/><span/></div></div></div>}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"0 24px 8px",display:"flex",gap:6,flexWrap:"wrap"}}>
          {["What should I focus on?","I'm feeling overwhelmed","Help me plan my week","Review my commitments"].map(p=>(
            <button key={p} onClick={()=>{setInput(p);inputRef.current?.focus();}} style={{background:"#111",border:"1px solid #1e1e1e",color:"#383838",borderRadius:20,padding:"4px 12px",fontSize:11,cursor:"pointer"}}
              onMouseEnter={e=>{e.target.style.borderColor="#2e2e2e";e.target.style.color="#777";}} onMouseLeave={e=>{e.target.style.borderColor="#1e1e1e";e.target.style.color="#383838";}}>{p}</button>
          ))}
        </div>
        <div style={{padding:"8px 24px 20px",display:"flex",gap:10,alignItems:"flex-end"}}>
          <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!("ontouchstart" in window)){e.preventDefault();send();}}}
            placeholder="What's on your mind..." rows={2}
            style={{flex:1,background:"#111",border:"1px solid #1e1e1e",borderRadius:10,color:"#e8e2d9",padding:"11px 14px",fontSize:14,resize:"none",outline:"none",lineHeight:1.5}}
            onFocus={e=>e.target.style.borderColor="#2a2a2a"} onBlur={e=>e.target.style.borderColor="#1e1e1e"}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"#141414":"#c49a38",border:"none",borderRadius:10,width:42,height:42,cursor:loading||!input.trim()?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.2s"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?"#252525":"#0d0d0d"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>}

      {/* ── TASKS ── */}
      {tab==="tasks"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        <button onClick={()=>setTaskModal("add")} style={{width:"100%",background:"#0f0f0f",border:"1px dashed #1e1e1e",color:"#383838",borderRadius:8,padding:"11px",fontSize:13,cursor:"pointer",marginBottom:20}}
          onMouseEnter={e=>{e.target.style.borderColor="#2e2e2e";e.target.style.color="#666";}} onMouseLeave={e=>{e.target.style.borderColor="#1e1e1e";e.target.style.color="#383838";}}>+ Add task</button>
        {pending.length===0&&done.length===0&&<div style={{textAlign:"center",color:"#252525",fontSize:14,padding:"48px 0"}}>No tasks yet.</div>}
        {pending.length>0&&<div style={{marginBottom:24}}>
          <div style={{fontSize:11,color:"#2e2e2e",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>Open</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {pending.map(t=><TaskRow key={t.id} t={t} onToggle={toggleTask} onEdit={setTaskModal} onDelete={deleteTask}/>)}
          </div>
        </div>}
        {done.length>0&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,color:"#2e2e2e",letterSpacing:"0.08em",textTransform:"uppercase"}}>Done ({done.length})</div>
            <button onClick={()=>setTasks(p=>p.filter(t=>!t.done))} style={{background:"none",border:"none",color:"#2e2e2e",fontSize:11,cursor:"pointer"}}>Clear all</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {done.map(t=>(
              <div key={t.id} className="trow" style={{display:"flex",alignItems:"center",gap:12,background:"#0a0a0a",border:"1px solid #141414",borderRadius:8,padding:"10px 14px",opacity:.45}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#6b9e78",flexShrink:0}}/>
                <div style={{flex:1,fontSize:13,color:"#444",textDecoration:"line-through"}}>{t.text}</div>
                <button onClick={()=>toggleTask(t.id)} style={{background:"#0d1a10",border:"1.5px solid #1a331e",borderRadius:"50%",width:22,height:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#6b9e78" strokeWidth="2" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>
                </button>
                <button className="trow-act" onClick={()=>deleteTask(t.id)} style={{background:"none",border:"none",color:"#222",cursor:"pointer",fontSize:16,opacity:0,transition:"opacity 0.15s",padding:"0 2px",lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
        </div>}
      </div>}

      {/* ── BRAIN DUMP ── */}
      {tab==="dump"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:12,color:"#2e2e2e"}}>No filters, no priorities. Just write.</div>
          <button onClick={addNote} style={{background:"#111",border:"1px solid #1e1e1e",color:"#666",borderRadius:6,padding:"7px 14px",fontSize:12,cursor:"pointer"}}
            onMouseEnter={e=>{e.target.style.borderColor="#2a2a2a";e.target.style.color="#aaa";}} onMouseLeave={e=>{e.target.style.borderColor="#1e1e1e";e.target.style.color="#666";}}>+ New note</button>
        </div>
        {notes.length===0&&<div style={{textAlign:"center",color:"#222",fontSize:14,padding:"60px 0"}}>Nothing here yet.</div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>{notes.map(n=><Note key={n.id} note={n} onUpdate={updateNote} onDelete={deleteNote}/>)}</div>
      </div>}

      {/* ── HISTORY ── */}
      {tab==="history"&&<div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>
        <Cal selected={histDate} onSelect={setHistDate} dots={new Set([...Object.keys(snaps),...events.map(e=>e.date),...tasks.filter(t=>t.completedOn).map(t=>t.completedOn),...tasks.filter(t=>!t.done&&t.due).map(t=>t.due)])}/>
        {!histDate&&<div style={{textAlign:"center",color:"#2a2a2a",fontSize:13,fontStyle:"italic",padding:"20px 0"}}>Select a date to see what happened.</div>}
        {histDate&&(()=>{
          const isFut=histDate>tod();
          const snap=snaps[histDate];
          const dayEvs=events.filter(e=>e.date===histDate).sort((a,b)=>(a.startTime||"").localeCompare(b.startTime||""));
          const dayDone=tasks.filter(t=>t.completedOn===histDate);
          const dayDue=tasks.filter(t=>!t.done&&t.due===histDate).sort((a,b)=>({high:0,medium:1,low:2}[a.priority]-{high:0,medium:1,low:2}[b.priority]));
          const label=new Date(histDate+"T00:00:00").toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"});
          const hasAny=snap||dayEvs.length||dayDone.length||dayDue.length;
          return <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{fontSize:13,color:"#666",fontWeight:500}}>{label}</div>
              {isFut&&<span style={{fontSize:10,color:"#7a9fc2",background:"#0d1520",border:"1px solid #1a3a5a",borderRadius:3,padding:"1px 7px"}}>Upcoming</span>}
            </div>
            {!hasAny&&<div style={{color:"#252525",fontSize:13,fontStyle:"italic"}}>Nothing scheduled for this day.</div>}
            {dayEvs.length>0&&<div>
              <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Events</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>{dayEvs.map(ev=>(
                <div key={ev.id} style={{display:"flex",gap:10,background:"#0f0f0f",border:"1px solid #181818",borderRadius:7,padding:"9px 12px",alignItems:"center"}}>
                  <div style={{width:3,height:28,background:"#7a9fc2",borderRadius:2,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,color:"#ccc9c0"}}>{ev.title}</div>
                    {(ev.startTime||ev.location)&&<div style={{fontSize:11,color:"#3a3a3a",marginTop:2}}>{ev.startTime?`${to12(ev.startTime)}${ev.endTime?`–${to12(ev.endTime)}`:""}`:""}  {ev.location||""}</div>}
                  </div>
                </div>
              ))}</div>
            </div>}
            {dayDue.length>0&&<div>
              <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>{isFut?"Tasks Due":"Tasks Due (open)"}</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>{dayDue.map(t=>(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#0f0f0f",border:"1px solid #181818",borderRadius:7}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:PC[t.priority],flexShrink:0}}/>
                  <div style={{fontSize:13,color:"#888"}}>{t.text}</div>
                </div>
              ))}</div>
            </div>}
            {!isFut&&(snap?.doneTasks?.length||dayDone.length)>0&&<div>
              <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Completed</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>{(snap?.doneTasks||dayDone.map(t=>t.text)).map((text,i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"6px 0"}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6b9e78" strokeWidth="2" strokeLinecap="round"><polyline points="2,6 5,9 10,3"/></svg>
                  <div style={{fontSize:13,color:"#555",textDecoration:"line-through"}}>{text}</div>
                </div>
              ))}</div>
            </div>}
            {!isFut&&snap?.summary&&<div>
              <div style={{fontSize:11,color:"#3a3a3a",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>End of Day Summary</div>
              <div style={{background:"#0f0f0f",border:"1px solid #1c1c1c",borderRadius:8,padding:"12px 14px"}}>
                {snap.goal&&<div style={{fontSize:11,color:"#c49a3888",marginBottom:8}}>Goal: {snap.goal}</div>}
                <div style={{fontSize:13.5,color:"#bbb8b0",lineHeight:1.7}}>{snap.summary.text}</div>
              </div>
            </div>}
          </div>;
        })()}
      </div>}

      {/* ── MODALS ── */}
      {taskModal&&<TaskModal task={taskModal==="add"?null:taskModal} onSave={saveTask} onClose={()=>setTaskModal(null)}/>}
      {evModal&&<EventModal event={evModal==="add"?null:evModal} onSave={saveEvent} onClose={()=>setEvModal(null)}/>}
    </div>
  );
}
