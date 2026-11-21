import React,{useEffect,useState} from 'react';
import {allCards,type Draft} from '../../server/creator/model';
import {local,request,type Language} from './presentation';
import {ErrorNotice} from './error-notice';
export function PlaytestChecklist({draft,rules,language,persist,onEdit}:{draft:Draft;rules:any;language:Language;persist:()=>Promise<any>;onEdit?:(uid:string)=>void}){const [state,setState]=useState<any>(),[busy,setBusy]=useState(false),[error,setError]=useState<any>(),t=(k:string)=>local(rules.simpleArtText[k],language);useEffect(()=>{request('/projects/'+draft.id+'/local-state').then(setState).catch(setError);},[draft.id,draft.revision]);const checkItems=rules.playtestChecks.filter((c:any)=>c.id!=='spell'||allCards(draft).some(card=>card.kind==='spell')),current=state?.status==='current',checks=current&&state?.playtest?.contentHash===state?.contentHash?state.playtest.checks:{},done=checkItems.filter((c:any)=>checks?.[c.id]).length;async function change(id:string,value:boolean){setBusy(true);setError(undefined);try{await persist();const fresh=await request('/projects/'+draft.id+'/local-state'),previous=fresh.playtest?.contentHash===fresh.contentHash?fresh.playtest.checks:{};setState(await request('/projects/'+draft.id+'/local-state',{playtest:{contentHash:fresh.contentHash,checks:{...previous,[id]:value}}},'PUT'));}catch(e){setError(e);}finally{setBusy(false);}}return <section className="surface playtest-checklist"><h2>{t('playtestTitle')}</h2><p>{t('playtestHelp')}</p>{current&&<strong>{t(done===checkItems.length?'playtestReady':'installedOnly')}</strong>}<p>{t('playtestProgress').replace('{done}',String(done)).replace('{total}',String(checkItems.length))}</p>{!current&&<p className="note">{t('playtestStale')}</p>}{checkItems.map((c:any)=><label key={c.id}><input type="checkbox" disabled={busy||!current} checked={!!checks?.[c.id]} onChange={e=>change(c.id,e.target.checked)}/><span>{local(c.label,language).replace('{champion1}',draft.champions[0].card.name).replace('{champion2}',draft.champions[1].card.name)}</span></label>)}{state?.lastInstall&&<CardNotes draft={draft} rules={rules} language={language} state={state} persist={persist} onSaved={setState} onEdit={onEdit}/>} {error&&<ErrorNotice error={error} rules={rules} language={language}/>}</section>;}
// 2026-11-17-2237||codex-clan-editor||clan-creator/src/web/creator/playtest-checklist.tsx||Guiar y guardar primera prueba manual en partida distinguiéndola de instalación correcta
// 2026-11-17-2241||codex-clan-editor||clan-creator/src\web\creator\playtest-checklist.tsx||Evitar pruebas imposibles de hechizos y no mostrar como instalada una versión pendiente o desinstalada

function CardNotes({draft,rules,language,state,persist,onSaved,onEdit}:{
 draft:Draft;rules:any;language:Language;state:any;persist:()=>Promise<any>;onSaved:(state:any)=>void;onEdit?:(uid:string)=>void;
}){
 const [uid,setUid]=useState(''),[status,setStatus]=useState('untested'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>();
 const t=(key:string)=>local(rules.finishGuide[key],language);
 const cards=allCards(draft).filter(card=>card.name.trim());
 const stored=state.cardNotes?.[uid];
 const editable=state.status==='current';
 function select(id:string){
  setUid(id);setStatus(state.cardNotes?.[id]?.status??'untested');setNote(state.cardNotes?.[id]?.note??'');setError(undefined);
 }
 async function save(){
  setBusy(true);setError(undefined);
  try{
   await persist();
   onSaved(await request('/projects/'+draft.id+'/local-state',{cardTest:{uid,status,note,contentHash:state.contentHash}},'PUT'));
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 return <details className="surface">
  <summary>{t('notes')}</summary>
  <label className="field"><span>{t('card')}</span><select value={uid} disabled={busy} onChange={e=>select(e.target.value)}>
   <option value="">—</option>{cards.map(c=><option key={c.uid} value={c.uid}>{c.name}{state.cardNotes?.[c.uid]?' • '+t(state.cardNotes[c.uid].status):''}</option>)}
  </select></label>
  {uid&&<>
   {stored?.contentHash&&(!editable||stored.contentHash!==state.contentHash)&&<p className="note">{t('oldNote')}</p>}
   <label className="field"><span>{local(rules.finishGuide.testResult,language)}</span><select value={status} disabled={!editable||busy} onChange={e=>setStatus(e.target.value)}>
    {['untested','works','problem'].map(k=><option key={k} value={k}>{t(k)}</option>)}
   </select></label>
   <label className="field"><span>{t('note')}</span><textarea maxLength={1000} disabled={!editable||busy} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <button className="secondary" disabled={!editable||busy||(stored&&stored.contentHash===state.contentHash&&stored.status===status&&stored.note===note.trim())} onClick={save}>{t('saveNote')}</button>
   {onEdit&&<button className="quiet" disabled={busy} onClick={()=>onEdit(uid)}>{local(rules.labels.edit,language)}</button>}
  </>}
  {error!=null&&<ErrorNotice error={error} rules={rules} language={language}/>}
 </details>;
}
// 2026-11-19-0913||codex-clan-editor||clan-creator/src/web/creator/playtest-checklist.tsx||Añadir notas de pruebas y acceso a la edición de la carta desde la revisión
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/web/creator/playtest-checklist.tsx||Permitir guardar la primera nota de una carta
