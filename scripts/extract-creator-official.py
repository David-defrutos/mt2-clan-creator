# Documento generado el 2026-11-15-1030
"""Extract authentic card UI sprites and static portrait layers from the installed game."""
import argparse,json,hashlib,re,gc,base64,struct
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import UnityPy
from PIL import Image,ImageChops
import numpy as np
import math
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--game-data',type=Path,required=True);parser.add_argument('--bundle');parser.add_argument('--ui-only',action='store_true');parser.add_argument('--dlc-only',action='store_true');args=parser.parse_args()
import os
out=Path(os.environ.get('CLAN_OFFICIAL_OUTPUT',str(ROOT/'catalog/official')));
catalog_assets=out/'assets'
out.mkdir(parents=True,exist_ok=True)
stamp=datetime.now(ZoneInfo('Europe/Madrid')).strftime('%Y-%m-%d-%H%M');log=ROOT.parent/'docs/registro/codex-clan-editor.md'
def write(p,b):
 before=p.stat().st_mtime_ns if p.exists() else None
 if p.exists():p.read_bytes()
 if (p.stat().st_mtime_ns if p.exists() else None)!=before:raise RuntimeError('Cambio concurrente: '+str(p))
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);assert p.stat().st_size==len(b)
 with log.open('a',encoding='utf8') as f:f.write(stamp+'||codex-clan-editor||clan-creator/'+p.relative_to(ROOT).as_posix()+'||Extraer recurso oficial local; SHA256 '+hashlib.sha256(b).hexdigest()+'\n')
def image_asset(im):
 import io
 b=io.BytesIO();im.convert('RGBA').save(b,format='PNG');data=b.getvalue();rel='official/assets/'+hashlib.sha256(data).hexdigest()+'.png';p=out/'assets'/Path(rel).name
 if not p.exists():write(p,data)
 return rel
manifest={'generatedAt':datetime.now(ZoneInfo('Europe/Madrid')).isoformat(),'gameData':str(args.game_data),'frames':{},'portraits':{},'bundles':[],'errors':[],'preview':'Static composition of original enabled portrait layers; no animation or shader simulation.'}
if (args.bundle or args.ui_only or args.dlc_only) and (out/'art-manifest.json').exists():manifest=json.loads((out/'art-manifest.json').read_text(encoding='utf8'))
# Addressables GUIDs resolve renamed MT1 prefabs; names in old data exports are not authoritative.
catalog=json.loads((args.game_data/'StreamingAssets/aa/catalog.json').read_text(encoding='utf-8-sig'));raw=base64.b64decode(catalog['m_KeyDataString']);asset_paths={}
for match in re.finditer(rb'\x05 ([0-9a-f]{32})',raw):
 end=match.start();names=[]
 for size in range(1,min(512,end-4)+1):
  if struct.unpack_from('<I',raw,end-size-4)[0]!=size:continue
  try:name=raw[end-size:end].decode('utf8')
  except UnicodeDecodeError:continue
  if name.isprintable():names.append(name)
 if names:asset_paths[match.group(1).decode()]=max(names,key=len)
manifest['assetPaths']=asset_paths;manifest['sharedAssetsSha256']=hashlib.sha256((args.game_data/'sharedassets0.assets').read_bytes()).hexdigest()
env=UnityPy.load(str(args.game_data/'sharedassets0.assets'))
for o in env.objects:
 if o.type.name=='Font':
  font=o.read()
  if font.m_Name in ['Acme-Regular','PTSansNarrowRegular','PTSansNarrowBold']:write(out/'fonts'/(font.m_Name+'.ttf'),bytes(font.m_FontData))
 if o.type.name!='Sprite':continue
 d=o.read();n=d.m_Name
 if re.match(r'^(unit|spell|equipment)-cardframe-[a-z]+$',n) or re.match(r'^(unit|spell|room|equipment|blight|junk)-(backframe-normal.*|backframe|textbody.*)$',n) or re.match(r'^shared-(pips-normal-[1-6]|normal-(common|uncommon|rare|champ))$',n) or n in ['all-typeplate-normal','unit-banner','cardHealthIcon_1'] or n in ['room-cardframebacking-normal','unit-cardframebacking-normal-nonchampion','unit-cardframebacking-normal-champion','spell-cardframebacking-normal','equipment-cardframebacking-normal','unit-nameplate-normal-nonchampion','unit-nameplate-normal-champion','spell-nameplate-normal','shared-nameplate-normal','shared-ember','shared-emberbacking-normal','cardAttackIcon','cardHealthIcon_0','unit-cardartmask','spell-cardartmask']:
  manifest['frames'][n]={'asset':image_asset(d.image),'name':n,'pathId':o.path_id,'source':'sharedassets0.assets'}
del env;gc.collect()
def transform_chain(ptr):
 if not ptr or not ptr.m_PathID:return []
 t=ptr.read_typetree();go=ptr.read().m_GameObject.read();chain=[]
 for component in go.m_Component:
  if component.component.type.name in ['Transform','RectTransform']:
   parent=component.component.read().m_Father
   if parent.m_PathID:
    for pc in parent.read().m_GameObject.read().m_Component:
     try:
      if pc.component.type.name=='MonoBehaviour' and pc.component.read().m_Script.read().m_ClassName=='CardEffectTransform':chain=transform_chain(pc.component);break
     except:pass
 return chain+[t]
def layer_image(im,size,chain,stretch=False):
 cw,ch=size
 if stretch:im=im.resize(size,Image.Resampling.LANCZOS)
 matrix=np.eye(3)
 for idx,t in enumerate(chain or [{}]):
  pos=t.get('position',{});scale=t.get('scale',{});angle=math.radians(t.get('rotation',{}).get('z',0));co,si=math.cos(angle),math.sin(angle);sx,sy=scale.get('x',1),scale.get('y',1)
  part=np.array([[co*sx,-si*sy,cw*(.5+pos.get('x',0))],[si*sx,co*sy,ch*(.5+pos.get('y',0))],[0,0,1]])
  if idx<len(chain)-1:part=part@np.array([[1,0,-cw*.5],[0,1,-ch*.5],[0,0,1]])
  matrix=matrix@part
 # PIL uses a top-left origin; Unity positions each unstretched texture around its native-sized centre.
 source=np.array([[1,0,-im.width*.5],[0,-1,im.height*.5],[0,0,1]])
 output=np.array([[1,0,0],[0,-1,ch],[0,0,1]])
 inverse=np.linalg.inv(output@matrix@source)
 return im.transform(size,Image.Transform.AFFINE,tuple(inverse[:2].flat),resample=Image.Resampling.BICUBIC)
def images(go):
 animate={}
 for c in go.m_Component:
  try:
   if c.component.type.name=='MonoBehaviour' and c.component.read().m_Script.read().m_ClassName=='AnimateCardEffects':animate=c.component.read_typetree()
  except:pass
 for c in go.m_Component:
  o=c.component;d=o.read()
  if o.type.name=='MonoBehaviour':
   try:
    if d.m_Script.read().m_ClassName!='Image':continue
    t=o.read_typetree();sprite=t.get('m_Sprite',{});material=t.get('m_Material',{})
    if material.get('m_PathID'):
     mat=UnityPy.classes.PPtr(**material,assetsfile=o.assetsfile).read();props=mat.m_SavedProperties;floats=dict(props.m_Floats);tex=dict(props.m_TexEnvs);layers=[]
     for i in range(1,10):
      key='_Layer'+str(i);slot=tex.get(key+'Tex');ptr=slot.m_Texture if slot else None
      if ptr and ptr.m_PathID and floats.get(key+'Enabled',0)>0 and (floats.get(key+'Type',1) in [1,2,3] or floats.get(key+'Type',1)==4 and not (tex.get(key+'Mask') and tex[key+'Mask'].m_Texture.m_PathID)):
       transform=animate.get('_layerTransforms',[]);tr=UnityPy.classes.PPtr(**transform[i-2],assetsfile=o.assetsfile) if i>=2 and len(transform)>i-2 else None;chain=transform_chain(tr) if tr else [];layers.append((ptr.read().image.convert('RGBA'),ptr.m_PathID,chain,floats.get(key+'Stretch',0)>0))
     if layers:
      canvas=Image.new('RGBA',layers[0][0].size)
      for im,_,chain,stretch in layers:canvas.alpha_composite(layer_image(im,canvas.size,chain,stretch))
      yield canvas,{'material':mat.m_Name,'layers':[{'texture':i,'size':im.size,'transforms':chain,'stretch':stretch} for im,i,chain,stretch in layers]};continue
    if sprite.get('m_PathID'):
     ptr=UnityPy.classes.PPtr(**sprite,assetsfile=o.assetsfile);yield ptr.read().image.convert('RGBA'),{'sprite':ptr.m_PathID}
   except Exception as ex:manifest['errors'].append({'object':go.m_Name,'error':str(ex)[:180]})
  elif o.type.name=='RectTransform':
   for child in d.m_Children:yield from images(child.read().m_GameObject.read())
for bundle in sorted((args.game_data/'StreamingAssets/aa/StandaloneWindows64').rglob('cardprefabs-*.bundle')):
 if args.ui_only:continue
 if args.dlc_only and 'DLC' not in bundle.relative_to(args.game_data).parts:continue
 if args.bundle and bundle.name!=args.bundle:continue
 base=args.game_data/'StreamingAssets/aa/StandaloneWindows64'
 shared=[p for p in [bundle.parent/'duplicates_assets_all.bundle',base/'duplicates_assets_all.bundle',base/'cardprefabs-misc_assets_all.bundle'] if p.exists()]
 env=UnityPy.load(str(bundle),*[str(p) for p in dict.fromkeys(shared)]);count=0
 for name,ptr in env.container.items():
  if not name.lower().endswith('.prefab') or 'portrait_prefabs' not in name.lower():continue
  try:
   go=ptr.read();layers=list(images(go))
   if not layers:continue
   canvas=layers[0][0]
   for im,_ in layers[1:]:canvas.alpha_composite(im.resize(canvas.size))
   row={'asset':image_asset(canvas.resize((410,496),Image.Resampling.LANCZOS)),'prefab':name,'bundle':bundle.name,'layers':[r for _,r in layers]}
   manifest['portraits'][Path(name).stem.lower()]=row;count+=1
  except Exception as ex:manifest['errors'].append({'prefab':name,'error':str(ex)[:180]})
 manifest['bundles'].append({'name':bundle.name,'sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'portraits':count})
 print(bundle.name,count,flush=True);del env;gc.collect()
write(out/'art-manifest.json',(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())
print('Portraits',len(manifest['portraits']),'Frames',len(manifest['frames']),'Errors',len(manifest['errors']))
# 2026-11-15-1016||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Extraer marcos auténticos y componer ilustraciones oficiales desde sus prefabs y texturas
# 2026-11-15-1017||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Resolver punteros de materiales y sprites desde el archivo Unity del prefab
# 2026-11-15-1020||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Guardar vistas de carta a su tamaño de diseño y conservar intactos los sprites de marcos
# 2026-11-15-1025||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Respetar tamaño nativo, posición y jerarquía de cada capa según AnimateCardEffects, evitando estirarlas
# 2026-11-15-1026||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Resolver prefabs por GUID instalado y permitir repetir solo un bundle con sus dependencias compartidas
# 2026-11-15-1027||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Incluir capas originales de distorsión en reposo y resolver sprites compartidos de cartas
# 2026-11-15-1140||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Extraer piezas rectangulares, cuerpos, indicadores y fuentes del juego sin repetir ilustraciones
# 2026-11-15-1143||codex-clan-editor||clan-creator/scripts/extract-creator-official.py||Incluir ilustraciones principales de capas móviles sin máscara en su posición estática
# 2026-11-15-1846||codex-clan-editor||clan-creator/scripts\extract-creator-official.py||Recorrer subcarpetas DLC, cargar dependencias compartidas reales y permitir extracción provisional solo de DLC
