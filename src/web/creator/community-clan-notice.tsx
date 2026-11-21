import React from 'react';
import {local,type Language} from './presentation';

export function CommunityClanNotice({rules,language}:{rules:any;language:Language}){
 const copy=rules.communityClanText;
 const [before,after]=local(copy.versionNotice,language).split('{simplified}');
 return <p>{before}<strong>{local(copy.versionEmphasis,language)}</strong>{after}<br/>{local(copy.limits,language)}</p>;
}
// 2026-11-21-1243||codex-clan-editor||clan-creator/src/web/creator/community-clan-notice.tsx||Compartir el aviso bilingüe con versión simplificada en negrita
