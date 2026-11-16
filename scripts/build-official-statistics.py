# Documento generado el 2026-11-15-1850
from pathlib import Path
import json,hashlib,runpy,sys
ROOT=Path(__file__).resolve().parents[1]
w=runpy.run_path(str(ROOT/'scripts/write-task.py'))['write']
source=ROOT.parent/'datos-juego/MonsterTrain2GameData'
rules=json.loads((ROOT/'config/creator.json').read_text(encoding='utf-8'))
sources=[];cards={};relics={}
for section,out in [('CardData',cards),('CollectableRelicData',relics)]:
 for p in sorted((source/section).glob('*.json')):
  data=p.read_bytes();sources.append({'path':str(p.relative_to(ROOT.parent)).replace('\\','/'),'sha256':hashlib.sha256(data).hexdigest()});doc=json.loads(data.decode('utf-8-sig'))
  for c in doc.get('cards' if section=='CardData' else 'relics',[]):out.setdefault(c['id'],c)
starters_path=source/'CardPool/StarterCardsOnly.json';raw=starters_path.read_bytes();sources.append({'path':str(starters_path.relative_to(ROOT.parent)).replace('\\','/'),'sha256':hashlib.sha256(raw).hexdigest()});starter_pool=json.loads(raw.decode('utf-8-sig'));starter_entries=starter_pool.get('cards',starter_pool.get('cardDataList'));
if not isinstance(starter_entries,list):raise ValueError('Pool inicial sin lista de cartas')
starters=set(starter_entries)
catalog=json.loads((ROOT/'catalog/official/index.json').read_text(encoding='utf-8'))
names={e['root']['id']:e['names'] for e in catalog['items'] if not e.get('championPath')}
rarities=['common','uncommon','rare']; kinds={'monster':'unit','spell':'spell','room':'room','equipment':'equipment'};clans=[]
class_ids=sorted({c['class'] for c in cards.values() if c.get('class') and c.get('rarity')=='champion'})
for cid in class_ids:
 own=[c for c in cards.values() if c.get('class')==cid];reward=[c for c in own if c.get('card_type') in kinds and c.get('rarity') in rarities and not any(c.get(f) for f in ['is_an_ability','ignore_when_counting_mastery','hide_in_logbook']) and set(c.get('pools',[]))&{'MegaPool','UnitsAllBanner','EquipmentPool','TrainRoomPool'}]
 initial=[c for c in own if c['id'] in starters];champs=[c for c in own if c.get('rarity')=='champion'];art=[]
 for c in relics.values():
  for ext in c.get('extensions',[]):
   collect=ext.get('collectable',{})
   if collect.get('class')==cid and 'MegaRelicPool' in collect.get('pools',c.get('pools',[])):art.append(c)
 row={'id':cid,'name':rules.get('officialDataImport',{}).get('classNames',{}).get(cid,cid.removeprefix('Class')),'total':len(reward),'types':{v:sum(c.get('card_type')==k for c in reward) for k,v in kinds.items()},'rarities':{r:sum(c.get('rarity')==r for c in reward) for r in rarities},'byType':{v:{r:sum(c.get('card_type')==k and c.get('rarity')==r for c in reward) for r in rarities} for k,v in kinds.items()},'champions':len(champs),'paths':len(champs)*3,'starters':len(initial),'starterCards':[{'id':c['id'],'names':c.get('names') or names.get(c['id'],{'english':c['id']})} for c in initial],'normalPool':sum('MegaPool' in c.get('pools',[]) for c in reward),'bannerPool':sum('UnitsAllBanner' in c.get('pools',[]) for c in reward),'artifacts':len(art),'auxiliary':len([c for c in own if c not in reward and c not in initial and c not in champs]),'rewardIds':[c['id'] for c in reward]}
 clans.append(row)
warnings=[]
for pool_name in ['MegaPool','UnitsAllBanner','EquipmentPool','TrainRoomPool']:
 pool_path=source/'CardPool'/(pool_name+'.json');raw_pool=pool_path.read_bytes();pool=json.loads(raw_pool.decode('utf-8-sig'));sources.append({'path':str(pool_path.relative_to(ROOT.parent)).replace('\\','/'),'sha256':hashlib.sha256(raw_pool).hexdigest()})
 for missing in sorted(set(pool.get('cards',pool.get('cardDataList',[])))-cards.keys()):warnings.append({'pool':pool_name,'missingCardId':missing,'names':names.get(missing,{'english':missing})})
w('config/official-statistics.json',json.dumps({'schemaVersion':1,'source':'Local game data snapshot; counts of distinct reward cards, not weighted probabilities','clans':clans,'sourceWarnings':warnings,'sources':sources},ensure_ascii=False,indent=2)+'\n',f'Generar estadísticas autocontenidas de {len(clans)} clanes; separar recompensas, campeones, iniciales, auxiliares y pools',False)
print([(c['name'],c['total'],c['starters'],c['champions'],c['artifacts']) for c in clans])
# 2026-11-15-1827||codex-clan-editor||clan-creator/scripts/build-official-statistics.py||Generar estadísticas reproducibles desde cartas, reliquias y pool inicial oficiales
# 2026-11-15-1827||codex-clan-editor||clan-creator/scripts\build-official-statistics.py||Resolver nombres de unidades iniciales a partir del catálogo oficial auditado
# 2026-11-15-1844||codex-clan-editor||clan-creator/scripts\build-official-statistics.py||Descubrir clanes mediante sus campeones y calcular cifras nuevas sin imponer la tabla histórica de doce clanes
# 2026-11-15-1847||codex-clan-editor||clan-creator/scripts\build-official-statistics.py||Corregir sangrado del cálculo al descubrir clanes de forma dinámica
# 2026-11-15-1849||codex-clan-editor||clan-creator/scripts\build-official-statistics.py||Leer pools nuevos con cards y mantener compatibilidad con cardDataList sin inventar iniciales
# 2026-11-15-1851||codex-clan-editor||clan-creator/scripts\build-official-statistics.py||Detectar definiciones omitidas que siguen referenciadas por pools y declarar el límite del recuento
