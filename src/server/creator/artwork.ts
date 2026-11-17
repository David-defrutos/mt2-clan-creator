import sharp from 'sharp';
import {framingGeometry,sourceCropPixels,artworkResource,type ImageFraming} from './image-framing.js';
export async function prepareArtwork(bytes:Buffer,input:unknown,rules:any){const source=sharp(bytes,{limitInputPixels:rules.limits.maxImagePixels}),metadata=await source.metadata();if(!['png','jpeg','webp'].includes(metadata.format??''))throw Error('Use a PNG, JPG or WEBP image.');let normalized=await source.rotate().png().toBuffer();if(input===undefined)return normalized;
 const options=input as ImageFraming;if(!options||!['card','character','icon','resource'].includes(options.purpose))throw Error('Invalid image purpose.');
 if(options.crop){const size=await sharp(normalized).metadata();normalized=await sharp(normalized).extract(sourceCropPixels(size.width!,size.height!,options.crop)).png().toBuffer();}
 const resource=options.purpose==='resource'?artworkResource(rules,options.resourceId):undefined;if(options.purpose==='resource'&&!resource)throw Error('Invalid artwork resource.');
 if(options.purpose==='character'||resource?.kind==='character'){if(options.mode!=='original')throw Error('Character images preserve their full silhouette.');return normalized;}
 const zoom=options.zoom??1,x=options.x??50,y=options.y??50;if(!['contain','cover'].includes(options.mode)||![zoom,x,y].every(Number.isFinite)||zoom<1||zoom>rules.artworkImport.maxZoom||x<0||x>100||y<0||y>100)throw Error('Invalid image framing.');
 const target=resource??rules.artworkImport[options.purpose],meta=await sharp(normalized).metadata(),geometry=framingGeometry(meta.width!,meta.height!,target.width,target.height,options.mode as 'contain'|'cover',zoom,x,y);
 const left=Math.max(0,geometry.left),top=Math.max(0,geometry.top),cropLeft=Math.max(0,-geometry.left),cropTop=Math.max(0,-geometry.top),width=Math.min(geometry.width-cropLeft,target.width-left),height=Math.min(geometry.height-cropTop,target.height-top);
 const sourceLeft=Math.max(0,Math.floor(cropLeft/geometry.width*meta.width!)),sourceTop=Math.max(0,Math.floor(cropTop/geometry.height*meta.height!)),sourceRight=Math.min(meta.width!,Math.ceil((cropLeft+width)/geometry.width*meta.width!)),sourceBottom=Math.min(meta.height!,Math.ceil((cropTop+height)/geometry.height*meta.height!));
 const part=await sharp(normalized).extract({left:sourceLeft,top:sourceTop,width:Math.max(1,sourceRight-sourceLeft),height:Math.max(1,sourceBottom-sourceTop)}).resize(width,height,{fit:'fill'}).png().toBuffer();
 return sharp({create:{width:target.width,height:target.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:part,left,top}]).png().toBuffer();
}
// 2026-11-16-2327||codex-clan-editor||clan-creator/src/server/creator/artwork.ts||Aplicar encuadre validado de cartas e iconos con Sharp preservando silueta completa de personajes
// 2026-11-16-2328||codex-clan-editor||clan-creator/src/server/creator/artwork.ts||Recortar región de origen antes de redimensionar para evitar imágenes intermedias enormes y respetar márgenes transparentes
// 2026-11-16-2329||codex-clan-editor||clan-creator/src/server/creator/artwork.ts||Validar formato de imagen admitido antes de procesar contenido
// 2026-11-17-1950||codex-clan-editor||clan-creator/src\server\creator\artwork.ts||Recortar celda antes de reducir y aplicar formatos configurados de recursos adicionales sin alterar origen
// 2026-11-17-1954||codex-clan-editor||clan-creator/src\server\creator\artwork.ts||Usar formato explícito del taller sin alterar el encuadre de imágenes existentes
