import React,{useState} from 'react';
import type {CardDraft} from '../../server/creator/model';
import {local,type Language} from './presentation';

export function rewardDestination(card:CardDraft){
 if(card.reward===false)return 'outside';
 if(card.kind==='artifact')return 'artifact';
 return card.kind==='unit'&&card.banner?'banner':'normal';
}

export function RewardsEditor({cards,rules,language,onChange,onEdit}:{cards:CardDraft[];rules:any;language:Language;onChange:(card:CardDraft)=>void;onEdit:(id:string)=>void}){
 const [showPlayer,setShowPlayer]=useState(false);
 const [level,setLevel]=useState(1);
 const t=(key:string)=>local(rules.workshopGuide[key],language);
 const levels=Array.from({length:rules.limits.maxUnlock},(_,i)=>i+1);
 const options=levels.map(n=><option key={n} value={n}>{n}</option>);
 return <section className="surface"><h2>{t('rewards')}</h2>
 <div className="preset-buttons">{['assign','byLevel'].map((key,i)=><button key={key} className={showPlayer===!!i?'primary':'secondary'} aria-pressed={showPlayer===!!i} onClick={()=>setShowPlayer(!!i)}>{local(rules.cardGuidance[key],language)}</button>)}</div>
 <div hidden={showPlayer}>{cards.map(card=>{
   const destination=rewardDestination(card);
   const choices=card.kind==='artifact'?['artifact','outside']:card.kind==='unit'?['normal','banner','outside']:['normal','outside'];
   return <section className="reward-row" key={card.uid} data-review-field={'reward-'+card.uid}><strong>{card.name}</strong>
   <label>{t('where')} <select value={destination} onChange={e=>onChange({...card,reward:e.target.value!=='outside',banner:e.target.value==='banner'})}>{choices.map(c=><option key={c} value={c}>{t(c)}</option>)}</select></label>
   {destination!=='outside'&&<label>{t('fromLevel')} <select value={card.unlockLevel} onChange={e=>onChange({...card,unlockLevel:Number(e.target.value)})}>{options}</select></label>}
   <small>{t(destination)}{destination!=='outside'&&' · '+t('fromLevel')+' '+card.unlockLevel}</small></section>;
 })}
 </div><div hidden={!showPlayer}><h2>{t('playerView')}</h2><label>{t('playerLevel')} <select value={level} onChange={e=>setLevel(Number(e.target.value))}>{options}</select></label>
 {['newAtLevel','already'].map((key,index)=>{
 const group=cards.filter(c=>rewardDestination(c)!=='outside'&&(index?c.unlockLevel<level:c.unlockLevel===level));
 return <section key={key}><h3>{t(key)} ({group.length})</h3>{group.map(c=><div key={c.uid} className="reward-row"><button className="secondary" onClick={()=>onEdit(c.uid)}>{c.name} · {t(rewardDestination(c))}</button><label>{t('fromLevel')} <select value={c.unlockLevel} onChange={e=>onChange({...c,unlockLevel:Number(e.target.value)})}>{options}</select></label></div>)}</section>;
 })}</div></section>;
}
// 2026-11-19-0758||codex-clan-editor||clan-creator/src/web/creator/rewards-editor.tsx||Unir destino de recompensas y vista por nivel reutilizando los campos del mod
// 2026-11-19-0800||codex-clan-editor||clan-creator/src/web/creator/rewards-editor.tsx||Editar nivel directamente desde la vista del jugador
// 2026-11-19-0846||codex-clan-editor||clan-creator/src/web/creator/rewards-editor.tsx||Alternar asignación y vista del jugador desde la cabecera de recompensas
// 2026-11-19-0918||codex-clan-editor||clan-creator/src/web/creator/rewards-editor.tsx||Permitir enfocar la recompensa exacta desde el aviso de borrado
