# Documento generado el 2026-11-15-2008
from pathlib import Path
import json,hashlib,struct,runpy
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
ROOT=Path(__file__).resolve().parents[1]
w=runpy.run_path(str(ROOT/'scripts/write-task.py'))['write']
game=Path('C:/Juegos/Steam/steamapps/common/Monster Train 2')
asset=game/'MonsterTrain2_Data/sharedassets0.assets'
env=UnityPy.load(str(asset));generator=TypeTreeGenerator(next(iter(env.files.values())).unity_version);generator.load_local_game(str(game))
objects={o.path_id:o for o in env.objects}
def name(o):
 b=o.get_raw_data()
 if len(b)<32:return ''
 n=struct.unpack_from('<i',b,28)[0]
 return b[32:32+n].decode('utf-8',errors='replace') if 0<n<200 else ''
def deref(ref):
 if ref['m_FileID']!=0:raise ValueError('Referencia externa inesperada')
 return objects[ref['m_PathID']]
index=json.loads((ROOT/'catalog/official/index.json').read_text(encoding='utf-8'))['items']
by_root={e['root']['id']:e for e in index if not e.get('championPath')}
raw_cards={};raw_relics={}
for folder,key,out in [('CardData','cards',raw_cards),('CollectableRelicData','relics',raw_relics)]:
 for f in sorted((ROOT.parent/'datos-juego/MonsterTrain2GameData'/folder).glob('*.json')):
  for d in json.loads(f.read_text(encoding='utf-8-sig')).get(key,[]):out.setdefault(d['id'],d)
rules=json.loads((ROOT/'config/creator.json').read_text(encoding='utf-8'));clans=[]
for o in env.objects:
 if o.type.name!='MonoBehaviour' or name(o) not in rules['officialDataImport']['classNames']:continue
 native=o.read_typetree(nodes=generator.get_nodes_up('Assembly-CSharp','ClassData'));cid=native['m_Name'];slug=cid.removeprefix('Class').lower();slug='wurmkin' if slug=='wurm' else slug
 champions=[]
 for ref in native['champions']:
  champ=deref(ref).read_typetree(nodes=generator.get_nodes_up('Assembly-CSharp','ChampionData'));card_id=name(deref(champ['championCardData']));starter_id=name(deref(champ['starterCardData']));base=by_root[card_id];starter=by_root[starter_id];paths=sorted([e for e in index if e.get('championPath',{}).get('baseId')==base['id']],key=lambda e:e['championPath']['path'])
  if len(paths)!=3 or any(len(p['championPath'].get('levels',[]))!=3 for p in paths):raise ValueError('Senda incompleta '+card_id)
  champions.append({'baseId':base['id'],'paths':[p['id'] for p in paths],'starterId':starter['id']})
 if len(champions)!=2:raise ValueError('Se requieren dos campeones '+cid)
 used={c['baseId'] for c in champions}|{c['starterId'] for c in champions};cards=[]
 for entry in index:
  if entry.get('championPath') or entry['id'] in used:continue
  raw=(raw_relics if entry['kind']=='artifact' else raw_cards).get(entry['root']['id'])
  if raw is None:
   if not entry.get('legacy') or entry.get('clan')!=slug:continue
   # Retained audited snapshot for a definition omitted in the latest extraction.
   example=json.loads((ROOT/'catalog/official/examples'/(entry['id']+'.json')).read_text(encoding='utf-8'));raw=example['document'][entry['root']['section']][0];raw={**raw,'class':cid,'pools':['MegaPool']}
  collect=next((e['collectable'] for e in raw.get('extensions',[]) if 'collectable' in e),{})
  if raw.get('class',collect.get('class'))!=cid:continue
  pools=collect.get('pools',raw.get('pools',[]));reward=bool(set(pools)&{'MegaPool','UnitsAllBanner','TrainRoomPool','EquipmentPool','MegaRelicPool'}) and not any(raw.get(k) for k in ['is_an_ability','hide_in_logbook','ignore_when_counting_mastery'])
  cards.append({'templateId':entry['id'],'banner':entry['kind']=='unit' and 'UnitsAllBanner' in pools,'reward':reward,'unlockLevel':raw.get('unlock_level',collect.get('unlock_level',1))})
 clans.append({'id':slug,'classId':cid,'name':rules['officialClans'][slug],'champions':champions,'cards':cards,'requiredDlc':next((e.get('requiredDlc') for e in index if e['id']==champions[0]['baseId']),None)})
if len(clans)!=len(rules['officialDataImport']['classNames']):raise ValueError('Faltan clanes oficiales')
w('config/official-clans.json',json.dumps({'schemaVersion':1,'source':{'asset':asset.name,'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'method':'Native ClassData and ChampionData with generated type trees; audited local card snapshots'},'clans':sorted(clans,key=lambda c:c['id'])},ensure_ascii=False,indent=2)+'\n','Plantillas autocontenidas de 13 clanes con parejas nativas campeon-inicial, sendas, cartas y reliquias',False)
print([(c['id'],len(c['cards'])) for c in clans])
# 2026-11-15-2007||codex-clan-editor||clan-creator/scripts/build-official-clans.py||Extraer relaciones exactas de campeones e iniciales desde ClassData original sin tocar assets
# 2026-11-15-2019||codex-clan-editor||clan-creator/scripts/build-official-clans.py||Usar version Unity detectada al leer relaciones de clanes oficiales
