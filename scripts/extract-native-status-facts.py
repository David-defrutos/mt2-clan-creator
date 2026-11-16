# Documento generado el 2026-11-15-2336
from pathlib import Path
import argparse,struct,json,hashlib,runpy
import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator
parser=argparse.ArgumentParser();parser.add_argument('--game-root',type=Path,required=True);args=parser.parse_args();root=Path(__file__).resolve().parents[1];asset=args.game_root/'MonsterTrain2_Data/sharedassets0.assets';env=UnityPy.load(str(asset));generator=TypeTreeGenerator(next(iter(env.files.values())).unity_version);generator.load_local_game(str(args.game_root));facts=None
for o in env.objects:
 if o.type.name!='MonoBehaviour':continue
 b=o.get_raw_data();n=struct.unpack_from('<i',b,28)[0] if len(b)>=32 else 0
 if n==len('StatusEffects') and b[32:32+n]==b'StatusEffects':
  data=o.read_typetree(nodes=generator.get_nodes_up('Assembly-CSharp','StatusEffectsData'));fields=['statusEffectStateName','hidden','displayCategory','isStackable','showStackCount','paramInt','paramSecondaryInt','removeStackAtEndOfTurn','removeAtEndOfTurn'];facts={s['statusId']:{k:s[k] for k in fields} for s in data['statusEffectData']};break
if facts is None:raise RuntimeError('Native status definitions not found')
p=root/'config/creator.json';config=json.loads(p.read_text(encoding='utf-8'));config['nativeStatusFacts']=facts;config['nativeStatusFactsSource']={'asset':asset.name,'assetSha256':hashlib.sha256(asset.read_bytes()).hexdigest(),'assemblySha256':hashlib.sha256((args.game_root/'MonsterTrain2_Data/Managed/Assembly-CSharp.dll').read_bytes()).hexdigest()};write=runpy.run_path(str(root/'scripts/write-task.py'))['write'];write('config/creator.json',json.dumps(config,ensure_ascii=False,indent=2)+'\n','Incorporar datos verificados de estados del juego instalado incluidos DLC sin modificar assets',False);print('Native states:',len(facts))
# 2026-11-15-2335||codex-clan-editor||clan-creator/scripts/extract-native-status-facts.py||Extraer parametros reales de estados y flags de DLC desde juego instalado con hashes de origen
