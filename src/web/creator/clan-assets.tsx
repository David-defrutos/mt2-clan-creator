import React from 'react';
import {originalClanIcons,type Draft} from '../../server/creator/model';
import {artTargets} from './art-prompts';
import {artworkGroup,artworkStatus} from './art-state';
import {imageUrl,local,type Language} from './presentation';

export function ClanAssets({draft,rules,items,language,onEdit}:{draft:Draft;rules:any;items:any[];language:Language;onEdit:(id:string,file?:File)=>void}){
 const targets=artTargets(draft,rules,language).filter(target=>target.resource);
 const groups=['identity','frames','banners','champions'];
 const sourceIcons=originalClanIcons(draft,items,rules.officialClanIcons);
 const english=language==='en';
 return <div className="clan-asset-sections">{groups.map(group=><section className="surface" key={group}>
  <h2>{local(rules.simpleArtText['group'+group[0].toUpperCase()+group.slice(1)],language)}</h2>
  <div className="clan-asset-grid">{targets.filter(target=>artworkGroup(target)===group).map(target=>{
   const status=artworkStatus(target,items,rules);
   const original=target.id==='clan-logo'?sourceIcons?.large:target.id.startsWith('clan-')?sourceIcons?.[target.id.slice(5)]:undefined;
   const image=status.preview??original;
   return <article className="clan-asset" key={target.id}>
    {image?<img loading="lazy" src={imageUrl(draft.id,image)} alt={target.label}/>:
     target.id==='clan-logo'?<span className="clan-initials" aria-label={english?'Default clan icon':'Icono predeterminado del clan'}>{draft.name.trim().slice(0,2).toUpperCase()||'?'}</span>:
      <span className="empty-clan-asset">{english?'Default appearance':'Aspecto predeterminado'}</span>}
    <strong>{target.label}</strong>
    <small>{target.width} × {target.height} px</small>
    <label className="upload">{local(rules.labels.changeArt,language)}<input type="file" accept="image/png,image/jpeg,image/webp"
     aria-label={local(rules.labels.changeArt,language)+' · '+target.label}
     onChange={event=>{const file=event.target.files?.[0];if(file)onEdit(target.id,file);event.target.value='';}}/></label>
    <button type="button" className="quiet" onClick={()=>onEdit(target.id)}>{local(rules.aiArtText.title,language)}</button>
   </article>;
  })}</div>
 </section>)}</div>;
}
// 2026-11-21-1332||codex-clan-editor||clan-creator/src/web/creator/clan-assets.tsx||Crear la pantalla Clan assets con miniaturas, tamaños y edición de todas las variantes de interfaz
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/web/creator/clan-assets.tsx||Reusar las categorías traducidas del taller de arte
// 2026-11-21-1336||codex-clan-editor||clan-creator/src/web/creator/clan-assets.tsx||Mostrar el icono de referencia solo cuando los dos campeones proceden del mismo clan oficial
