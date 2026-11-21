import React from 'react';
import {effectTargetsAllFloors,effectTargetTeam} from '../../server/creator/recipe-text';
import type {EffectChoice} from '../../server/creator/model';
import {local,type Language} from './presentation';

export function combatExample(choice:EffectChoice,unit:boolean){
 if(!['armor','damage','heal'].includes(choice.recipe))return [];
 const armor=choice.recipe==='armor';
 const selected=choice.target==='spell_target';
 const targetTeam=effectTargetTeam(choice.target);
 const team=targetTeam==='heroes'?'enemy':'ally';
 const allFloors=effectTargetsAllFloors(choice.target);
 const rows=selected?['chosen','ally','enemy']:['ally','ally','enemy','enemy'];
 return [...rows,...(allFloors?['ally','enemy']:[selected?'ally':team])].map((role,index)=>{
  const upstairs=index>=rows.length;
  const hit=(!upstairs||allFloors)&&(selected?role==='chosen':targetTeam==='both'||
   role===team&&(choice.target.startsWith('all_')||index===rows.indexOf(team)));
  const before=armor?0:choice.recipe==='heal'?5:10;
  const after=!hit?before:armor?choice.amount:choice.recipe==='heal'?Math.min(10,before+choice.amount):Math.max(0,before-choice.amount);
  const label=hit&&!selected&&!choice.target.startsWith('all_')?(unit&&role==='ally'?'caster':!unit?'chosen':role):role;
  return {role:label,index,upstairs,hit,before,after};
 });
}

export function CombatExample({effect,unit,rules,language}:{effect:EffectChoice;unit:boolean;rules:any;language:Language}){
 const rows=combatExample(effect,unit);
 if(!rows.length)return null;
 const label=(key:string)=>local(rules.cardGuidance[key],language);
 return <details className="combat-example"><summary>{label('example')}</summary><p>{label('scenario')}</p>
 <table><thead><tr><th>{label('floorHeading')}</th><th>{local(rules.cardPresentation.types.unit,language)}</th><th>{label(effect.recipe==='armor'?'armor':'hp')}</th></tr></thead>
 <tbody>{rows.map(row=><tr key={row.index}><td>{label(row.upstairs?'above':'floor')}</td><td>{label(row.role)}{['ally','enemy'].includes(row.role)?' '+(1+rows.slice(0,row.index).filter(r=>r.role===row.role&&r.upstairs===row.upstairs).length):''}</td><td>{row.before}{row.hit&&<> → <strong>{row.after}</strong></>}</td></tr>)}</tbody></table></details>;
}
// 2026-11-19-0847||codex-clan-editor||clan-creator/src/web/creator/combat-example.tsx||Mostrar una activación editable de armadura, daño o cura con objetivos por piso
// 2026-11-21-1309||codex-clan-editor||clan-creator/src/web/creator/combat-example.tsx||Mostrar que ambos equipos reciben el efecto en el ejemplo de combate
// 2026-11-21-1312||codex-clan-editor||clan-creator/src/web/creator/combat-example.tsx||Mostrar el efecto en un segundo piso dentro del ejemplo de combate
