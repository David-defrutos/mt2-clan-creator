import {ClanAssets} from './clan-assets';
import {StoneEditor} from './stone-editor';
import {CommunityClanNotice} from './community-clan-notice';
import {AppUpdate} from './app-update';
import {collectionKind,collectionStep,stepForCard} from '../../server/creator/wizard-steps';
import {duplicateCard} from './card-kind';
import {CardActionDialog,RewardRemoval} from './card-actions';
import {ChangeList} from './change-list';
import {cardChanges} from '../../server/creator/play-changes';
import {RewardsEditor} from './rewards-editor';
import {ArtStudio} from './art-studio';
import {GuideLink,GuideProvider} from './guide-access';
import {GuidePage} from './guide-page';
import {guideTopic} from './guide-catalog';
import {NumberFeedbackProvider} from './number-input';
import {NewCardWizard} from './new-card-wizard';
import {RecoveryTools} from './recovery-tools';
import {ClanOverview} from './clan-overview';
import {BalanceAdvice} from './balance-advice';
import {collectionViews as normalizeCollectionViews,collectionView,type CollectionView} from '../../server/creator/collection-view';
import {ReplacementDialog,replaceCard,type ReplacementRequest,type ReplacementMode} from './replacement';
import {ExpansionSettings,ExpansionSummary,loadExpansionChoices,expansionCompatible,type ExpansionChoices} from './expansions';
import {editingView} from '../../server/creator/navigation-state';
import {draftIssues} from '../../server/creator/validation';
import type {ArtworkPlacement} from './artwork-import';
import type {ArtworkPurpose} from '../../server/creator/image-framing';
import {ErrorNotice} from './error-notice';
import {InstallStatus} from './install-status';
import {restoreRemovedCard} from '../../server/creator/workflow-state';
import {WizardNavigation,wizardStepOrder} from './wizard-navigation';
import {copyOfficialMechanics} from './copy-mechanics';
import {CardCollection} from './card-collection';
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Draft,CardDraft} from '../../server/creator/model';
import {local,request,type Language} from './presentation';
import {Field,CardPreview,ExamplePicker} from './components';
import {CardEditor,PathEditor} from './editors';
import {CardJson} from './card-json';
import {wizardProgress} from './progress';
import {Welcome} from './welcome';
import {ReviewPlay} from './local-play';
import {Statistics,StepStatistics} from './statistics';
import {copyChampionPath} from './champion-copy';
import './style.css';
const uid=()=>crypto.randomUUID();
function App(){
 const standaloneGuide=guideTopic(new URLSearchParams(window.location.search).get('guide'));
 const [overviewQuery,setOverviewQuery]=useState('');
 const [returnOverview,setReturnOverview]=useState(false);
 const [variant,setVariant]=useState<{id:string;source:CardDraft}>();

 const [artStudioTarget,setArtStudioTarget]=useState<string>(),[artInitialFile,setArtInitialFile]=useState<File>();
 const [creation,setCreation]=useState<CardDraft['kind']>(),[recoveryOpen,setRecoveryOpen]=useState(false),[overviewOpen,setOverviewOpen]=useState(false),[savedCollections,setSavedCollections]=useState<Record<string,CollectionView>>({});
 const [errorContext,setErrorContext]=useState('operation'),[focusIssue,setFocusIssue]=useState<any>(),[removedCard,setRemovedCard]=useState<{card:CardDraft;index:number}>(),[installState,setInstallState]=useState<any>();const [notice,setNotice]=useState('');const [statisticsOpen,setStatisticsOpen]=useState(false);
 const [config,setConfig]=useState<any>(),[language,setLanguage]=useState<Language>(()=>{try{return localStorage.getItem('creator-language')==='es'?'es':'en';}catch{return 'en';}}),[projects,setProjects]=useState<any[]>([]),[draft,setDraft]=useState<Draft>(),[error,setError]=useState<any>(),[saving,setSaving]=useState(false),[busy,setBusy]=useState(false),[savedAt,setSavedAt]=useState(''),[changes,setChanges]=useState(0),[editing,setEditing]=useState<string>(),[picker,setPicker]=useState<{kind:string|undefined;champion?:boolean;pathsOnly?:boolean;mechanicsOnly?:boolean;compareLabel?:string;replacing?:boolean;pick:(card:CardDraft,detail?:any)=>void}>(),[runtime,setRuntime]=useState<any>(),[result,setResult]=useState<any>();
 const history=useRef<Draft[]>([]),future=useRef<Draft[]>([]);const [undoCount,setUndoCount]=useState(0),[redoCount,setRedoCount]=useState(0);
 const latest=useRef<Draft|undefined>(undefined),generation=useRef(0),savedGeneration=useRef(0),chain=useRef<Promise<any>>(Promise.resolve());
 const [replacement,setReplacement]=useState<ReplacementRequest>(),[pathLevel,setPathLevel]=useState(0),[viewReady,setViewReady]=useState(false),[expansions,setExpansions]=useState<ExpansionChoices>({owned:[],compatibleOnly:false});
 const [details,setDetails]=useState<Record<string,any>>({});
 const t=(key:string)=>local(config?.rules.labels[key],language)||key;
 useEffect(()=>{Promise.all([request('/creator'),standaloneGuide?Promise.resolve([]):request('/projects')]).then(([c,p])=>{setConfig(c);setProjects(p);setExpansions(loadExpansionChoices(c.rules));}).catch(e=>{setErrorContext('startup');setError(e);});},[]);
 useEffect(()=>{try{localStorage.setItem('creator-language',language);}catch{}document.documentElement.lang=language;},[language]);
 useEffect(()=>{function before(e:BeforeUnloadEvent){if(generation.current>savedGeneration.current){e.preventDefault();e.returnValue='';}}window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[]);
 useEffect(()=>{if(!draft||savedGeneration.current>=generation.current)return;const timer=setTimeout(()=>{persist().catch(()=>{});},700);return()=>clearTimeout(timer);},[changes,draft?.id]);
 function load(d:Draft,state?:any){setOverviewQuery('');setReturnOverview(false);setVariant(undefined);setArtInitialFile(undefined);setArtStudioTarget(undefined);setStatisticsOpen(false);setCreation(undefined);setRecoveryOpen(false);setOverviewOpen(false);setSavedCollections(normalizeCollectionViews(state?.collections,config.rules));const view=editingView(d,state?.view,config.rules.steps);d={...d,step:view.step};setPathLevel(view.level);setViewReady(true);history.current=[];future.current=[];setUndoCount(0);setRedoCount(0);setChanges(0);latest.current=d;setDraft(d);generation.current=0;savedGeneration.current=0;setSavedAt(d.updatedAt);setEditing(view.editing);setResult(undefined);setError('');setFocusIssue(undefined);setRemovedCard(undefined);setInstallState(undefined);}
 function update(fn:(d:Draft)=>Draft,remember=true){if(!latest.current)return;if(remember){setFocusIssue(undefined);history.current=[...history.current,structuredClone(latest.current)].slice(-(config?.rules.usability?.undoLimit??30));future.current=[];setUndoCount(history.current.length);setRedoCount(0);}const next=fn(latest.current);latest.current=next;setDraft(next);generation.current++;setChanges(generation.current);setResult(undefined);}
 function restore(redo=false){if(!latest.current)return;setRemovedCard(undefined);setFocusIssue(undefined);const from=redo?future:history,to=redo?history:future,snapshot=from.current.pop();if(!snapshot)return;to.current.push(structuredClone(latest.current));const current=latest.current;update(()=>({...snapshot,revision:current.revision,updatedAt:current.updatedAt}),false);setUndoCount(history.current.length);setRedoCount(future.current.length);setEditing(undefined);}
 function persist(){const next=chain.current.catch(()=>{}).then(async()=>{if(!latest.current||savedGeneration.current>=generation.current)return latest.current;setSaving(true);const snapshot=structuredClone(latest.current),version=generation.current;try{const saved=await request<Draft>('/projects/'+snapshot.id,snapshot,'PUT');latest.current={...latest.current!,revision:saved.revision,updatedAt:saved.updatedAt};setDraft(d=>d?.id===saved.id?{...d,revision:saved.revision,updatedAt:saved.updatedAt}:d);savedGeneration.current=version;setSavedAt(saved.updatedAt);setError('');return latest.current;}catch(e){setErrorContext('save');setError(e);throw e;}finally{setSaving(false);}});chain.current=next;return next;}
 async function action(fn:()=>Promise<void>){setBusy(true);setErrorContext('operation');setError('');try{await fn();}catch(e){setError(e);}finally{setBusy(false);}}
 async function restored(copy:Draft){await action(async()=>{setProjects(await request('/projects'));load(copy);setNotice(local(config.rules.usabilityText.restored,language));});}
 async function open(id:string,resumeCard=false){await action(async()=>{const [d,state]=await Promise.all([request<Draft>('/projects/'+id),request('/projects/'+id+'/local-state')]);load(d,state);if(resumeCard)setCreation(d.pendingCard?.card.kind);});}
 async function fresh(){await action(async()=>load(await request('/projects',{})));}
 async function exit(){await action(async()=>{await persist();if(latest.current)await request('/projects/'+latest.current.id+'/local-state',{view:{step:latest.current.step,editing,level:pathLevel},collections:savedCollections},'PUT');setProjects(await request('/projects'));latest.current=undefined;setStatisticsOpen(false);setOverviewOpen(false);setDraft(undefined);setEditing(undefined);setViewReady(false);});}
 async function navigate(step:number){setEditing(undefined);update(d=>({...d,step}),false);await action(async()=>{await persist();});window.scrollTo({top:0,behavior:'smooth'});}
 useEffect(()=>{if(!draft)return;let active=true;request('/projects/'+draft.id+'/local-state').then(value=>{if(active)setInstallState(value);}).catch(()=>{});return()=>{active=false;};},[draft?.id,draft?.revision]);
 async function repairIssue(issue:any){await navigate(issue.step);if(issue.uid&&!latest.current?.champions.some(c=>c.card.uid===issue.uid))setEditing(issue.uid);setFocusIssue(issue);}
 useEffect(()=>{if(!focusIssue)return;let attempts=0,node:HTMLElement|null=null,remove:any;const timer=setInterval(()=>{const field=document.querySelector<HTMLElement>('.wizard [data-review-field="'+CSS.escape(focusIssue.field??'name')+'"]');if(!field){if(++attempts>50)clearInterval(timer);return;}const input=field.querySelector<HTMLElement>('input,select,textarea,[role="combobox"]')??field.querySelector<HTMLElement>('button')??field;if(input.matches(':disabled'))return;clearInterval(timer);node=field;field.classList.add('review-highlight');input.focus();field.scrollIntoView({block:'center',behavior:'smooth'});remove=setTimeout(()=>field.classList.remove('review-highlight'),8000);},80);return()=>{clearInterval(timer);clearTimeout(remove);node?.classList.remove('review-highlight');};},[focusIssue,editing,draft?.step]);
 useEffect(()=>{if(!draft||!viewReady)return;const id=draft.id,view={step:draft.step,editing,level:pathLevel};const timer=setTimeout(()=>request('/projects/'+id+'/local-state',{view},'PUT').catch(()=>{}),250);return()=>clearTimeout(timer);},[draft?.id,draft?.step,editing,pathLevel,viewReady]);
 useEffect(()=>{if(!draft||!viewReady)return;const timer=setTimeout(()=>request('/projects/'+draft.id+'/local-state',{collections:savedCollections},'PUT').catch(()=>{}),250);return()=>clearTimeout(timer);},[draft?.id,savedCollections,viewReady]);
 function changeExpansions(value:ExpansionChoices){setExpansions(value);try{localStorage.setItem('creator-expansions',JSON.stringify(value));}catch{}}
 const [rewardRemoval,setRewardRemoval]=useState<CardDraft>();
 const [comparison,setComparison]=useState<{card:CardDraft;other:CardDraft;detail:any}>();
 const finish=(key:string)=>local(config.rules.finishGuide[key],language);
 function compareCard(card:CardDraft){
  setPicker({kind:card.kind,compareLabel:finish('compare'),pick:(other,detail)=>{setPicker(undefined);setComparison({card,other,detail});}});
 }
 function requestRemoval(card:CardDraft){if(card.reward!==false)setRewardRemoval(card);else removeCard(card);}
 function removeCard(card:CardDraft,replacement?:string){setRewardRemoval(undefined);
  if(replacement){
   update(d=>({...d,cards:d.cards.filter(c=>c.uid!==card.uid).map(c=>c.uid===replacement?{...c,reward:true,unlockLevel:card.unlockLevel,banner:card.banner}:c)}));
   return;
  }
  setRemovedCard({card:structuredClone(card),index:latest.current!.cards.findIndex(c=>c.uid===card.uid)});update(d=>({...d,cards:d.cards.filter(c=>c.uid!==card.uid)}));}
 function undoRemoval(){if(!removedCard)return;update(d=>restoreRemovedCard(d,removedCard.card,removedCard.index));setRemovedCard(undefined);}
 function findCard(id:string){return draft&&[...draft.champions.map(c=>c.card),...draft.starters,...draft.cards].find(c=>c.uid===id);}
 function setCard(card:CardDraft){if(latest.current?.champions.some(c=>c.card.uid===card.uid))card={...card,cost:0};update(d=>({...d,champions:d.champions.map(c=>c.card.uid===card.uid?{...c,card}:c),starters:d.starters.map(c=>c.uid===card.uid?card:c),cards:d.cards.map(c=>c.uid===card.uid?card:c)}));}
 function addCollectionCard(card:CardDraft,detail:any,completePending=false){
  const current=latest.current!;
  const copy={...card,uid:current.cards.some(existing=>existing.uid===card.uid)?uid():card.uid};
  if(copy.kind==='unit'&&copy.reward!==false&&current.cards.filter(existing=>existing.kind==='unit'&&existing.banner).length<2)copy.banner=true;
  if(detail)setDetails(details=>({...details,[detail.example.id]:detail}));
  update(d=>({...d,step:collectionStep(config.rules.steps,copy.kind),
   pendingCard:completePending?undefined:d.pendingCard,cards:[...d.cards,copy]}));
  setEditing(copy.uid);
 }
 function copyCollectionExample(kind:CardDraft['kind']){
  setPicker({kind,pick:(card,detail)=>{
   addCollectionCard(card,detail);
   setPicker(undefined);
   window.scrollTo({top:0});
  }});
 }
 function chooseFor(card:CardDraft){const champion=latest.current!.champions.some(c=>c.card.uid===card.uid);setPicker({kind:card.kind,champion,replacing:!!(card.name.trim()||card.templateId),pick:(copy,detail)=>{const apply=(mode:ReplacementMode)=>{const path=champion&&mode!=='mechanics'?copyChampionPath(detail,language):undefined;setDetails(d=>({...d,[detail.example.id]:detail}));const next=replaceCard(card,copy,detail,mode,config.rules);update(d=>({...d,champions:d.champions.map(c=>c.card.uid===card.uid?{...c,card:{...next,cost:0,pathInTree:!!path},paths:path?[path,...c.paths.slice(1)]:c.paths}:c),starters:d.starters.map(c=>c.uid===card.uid?next:c),cards:d.cards.map(c=>c.uid===card.uid?next:c)}));};setPicker(undefined);if(card.name.trim()||card.templateId)setReplacement({currentName:card.name,nextName:copy.name,mechanics:!!detail.example.official,current:preview(card,true),result:mode=><CardPreview card={replaceCard(card,copy,detail,mode,config.rules)} template={detail} config={config} language={language} projectId={draft!.id} small/>,apply});else apply('all');}});}
 function chooseMechanics(card:CardDraft){setPicker({kind:card.kind,mechanicsOnly:true,pick:(copy,detail)=>{setPicker(undefined);setReplacement({currentName:card.name,nextName:copy.name,mechanics:true,effectsOnly:true,current:preview(card,true),result:mode=><CardPreview card={replaceCard(card,copy,detail,mode,config.rules)} template={detail} config={config} language={language} projectId={draft!.id} small/>,apply:()=>{setDetails(d=>({...d,[detail.example.id]:detail}));setCard(replaceCard(card,copy,detail,'mechanics',config.rules));}});}});}
 function replacePath(ci:number,pi:number,path:any){const current=latest.current!.champions[ci].paths[pi],apply=()=>update(d=>({...d,champions:d.champions.map((c,i)=>i===ci?{...c,paths:c.paths.map((p,j)=>j===pi?path:p)}:c)}));if(current.name.trim()||current.levels.some(l=>l.native||l.effects.length))setReplacement({currentName:current.name,nextName:path.name,path:true,apply});else apply();}
 function choosePath(ci:number,pi:number){setPicker({kind:'unit',champion:true,pathsOnly:true,pick:(_copy,detail)=>{const path=copyChampionPath(detail,language);if(!path)return;setDetails(d=>({...d,[detail.example.id]:detail}));setPicker(undefined);replacePath(ci,pi,path);}});}
 function upload(file:File,_onSave:(asset:string,placement?:ArtworkPlacement)=>void,purpose:ArtworkPurpose='card',_placement?:ArtworkPlacement){setArtInitialFile(file);setArtStudioTarget(purpose==='icon'?'clan-logo':(purpose==='character'?'character:':'card:')+(latest.current?.pendingCard?.card.uid??''));}


 useEffect(()=>{if(!draft)return;const cards=[...draft.champions.map(c=>c.card),...draft.starters,...draft.cards];for(const id of [...new Set([...cards.map(c=>c.templateId),...draft.champions.flatMap(c=>c.paths.flatMap(p=>p.levels.map(l=>l.native?.templateId)))].filter(Boolean))])if(id&&!details[id])request('/examples/'+id+'?language='+language).then(value=>setDetails(d=>({...d,[id]:value}))).catch(e=>setError(e));},[draft?.id,changes]);
 function preview(card:CardDraft,small=false){return <CardPreview card={card} template={details[card.templateId??'']} config={config} language={language} projectId={draft!.id} small={small}/>;}
 function cardEditor(card:CardDraft){
 const championIndex=draft!.champions.findIndex(champion=>champion.card.uid===card.uid);
 const detail=details[card.templateId??''];
 const initialUpgrade=detail?.example?.championPath?.localUpgradeId;
 const origin=card.pathInTree&&initialUpgrade&&draft!.champions[championIndex]?.paths.findIndex(path=>path.levels.some(level=>level.native?.templateId===card.templateId&&level.native?.upgradeId===initialUpgrade));
 const pathIndex=typeof origin==='number'?origin:-1;
 const onPathStats=pathIndex<0?undefined:async()=>{
  const stepIndex=config.rules.steps.findIndex((step:any)=>step.type==='path'&&step.index[0]===championIndex&&step.index[1]===pathIndex);
  if(stepIndex<0)return;
  await navigate(stepIndex);
  setPathLevel(draft!.champions[championIndex].paths[pathIndex].levels.findIndex(level=>level.native?.upgradeId===initialUpgrade&&level.native?.templateId===card.templateId));
 };
 return <><CardEditor onPathStats={onPathStats} onCompare={draft!.cards.some(c=>c.uid===card.uid)&&config.catalog.items.some((e:any)=>e.kind===card.kind&&e.official)?()=>compareCard(card):undefined} variantName={variant?.id===card.uid} key={card.uid} card={card} template={details[card.templateId??'']} config={config} language={language} projectId={draft!.id} champion={draft!.champions.some(c=>c.card.uid===card.uid)} championDraft={draft!.champions.find(c=>c.card.uid===card.uid)} details={details} onArtworkHelp={()=>setArtStudioTarget('card:'+card.uid)} starter={draft!.starters.some(c=>c.uid===card.uid)} issues={liveIssues.filter(i=>i.uid===card.uid)} onChange={setCard} onChoose={()=>chooseFor(card)} onChooseMechanics={()=>chooseMechanics(card)} onUpload={(file,_save,purpose)=>{setArtInitialFile(file);setArtStudioTarget((purpose==='character'?'character:':'card:')+card.uid);}}/><CardJson key={card.uid} projectId={draft!.id} uid={card.uid} name={card.name||t('name')} persist={persist} rules={config.rules} language={language}/></>;}
 async function editReward(c:CardDraft){setStatisticsOpen(false);await navigate(collectionStep(config.rules.steps,c.kind));setEditing(c.uid);}
 const liveIssues=draft?draftIssues(draft,config.rules.steps,id=>details[id]?.example):[];const progress=draft&&config?wizardProgress(draft,config.rules.steps,liveIssues):undefined;const step=config?.rules.steps[draft?.step??0],active=editing?findCard(editing):undefined;
 async function prepare(playable:boolean){await action(async()=>{const saved=await persist();setResult(await request('/projects/'+draft!.id+'/export',{revision:saved!.revision,playable}));});}
 const navigationSteps=draft&&config?wizardStepOrder(draft,config.rules):[],navigationPosition=draft?navigationSteps.indexOf(draft.step):-1;
 if(!config)return <main className="loading"><h1>MT2 Clan Creator</h1>{error?<ErrorNotice error={error} rules={{}} language={language} onRetry={()=>location.reload()}/>:<p>{language==='es'?'Cargando el editor…':'Loading the creator…'}</p>}</main>;
 if(standaloneGuide)return <GuidePage request={{topic:standaloneGuide}} rules={config.rules} language={language}/>;
 const community=config.rules.communityClanTemplates?.find((clan:{id:string})=>clan.id===draft?.communityTemplate);
 return <GuideProvider rules={config.rules} language={language}><NumberFeedbackProvider language={language} messages={config.rules.round4Text}><><header className="top"><div className="top-brand"><button className="brand" onClick={()=>draft?exit():undefined}><span className="brand-mark">✦</span><span>CLAN CREATOR<small>MONSTER TRAIN 2</small></span></button><AppUpdate version={config.appVersion} rules={config.rules.appUpdate} language={language}/></div><div className="top-right"><GuideLink request={{topic:'effects'}} global/><button className="quiet" onClick={()=>{setOverviewOpen(false);setStatisticsOpen(true);}}>{t('statistics')}</button>{draft&&<><button className="quiet" disabled={busy} onClick={()=>setArtStudioTarget('clan-logo')}>{local(config.rules.aiArtText.title,language)}</button><button className="quiet" disabled={busy} onClick={()=>{setStatisticsOpen(false);setOverviewOpen(true);}}>{local(config.rules.round4Text.overview,language)}</button><button className="quiet" disabled={busy} onClick={()=>setRecoveryOpen(true)}>{local(config.rules.round4Text.history,language)}</button></>}{draft&&<InstallStatus state={installState} rules={config.rules} language={language} disabled={busy} onOpen={()=>navigate(config.rules.steps.length-1)}/>} {draft&&<span className={'save-state '+(error?'error':'')}>{saving?t('saving'):generation.current>savedGeneration.current?t('saving'):t('saved')}</span>}<label className="language">{t('language')}<select aria-label={t('language')} value={language} onChange={e=>setLanguage(e.target.value as Language)}><option value="es">Español</option><option value="en">English</option></select></label>{draft&&<><button className="quiet history-button" disabled={busy||!undoCount} onClick={()=>restore()} title={t('undo')}>↶ {t('undo')}</button><button className="quiet history-button" disabled={busy||!redoCount} onClick={()=>restore(true)} title={t('redo')}>↷ {t('redo')}</button></>}{draft&&<button className="quiet" disabled={busy} onClick={exit}>{t('exit')}</button>}</div></header>
 {notice&&<div className="restore-notice" role="status">{notice}<button className="quiet" onClick={()=>setNotice('')}>{local(config.rules.usabilityText.close,language)}</button></div>}{error&&<ErrorNotice error={error} rules={config.rules} language={language} onRetry={errorContext==='startup'?()=>location.reload():errorContext==='save'?()=>action(async()=>{await persist();}):undefined}/>}{removedCard&&draft&&!draft.cards.some(c=>c.uid===removedCard.card.uid)&&<div className="card-delete-notice" role="status"><span>{local(config.rules.beginnerText.cardRemoved,language).replace('{name}',removedCard.card.name||t('name'))}</span><button onClick={undoRemoval}>{local(config.rules.beginnerText.undoRemoval,language)}</button><button className="quiet" onClick={()=>setRemovedCard(undefined)}>{local(config.rules.usabilityText.close,language)}</button></div>}
 {statisticsOpen?<Statistics onEdit={editReward} rules={config.rules} language={language} draft={draft} onBack={()=>setStatisticsOpen(false)}/>:overviewOpen&&draft?<ClanOverview query={overviewQuery} onQuery={setOverviewQuery} draft={draft} config={config} details={details} language={language} onBack={()=>setOverviewOpen(false)} onEdit={async(index,id)=>{setReturnOverview(true);setOverviewOpen(false);await navigate(index);if(id&&!draft.champions.some(c=>c.card.uid===id))setEditing(id);}}/>:!draft?<Welcome expansions={expansions} onExpansions={changeExpansions} rules={config.rules} catalog={config.catalog.items} language={language} projects={projects} busy={busy} onNew={fresh} onRestored={restored} onOfficial={(clanId:string)=>action(async()=>load(await request('/projects/from-official',{clanId,language})))} onCommunity={(clanId:string)=>action(async()=>load(await request('/projects/from-community',{clanId,language})))} onOpen={open} onDuplicate={(id:string)=>action(async()=>load(await request('/projects/'+id+'/duplicate',{language})))} onProjectsChanged={()=>action(async()=>setProjects(await request('/projects')))}/>:<div className="workspace"><WizardNavigation draft={draft} rules={config.rules} language={language} progress={progress} busy={busy} onNavigate={navigate} onFull={()=>update(d=>({...d,guidedMode:undefined}))}/><main className="wizard"><div className="step-top"><span className="eyebrow">{t('step')} {navigationPosition+1} / {navigationSteps.length}</span><h1>{active?t('edit')+' · '+(active.name||t('name')):local(step.title,language)}</h1><p>{active?t('effectHelp'):local(step.help,language)}</p>{community&&step.type==='identity'&&<div className="note"><strong>{local(config.rules.communityClanText.loaded,language).replace('{clan}',community.name).replace('{version}',community.version)}</strong><CommunityClanNotice rules={config.rules} language={language}/></div>}{(focusIssue?.message||focusIssue?.messageEn)&&<p className="review-fix-hint" role="alert">{language==='es'?focusIssue.message:focusIssue.messageEn}</p>}{liveIssues.some(i=>i.step===draft.step)&&<div className="inline-issues"><strong>{local(config.rules.guidedText.fixNow,language)}</strong>{liveIssues.filter(i=>i.step===draft.step).map((i,n)=><button className="quiet" key={n} onClick={()=>repairIssue(i)}>{language==='es'?i.message:i.messageEn} →</button>)}</div>}</div>{step.type!=='review'&&<StepStatistics rules={config.rules} language={language} draft={draft} step={step} onOpen={()=>setStatisticsOpen(true)}/>}{draft.pendingCard&&<section className="surface pending-card-banner"><strong>{local(config.rules.simpleArtText.pendingTitle,language)} · {draft.pendingCard.card.name||t('name')}</strong><p>{local(config.rules.simpleArtText.pendingHelp,language)}</p><button className="primary" onClick={()=>setCreation(draft.pendingCard!.card.kind)}>{local(config.rules.simpleArtText.resumeCard,language)}</button></section>}<fieldset disabled={busy} className="main-fields">
 {returnOverview&&!active&&<button className="secondary" onClick={()=>{setReturnOverview(false);setOverviewOpen(true);}}>{local(config.rules.workshopGuide.backResults,language)}</button>}{active?<><button className="back-link" onClick={()=>{setEditing(undefined);if(returnOverview){setReturnOverview(false);setOverviewOpen(true);}persist().catch(()=>{});}}>← {returnOverview?local(config.rules.workshopGuide.backResults,language):t(active.kind === 'unit' && step.type === 'collection' && step.index === 'unit' ? 'finishUnitEdit' : 'finishEdit')}</button>{variant?.id===active.uid&&<section className="surface"><strong>{local(config.rules.workshopGuide.variant,language)} {variant.source.name}</strong><ChangeList items={cardChanges(variant.source,active)} rules={config.rules} language={language}/></section>}{cardEditor(active)}{active.kind==='unit'&&step.type==='collection'&&step.index==='unit'&&<button className="primary large" onClick={()=>action(async()=>{await persist();setEditing(undefined);setCreation('unit');window.scrollTo({top:0,behavior:'smooth'});})}>{t('saveAddAnother')}</button>}</>:step.type==='identity'?<section className="surface form-narrow"><Field label={t('name')} help={t('nameHelp')} reviewField="name" problem={liveIssues.find(i=>i.step===0)?.[language==='es'?'message':'messageEn']}><input value={draft.name} maxLength={80} placeholder={language==='es'?'Ejemplo: Los guardianes del alba':'Example: Guardians of the Dawn'} onChange={e=>update(d=>({...d,name:e.target.value}))}/></Field><Field label={t('description')}><textarea value={draft.description} maxLength={3000} placeholder={language==='es'?'¿Qué hace especial a tu clan?':'What makes your clan special?'} onChange={e=>update(d=>({...d,description:e.target.value}))}/></Field>{draft.cards.length>0?<button className="secondary" onClick={()=>setOverviewOpen(true)}>{local(config.rules.openClan.browse,language)}</button>:<div className="note">{t('blankHelp')}</div>}</section>:step.type==='champion'?cardEditor(draft.champions[step.index].card):step.type==='path'?<PathEditor champions={draft.champions} champion={draft.champions[step.index[0]]} championIndex={step.index[0]} pathIndex={step.index[1]} level={pathLevel} onLevel={setPathLevel} onNavigate={navigate} onReplace={path=>replacePath(step.index[0],step.index[1],path)} projectId={draft.id} details={details} onChoose={()=>choosePath(step.index[0],step.index[1])} path={draft.champions[step.index[0]].paths[step.index[1]]} onChange={path=>update(d=>({...d,champions:d.champions.map((c,i)=>i===step.index[0]?{...c,paths:c.paths.map((p,j)=>j===step.index[1]?path:p)}:c)}))} config={config} language={language}/>:step.type==='starters'?<div className="starter-grid">{draft.starters.map((c,i)=><section className="surface" key={c.uid}><span className="eyebrow">{t('starterFor')} {draft.champions[i].card.name||i+1}</span>{preview(c,true)}<button className="primary" onClick={()=>setEditing(c.uid)}>{t('edit')}</button><button className="secondary" onClick={()=>chooseFor(c)}>{t(c.name.trim()||c.templateId?'replaceExample':'examples')}</button></section>)}</div>:step.type==='collection'?<CardCollection key={step.id} view={savedCollections[step.id]??collectionView(undefined,config.rules.collectionSearch.pageSize)} onView={value=>setSavedCollections(previous=>({...previous,[step.id]:value}))} details={details} cards={draft.cards} kind={step.index} rules={config.rules} language={language} t={t} preview={c=>preview(c,true)} onExample={copyCollectionExample} onEmpty={()=>setCreation(draft.pendingCard?.card.kind??step.index)} onEdit={c=>setEditing(c.uid)} onDuplicate={c=>{const copy=duplicateCard(c,uid(),t('cloneName'));update(d=>({...d,cards:[...d.cards,copy]}));setVariant({id:copy.uid,source:structuredClone(c)});setEditing(copy.uid);}} onRemove={requestRemoval}/>:step.type==='rewards'?<RewardsEditor cards={draft.cards} rules={config.rules} language={language} onChange={setCard} onEdit={setEditing}/>:step.type==='art'?<><section className="surface"><h2>{local(config.rules.aiArtText.title,language)}</h2><p>{local(config.rules.aiArtText.intro,language)}</p><button className="primary" onClick={()=>setArtStudioTarget('clan-logo')}>{local(config.rules.aiArtText.title,language)}</button></section><div className="card-grid">{[...draft.champions.map(c=>c.card),...draft.starters,...draft.cards].map(c=><section className="surface" key={c.uid}>{preview(c,true)}<button className="secondary" onClick={()=>setEditing(c.uid)}>{t('edit')}</button></section>)}</div></>:step.type==='stones'?<StoneEditor draft={draft} rules={config.rules} language={language} onChange={update}/>:step.type==='clan-assets'?<ClanAssets draft={draft} rules={config.rules} items={config.catalog.items} language={language} onEdit={(id,file)=>{setArtInitialFile(file);setArtStudioTarget(id);}}/>:step.type==='review'?<><ReviewPlay onEditCard={id=>{
 const card=findCard(id);if(!card)return;
 const target=stepForCard(config.rules.steps,draft,card);
 void repairIssue({step:target,uid:id,field:'name'});
 }} onContinueEditing={()=>navigate(collectionStep(config.rules.steps,'unit'))} key={draft.id} rules={config.rules} language={language} draft={draft} issues={liveIssues} onIssue={repairIssue} persist={persist} onInstalled={()=>request('/projects/'+draft.id+'/local-state').then(setInstallState).catch(()=>{})} onRestored={restored}/><details className="surface"><summary>{local(config.rules.firstPlayText.optionalReview,language)}</summary><BalanceAdvice onEdit={editReward} draft={draft} rules={config.rules} language={language}/><ExpansionSettings rules={config.rules} language={language} value={expansions} onChange={changeExpansions}/><ExpansionSummary draft={draft} items={config.catalog.items} rules={config.rules} language={language} choices={expansions}/></details></>:null}
 </fieldset>{busy&&<p className="working" role="status">{t('working')}</p>}<footer className="wizard-footer"><button className="secondary" disabled={busy||navigationPosition===0} onClick={()=>navigate(navigationSteps[navigationPosition-1])}>← {t('back')}</button><span>{saving?t('saving'):savedAt?t('saved')+' · '+new Date(savedAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'}):''}</span>{navigationPosition<navigationSteps.length-1&&<button className="primary" disabled={busy} onClick={()=>navigate(navigationSteps[navigationPosition+1])}>{step.optional&&!draft.cards.some(c=>collectionKind(c.kind)===step.index)?t('skip'):t('next')} →</button>}</footer></main></div>}
 {creation&&draft&&<NewCardWizard persist={persist} onPendingChange={pendingCard=>update(d=>({...d,pendingCard}),false)} onDiscard={async()=>{update(d=>({...d,pendingCard:undefined}));setCreation(undefined);await persist();}} clan={draft} onClanChange={update} kind={creation} config={config} language={language} projectId={draft.id} expansions={expansions} onExpansions={changeExpansions} onClose={async()=>{setCreation(undefined);await persist();}} onCreate={(card,detail)=>{addCollectionCard(card,detail,true);setCreation(undefined);}} onUpload={upload}/>}
 {artStudioTarget!==undefined&&draft&&<ArtStudio initialFile={artInitialFile} persist={persist} draft={draft} initialTarget={artStudioTarget} rules={config.rules} items={config.catalog.items} language={language} onChange={update} onClose={()=>{setArtStudioTarget(undefined);setArtInitialFile(undefined);}}/>}
 {recoveryOpen&&draft&&<RecoveryTools draft={draft} persist={persist} rules={config.rules} language={language} onClose={()=>setRecoveryOpen(false)} onRecovered={copy=>{load(copy);setNotice(local(config.rules.round4Text.recovered,language));}}/>}
 {rewardRemoval&&draft&&<RewardRemoval card={rewardRemoval} cards={draft.cards} rules={config.rules} language={language} onRewards={()=>{setRewardRemoval(undefined);void repairIssue({step:config.rules.steps.findIndex((step:any)=>step.type==='rewards'),field:'reward-'+rewardRemoval.uid});}} onRemove={id=>removeCard(rewardRemoval,id)} onClose={()=>setRewardRemoval(undefined)}/>}
 {comparison&&draft&&<CardActionDialog title={finish('compare')} onClose={()=>setComparison(undefined)}>
  <div className="replacement-compare"><section><h3>{finish('myCard')}</h3>{preview(comparison.card,true)}</section>
   <section><h3>{finish('officialCard')}</h3><CardPreview card={comparison.other} template={comparison.detail} config={config} language={language} projectId={draft.id} small/></section>
  </div><button className="secondary" onClick={()=>setComparison(undefined)}>{local(config.rules.usabilityText.close,language)}</button>
 </CardActionDialog>}
 {replacement&&<ReplacementDialog request={replacement} rules={config.rules} language={language} onClose={()=>setReplacement(undefined)}/>}
 {picker&&<ExamplePicker expansions={expansions} onExpansions={changeExpansions} config={config} language={language} kind={picker.kind} champion={picker.champion} pathsOnly={picker.pathsOnly} mechanicsOnly={picker.mechanicsOnly} compareLabel={picker.compareLabel} replacing={picker.replacing} t={t} onClose={()=>setPicker(undefined)} onPick={picker.pick}/>}
 </></NumberFeedbackProvider></GuideProvider>;
}
class SafetyBoundary extends React.Component<{children:React.ReactNode},{error:string}>{state={error:''};static getDerivedStateFromError(e:Error){return {error:e.message};}render(){let spanish=false;try{spanish=localStorage.getItem('creator-language')==='es';}catch{}return this.state.error?<main className="loading"><h1>{spanish?'No se pudo mostrar esta pantalla':'This screen could not be displayed'}</h1><p>{spanish?'Tu clan guardado sigue en este equipo. Recarga para volver a abrirlo.':'Your saved clan is still on this computer. Reload to open it again.'}</p><button onClick={()=>location.reload()}>{spanish?'Volver a abrir el creador':'Reopen the creator'}</button><details><summary>{spanish?'Detalle':'Details'}</summary>{this.state.error}</details></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<SafetyBoundary><App/></SafetyBoundary>);
// 2026-11-15-0902||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Pantallas de contenido, volver y editar, desbloqueos, arte y preparación del mod
// 2026-11-15-0904||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Inicializar la referencia del borrador para React 19 y permitir salir al inicio
// 2026-11-15-0907||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Mantener coste de campeón al copiar y mostrar continuar cuando la sección opcional tiene cartas
// 2026-11-15-0912||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Permitir crear salas y artefactos desde cero además de copiar ejemplos
// 2026-11-15-0920||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Explicar la herramienta de compilación con enlace oficial y sin exigir conocimientos de programación
// 2026-11-15-1225||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Añadir deshacer y rehacer, progreso comprensible, acceso opcional a nuevos tipos y control de recompensas
// 2026-11-15-1227||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Contar equipos y cartas especiales al indicar si la sección contiene cartas
// 2026-11-15-1228||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Reservar la selección automática de estandarte para unidades jugables como recompensa
// 2026-11-15-1229||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Reiniciar el contador al abrir un proyecto para no perder el primer autoguardado
// 2026-11-15-1400||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Retirar eslóganes y delegar portada en componente con textos de configuración
// 2026-11-15-1421||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Separar requisitos de compilación incluida de instalación opcional para jugar
// 2026-11-15-1454||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Elegir nivel de desbloqueo desde una lista válida en vez de escribirlo a mano
// 2026-11-15-1826||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Priorizar instalación local en revisión y permitir guardar una unidad y comenzar otra ficha independiente
// 2026-11-15-1828||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Abrir estadísticas desde la cabecera preservando el paso y mostrar referencia oficial en todo el recorrido
// 2026-11-15-1830||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Dejar las descargas opcionales plegadas y quitar instrucciones ZIP del flujo principal de juego local
// 2026-11-15-1839||codex-actualizar-datos-juego||clan-creator/src/web/creator/main.tsx||Usar finishUnitEdit en el boton de regreso al editar unidades de la coleccion del paso 11
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Usar copia de sendas con niveles completos
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mantener contexto de campeon en selector
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Copiar campeon y senda I II III; permitir elegir ejemplos para cada senda
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Ofrecer ejemplos de senda desde su pantalla
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Filtrar campeones automaticamente al elegir ejemplo
// 2026-11-15-1938||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Restaurar plantillas de sendas al volver a abrir borradores
// 2026-11-15-1944||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Limitar ejemplos de senda a campeones con tres niveles disponibles
// 2026-11-15-2009||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Abrir copia completa del clan oficial en el asistente
// 2026-11-15-2119||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Sustituir lista mezclada por colecciones separadas manteniendo navegacion y borradores
// 2026-11-15-2211||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Sustituir pantalla final duplicada por tres pasos guiados y retirar opciones ZIP de ese recorrido
// 2026-11-15-2301||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Actualizar lista de clanes al borrar restaurar o desinstalar desde portada
// 2026-11-15-2328||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Conectar copia exclusiva de mecanicas oficiales al borrador y al selector de ejemplos
// 2026-11-16-2022||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Cambiar idioma inicial y fallback a inglés conservando español elegido previamente
// 2026-11-16-2027||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mostrar ayuda de autor opcional
// 2026-11-16-2040||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Retirar campo Autor de la pantalla de identidad del clan
// 2026-11-16-2148||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Integrar recorrido corto vista del campeón y copias portátiles conservando navegación y guardado
// 2026-11-16-2151||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Localizar pantalla de recuperación de errores en inglés y español según preferencia guardada
// 2026-11-16-2157||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Confirmar restauración con aviso persistente al abrir el nuevo borrador
// 2026-11-16-2325||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Abrir avisos en su campo marcar revisión personal recuperar carta eliminada y mostrar cambios pendientes de instalar
// 2026-11-16-2329||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Previsualizar y confirmar imágenes antes de subirlas al borrador usando rol y encuadre explícitos
// 2026-11-16-2330||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Actualizar estado de cabecera tras instalación y bloquear navegación accidental mientras se prepara
// 2026-11-16-2340||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Marcar revisado al continuar solo si el paso está preparado sin impedir navegación
// 2026-11-16-2340||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Usar lista de pasos al validar revisión antes de continuar
// 2026-11-17-0022||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Integrar recuperación de contexto validación inmediata sustituciones protegidas DLC y vuelta a edición
// 2026-11-17-0031||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Distinguir confirmación de copia exclusiva de efectos de sustitución de carta completa
// 2026-11-17-0035||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Mostrar aviso de nombre de clan junto al campo y nombres reales en selección de campeones
// 2026-11-17-1852||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Integrar ocho mejoras de continuación creación paso a paso recuperación filtros consejos resumen y copias
// 2026-11-17-1903||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Cerrar vista anterior al cambiar entre estadísticas resumen e inicio
// 2026-11-17-1953||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Abrir taller desde cabecera paso de arte y carta activa conservando borrador y estilo común
// 2026-11-17-2002||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Conservar identidad de nueva carta y sus instrucciones de arte al terminar el asistente
// 2026-11-17-2239||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Retomar carta provisional al abrir clan y mostrar continuidad sin mezclarla con cartas terminadas
// 2026-11-17-2243||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Aportar guardado coordinado a los accesos al taller de arte
// 2026-11-17-2254||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Unificar cambios de arte de cartas y logo con comparador e historial y retirar ruta antigua directa
// 2026-11-17-2255||codex-clan-editor||clan-creator/src\web\creator\main.tsx||Reiniciar selector de logo tras elegir archivo para admitir nuevas comparaciones del mismo origen
// 2026-11-19-0749||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Colocar revisión obligatoria primero y plegar sugerencias y expansiones
// 2026-11-19-0751||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mostrar bloqueos locales mientras se completa la revisión
// 2026-11-19-0758||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Abrir un borrador sin imponer su carta pendiente e integrar recompensas
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Conservar búsqueda al editar y comparar una variante con su carta de origen
// 2026-11-19-0759||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Navegar a edición desde los consejos de coste
// 2026-11-19-0800||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Reutilizar la navegación desde ambos consejos de equilibrio
// 2026-11-19-0801||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Volver directamente a los resultados del resumen al terminar la edición
// 2026-11-19-0846||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Comparar carta actual y resultado calculado por el mismo método usado al aplicar
// 2026-11-19-0913||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Integrar comparación oficial y revisión de recompensas sin nuevos pasos
// 2026-11-19-0914||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Saltar a la carta desde su nota de prueba
// 2026-11-19-0915||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Enfocar el nombre al abrir una nota sin mostrar un aviso vacío
// 2026-11-19-0918||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Llevar directamente a la recompensa utilizada por la carta
// 2026-11-19-2122||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mostrar la sustitución también en cartas iniciales y en el selector
// 2026-11-19-2126||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Abrir el nivel exacto que contiene las bonificaciones del ejemplo
// 2026-11-20-0901||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Validar hechizos durante la edición y duplicar siempre con un nombre guardable
// 2026-11-21-0950||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mostrar Ver JSON al editar cada carta y campeon
// 2026-11-21-1011||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Retirar la creacion del clan preparado de la portada
// 2026-11-21-1020||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Retirar la revision personal y continuar con guardado y comprobacion automatica
// 2026-11-21-1046||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mantener visible el aviso de copia parcial al volver al primer paso
// 2026-11-21-1105||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Pasar a la portada la versión de la aplicación instalada
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Abrir la copia recién creada desde la portada
// 2026-11-21-1114||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mostrar un acceso a la colección al abrir un clan con cartas
// 2026-11-21-1217||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Separar navegación, retorno de edición y creación de Hechizos y Equipo
// 2026-11-21-1218||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Reutilizar la asignación de pasos al abrir una carta desde la revisión
// 2026-11-21-1223||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Colocar la versión y las actualizaciones a la derecha de la marca en todas las pantallas
// 2026-11-21-1243||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Mostrar el mismo aviso en el primer paso de la copia
// 2026-11-21-1333||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Integrar los pasos Clan assets y Stones and slabs con el guardado del asistente
// 2026-11-21-1930||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Añadir acceso general a la ayuda y rutas directas sin interferir con el asistente
// 2026-11-21-2126||codex-clan-editor||clan-creator/src/web/creator/main.tsx||Abrir el catálogo del tipo de la colección y editar la copia directamente sin consumir una carta provisional distinta
