# Documento generado el 2026-11-15-2014
from pathlib import Path
import json,re,hashlib,runpy,subprocess
ROOT=Path(__file__).resolve().parents[1]
w=runpy.run_path(str(ROOT/'scripts/write-task.py'))['write']
base=ROOT/'vendor/modding';bundle=json.loads((base/'index.json').read_text(encoding='utf-8'))
c=json.loads((ROOT/'config/creator.json').read_text(encoding='utf-8'))
types=subprocess.check_output(['ilspycmd','-l','c',str(base/bundle['references']['Conductor'])],text=True,encoding='utf-8')
translations={
'brambles':('Zarzas','Recibe 3 de daño por carga cuando la unidad se mueve. Las cargas se conservan entre turnos.'),
'construct':('Constructo','Gana +1 de ataque y +1 de salud por carga al final del turno. Las cargas se conservan entre turnos. Los atributos obtenidos no se conservan al morir.'),
'divine_blessing':('Bendición divina','Cuando recibe un estado positivo que se puede propagar, obtiene una carga adicional por cada carga de Bendición divina. No se aplica a sí misma y no se propaga.'),
'growth':('Crecimiento','+1 de salud máxima por carga.'),
'heroic':('Heroico','Las unidades aliadas tienen +1 de ataque por carga.'),
'hex':('Maleficio','Cuando recibe un estado negativo que se puede propagar, obtiene una carga adicional por cada carga de Maleficio. No se aplica a sí mismo ni a Aturdimiento y no se propaga.'),
'hyper':('Hiperactividad','Las activaciones ocurren una vez más. Pierde una carga cada turno.'),
'intangible':('Intangible','Solo recibe 1 de daño cada vez que sufre daño. Pierde una carga cada turno.'),
'recoil':('Retroceso','Recibe 1 de daño por carga después de atacar. Pierde una carga cada turno.'),
'pierce':('Ensartar','Los ataques también golpean a una unidad situada detrás del objetivo por cada carga.'),
'smirk':('Sonrisa','+5 de ataque por carga y activa efectos asociados a esta capacidad. Pierde una carga con cada ataque.'),
'sparkles':('Destellos','Recibe 1 de daño por carga cuando juegas un hechizo en este piso. Las cargas no disminuyen.')}
c['unitAbilities']=[a for a in c['unitAbilities'] if a.get('provider')!='Conductor']
c['recipes']=[r for r in c['recipes'] if r.get('provider')!='Conductor'];sources=[];added=[]
for f in bundle['files']:
 if '/json/status_effects/' not in f['path'] or not f['path'].endswith('.json'):continue
 raw=(base/f['path']).read_bytes()
 if hashlib.sha256(raw).hexdigest()!=f['sha256']:raise ValueError('Conductor ha cambiado: '+f['path'])
 for s in json.loads(raw.decode('utf-8-sig')).get('status_effects',[]):
  if not s.get('names',{}).get('english'):continue
  sid=s['id'];cls=s['class_name'].removeprefix('@')
  if sid not in translations or not re.search(r'\b'+re.escape(cls)+r'\b',types):raise ValueError('Capacidad no revisada '+sid)
  key='Conductor_'+sid;es,help_es=translations[sid];help_en=re.sub(r'<[^>]*>',' ',s['card_tooltips']['english']).replace('[codeint0]',str(s.get('param_int',1))).replace('[attack]',' attack').replace('[health]',' health').replace('[buff]','positive status').replace('[debuff]','negative status').replace('[dazed]','Dazed').replace('[propagate]','propagate').replace('[Conductor_'+sid+']',s['names']['english']);label={'es':es,'en':s['names']['english']};help={'es':help_es,'en':help_en}
  a={'status':key,'provider':'Conductor','reference':{'id':'@'+sid,'mod_reference':'Conductor'},'aliases':[sid,s['names']['english']],'label':label,'help':help,'fixed':s.get('is_stackable') is False};c['unitAbilities'].append(a);c['statusLabels'][key]=label
  rid='status_'+key;c['recipes'].append({'id':rid,'label':{'es':'Aplicar '+es+' (Conductor)','en':'Apply '+label['en']+' (Conductor)'},'class':'CardEffectAddStatusEffect','status':key,'amount':1,'target':'friendly','fixedAmount':a['fixed'],'provider':'Conductor','help':help});c['recipeDescriptions'][rid]={'es':'Aplica '+es+' {amount} a {target}.','en':'Apply '+label['en']+' {amount} to {target}.'};added.append(key)
 sources.append({'file':f['path'],'sha256':f['sha256']})
w('config/creator.json',json.dumps(c,ensure_ascii=False,indent=2)+'\n','Anadir 12 capacidades de Conductor con referencia externa correcta ayudas ES EN y efectos aplicables',False)
w('config/conductor-mechanics-audit.json',json.dumps({'version':next(p['version'] for p in bundle['packages'] if p['id']=='conductor'),'abilities':added,'sources':sources,'excluded':[{'id':'growth_inactive','reason':'Estado interno sin nombre visible'},{'id':'dizzy','reason':'No existe en Conductor 0.6.0; pertenece a FreeCompany y requiere StatusEffectFreeCompanyDizzyState'}]},ensure_ascii=False,indent=2)+'\n','Auditar capacidades Conductor incluidas y exclusion comprobada de Dizzy',False)
print('Conductor abilities',len(added))
# 2026-11-15-2011||codex-clan-editor||clan-creator/scripts/build-conductor-mechanics.py||Generar capacidades Conductor desde paquete verificado sin copiar su implementacion
