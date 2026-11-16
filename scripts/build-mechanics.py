# Documento generado el 2026-11-15-1430
from pathlib import Path
import json,runpy,hashlib
w=runpy.run_path(str(Path(__file__).with_name('write-task.py')))['write'];root=Path(__file__).resolve().parents[1];data=root.parent/'datos-juego/MonsterTrain2GameData';p=root/'config/creator.json';c=json.loads(p.read_text(encoding='utf-8'));statuses={};observed=set();triggers=set();hashes={}
for folder in ['CardData','CardUpgradeTreeData','StatusEffectData']:
 for f in (data/folder).glob('*.json'):
  b=f.read_bytes();o=json.loads(b.decode('utf-8-sig'));hashes[folder+'/'+f.name]=hashlib.sha256(b).hexdigest()
  if folder=='StatusEffectData':
   for s in o.get('status_effects',[]):statuses[s['id']]=s
  def visit(v):
   if isinstance(v,list):
    for x in v:visit(x)
   elif isinstance(v,dict):
    for k in ['status','statusId']:
     if isinstance(v.get(k),str):observed.add(v[k])
    if isinstance(v.get('trigger'),str):triggers.add(v['trigger'])
    for x in v.values():
     if isinstance(x,(dict,list)):visit(x)
  visit(o)
clean=lambda s:__import__('re').sub(r'<[^>]+>','',s or '')
keywordNames={'hatch':{'es':'Eclosión','en':'Hatch'},'troop':{'es':'Tropa','en':'Troop'}}
for key,names in keywordNames.items():c['statusLabels'][key]=names
abilities=[]
for sid in sorted(observed):
 s=statuses.get(sid)
 if not s or s.get('display_category') not in ['positive','negative','persistent'] or not s.get('names',{}).get('english'):continue
 name=dict(s['names']);help=s.get('card_tooltips',{});
 for lang,long in [('es','spanish'),('en','english')]:
  for key,names in keywordNames.items():name[long]=name.get(long,name['english']).replace('['+key+']',names[lang])
 fixed=s.get('show_stack_count') is False or '{0}' not in s.get('stackable_names',{}).get('english','{0}')
 abilities.append({'status':sid,'label':{'es':clean(name.get('spanish',name['english'])),'en':clean(name['english'])},'help':{'es':clean(help.get('spanish',help.get('english',''))),'en':clean(help.get('english',''))},'fixed':fixed})
abilities.extend(a for a in c.get('additionalOfficialAbilities',[]) if not any(x['status']==a['status'] for x in abilities))
for ability in abilities:
 if ability['status'] in c.get('abilityHelpOverrides',{}):ability['help']=c['abilityHelpOverrides'][ability['status']]
c['unitAbilities']=abilities
for a in abilities:c['statusLabels'][a['status']]=a['label']
c['recipes']=[r for r in c['recipes'] if not r.get('officialStatus')]
for a in abilities:
 if a['status'] in ['armor','buff']:continue
 rid='status_'+a['status'];c['recipes'].append({'id':rid,'label':{'es':'Aplicar '+a['label']['es']+' ('+a['label']['en']+')','en':'Apply '+a['label']['en']},'class':'CardEffectAddStatusEffect','status':a['status'],'amount':1,'target':'friendly','fixedAmount':a['fixed'],'officialStatus':True,'help':a['help']});c['recipeDescriptions'][rid]={'es':'Aplica '+a['label']['es']+' {amount} a {target}.','en':'Apply '+a['label']['en']+' {amount} to {target}.'}
if not any(r['id']=='attack' for r in c['recipes']):c['recipes'].append({'id':'attack','label':{'es':'Aumentar ataque','en':'Increase attack'},'class':'CardEffectBuffDamage','amount':3,'target':'friendly','unitTarget':'self'});c['recipeDescriptions']['attack']={'es':'Otorga +{amount} de ataque a {target}.','en':'Grant +{amount} attack to {target}.'}
labels={
'on_spawn':('Invocación: al invocar la unidad','Summon: when this unit is summoned'),
'on_any_unit_death_on_floor':('Cosecha (Harvest): al morir una unidad en este piso','Harvest: when a unit dies on this floor'),
'on_any_hero_death_on_floor':('Al morir un enemigo en este piso','When an enemy dies on this floor'),
'card_spell_played':('Encantamiento (Incant): al jugar un hechizo en este piso','Incant: when a spell is played on this floor'),
'on_hit':('Venganza (Revenge): tras recibir un golpe','Revenge: after being hit'),
'on_kill':('Matanza (Slay): al matar','Slay: when this unit kills'),
'on_death':('Último aliento (Extinguish): al morir','Extinguish: when this unit dies'),
'post_combat':('Resolución (Resolve): después del combate','Resolve: after combat'),
'pre_combat':('Antes del combate','Before combat'),
'on_attacking':('Al atacar','When attacking'),
'on_attacking_before_damage':('Antes de infligir daño al atacar','Before dealing attack damage'),
'on_turn_begin':('Al comenzar tu turno','At the start of your turn'),
'on_eaten':('Al ser devorada','When eaten'),
'on_feed':('Al devorar','When eating a Morsel'),
'on_food_spawn':('Al aparecer un Bocado','When a Morsel is summoned'),
'on_heal':('Regeneración (Rejuvenate): al recibir curación','Rejuvenate: when healed'),
'card_monster_played':('Al jugar una unidad en este piso','When a unit is played on this floor'),
'card_exhausted':('Al consumirse una carta','When a card is consumed'),
'on_shift':('Al desplazarse','When shifted'),
'on_equipment_added':('Al equipar a esta unidad','When this unit is equipped'),
'on_equipment_added_to_any':('Al equipar una unidad','When a unit is equipped'),
'on_armor_added':('Al recibir armadura','When armor is added'),
'end_turn_pre_hand_discard':('Al final del turno, antes de descartar la mano','At turn end, before discarding the hand'),
'on_hatched':('Al eclosionar','When hatched'),
'on_remove_hatch':('Al perder una carga de eclosión','When a hatch stack is removed'),
'on_silence_lost':('Al perder Silencio','When Silence is removed'),
'on_reanimated':('Al ser reanimada','When reanimated'),
'on_moon_phase_shift':('Al cambiar la fase lunar','When the moon phase changes'),
'on_moon_lit':('Al entrar en fase iluminada','When Moonlit begins'),
'on_moonlit_lost':('Al salir de fase iluminada','When Moonlit ends'),
'on_moon_shade':('Al entrar en fase sombría','When Moonshade begins'),
'on_moonshade_lost':('Al salir de fase sombría','When Moonshade ends'),
'corruption_added':('Al añadir corrupción','When corruption is added'),
'on_encounter_complete':('Al terminar la batalla','When the battle ends'),
'on_valiant':('Valentía (Valiant)','Valiant'),
'on_punish':('Castigo (Punish)','Punish'),
'on_deathwish':('Al entrar en Deathwish (a mitad de salud o menos)','When entering Deathwish (half health or less)'),
'on_deathwish_lost':('Al salir de Deathwish','When leaving Deathwish'),
'on_vanguard':('Al convertirse en la primera unidad del piso','When becoming the front unit on the floor'),
'on_vanguard_lost':('Al dejar de ser la primera unidad del piso','When no longer the front unit on the floor'),
'on_own_ability_activated':('Después de activar su habilidad','After activating this unit’s ability'),
'on_bloodshed':('Derramamiento de sangre (Bloodshed)','Bloodshed'),
'on_round_start':('Al inicio de cada ronda','At the start of each round'),
'on_pre_own_ability_activated':('Antes de activar su habilidad','Before activating this unit’s ability')}
# after_spawn_enchant is an internal aura lifecycle hook, not a user action.
triggers.difference_update(['after_spawn_enchant','on_cast','on_unplayed_negative','on_unplayed_positive','on_forge','on_spare']);triggers.add('pre_combat');unknown=triggers-labels.keys()
if unknown:raise Exception('Triggers sin descripción revisada: '+str(unknown))
c['triggers']=[{'value':key,'label':{'es':labels[key][0],'en':labels[key][1]}} for key in sorted(triggers,key=lambda k:labels[k][1])]
for trigger in c['triggers']:
 if trigger['value'] in c.get('triggerHelpOverrides',{}):trigger['help']=c['triggerHelpOverrides'][trigger['value']]
for key in triggers:c['triggerLabels'][key]={'es':labels[key][0].split(':')[0],'en':labels[key][1].split(':')[0]}
c['labels'].update({'abilities':{'es':'Capacidades de la unidad','en':'Unit abilities'},'abilitySearch':{'es':'Buscar capacidad: Quick, Trample, Multistrike…','en':'Search abilities: Quick, Trample, Multistrike…'},'addAbility':{'es':'Añadir capacidad','en':'Add ability'},'abilityHelp':{'es':'Capacidades presentes desde que la unidad entra en combate. Para otorgarlas durante la batalla, usa un efecto y elige cuándo ocurre.','en':'Abilities present when the unit enters combat. To grant them during battle, use an effect and choose when it happens.'},'effectSearch':{'es':'Buscar efecto…','en':'Search effects…'},'allOfficialEffects':{'es':'Para copiar comportamientos más complejos, usa una carta oficial de ejemplo: conserva sus efectos, objetivos y condiciones.','en':'To copy more complex behavior, use an official example card: its effects, targets and conditions are preserved.'}})
w('config/creator.json',json.dumps(c,ensure_ascii=False,indent=2)+'\n','Ampliar efectos y capacidades nativas y triggers observados en todas las cartas y sendas oficiales',False)
w('data/acceptance/mechanics-source-audit.json',json.dumps({'abilities':len(abilities),'recipes':len(c['recipes']),'triggers':len(c['triggers']),'sources':hashes,'notFoundAsTrigger':['siphon','syphon'],'excludedInternalTriggers':['after_spawn_enchant']},indent=2),'Auditar cobertura y hashes de capacidades y triggers del catálogo oficial',False)
print('Abilities',len(abilities),'Recipes',len(c['recipes']),'Triggers',len(c['triggers']))
# 2026-11-15-1429||codex-clan-editor||clan-creator/scripts/build-mechanics.py||Generar opciones de capacidades y activaciones desde datos oficiales auditados sin exponer clases internas
# 2026-11-15-1429||codex-clan-editor||clan-creator/scripts\build-mechanics.py||Separar activaciones de cartas de activaciones de unidad y excluir hooks internos de auras
# 2026-11-15-1430||codex-clan-editor||clan-creator/scripts\build-mechanics.py||Incluir capacidades persistentes oficiales como Quick, Trample, Multistrike y armadura
# 2026-11-15-1436||codex-clan-editor||clan-creator/scripts\build-mechanics.py||Presentar nombres legibles de Eclosión y Tropa en vez de etiquetas internas
# 2026-11-15-1847||codex-clan-editor||clan-creator/scripts\build-mechanics.py||Añadir activaciones nativas Punish, Bloodshed e inicio de ronda y excluir Spare de las activaciones de unidad

# Preserve the Conductor extension when regenerating the official mechanics catalog.
runpy.run_path(str(root/'scripts/build-conductor-mechanics.py'),run_name='__main__')
# 2026-11-15-2011||codex-clan-editor||clan-creator/scripts/build-mechanics.py||Mantener capacidades de Conductor al regenerar mecanicas oficiales
# 2026-11-15-2307||codex-clan-editor||clan-creator/scripts/build-mechanics.py||Conservar capacidades oficiales adicionales verificadas y ayuda de Punish al regenerar catalogo de mecanicas
# 2026-11-15-2336||codex-clan-editor||clan-creator/scripts/build-mechanics.py||Conservar estados adicionales ayudas corregidas y eventos nuevos del DLC al regenerar las mecanicas
