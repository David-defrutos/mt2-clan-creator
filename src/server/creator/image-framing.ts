export type ArtworkPurpose='card'|'character'|'icon'|'resource';
export interface SourceCrop {left:number;top:number;width:number;height:number}
export interface ImageFraming {resourceId?:string;crop?:SourceCrop;preserveSource?:boolean;purpose:ArtworkPurpose;mode:'contain'|'cover'|'original';zoom?:number;x?:number;y?:number}
export function framingGeometry(width:number,height:number,targetWidth:number,targetHeight:number,mode:'contain'|'cover',zoom=1,x=50,y=50){const factor=(mode==='cover'?Math.max(targetWidth/width,targetHeight/height):Math.min(targetWidth/width,targetHeight/height))*zoom,w=Math.max(1,Math.round(width*factor)),h=Math.max(1,Math.round(height*factor));return {width:w,height:h,left:Math.round((targetWidth-w)*x/100),top:Math.round((targetHeight-h)*y/100)};}
// 2026-11-16-2327||codex-clan-editor||clan-creator/src/server/creator/image-framing.ts||Compartir cálculo de encuadre entre vista previa e imagen aplicada

export function gridCellCrop(index:number,inset=0):SourceCrop{if(!Number.isInteger(index)||index<0||index>8||!Number.isFinite(inset)||inset<0||inset>15)throw Error('Invalid grid selection.');const gap=inset/300;return {left:index%3/3+gap,top:Math.floor(index/3)/3+gap,width:1/3-2*gap,height:1/3-2*gap};}
export function sourceCropPixels(width:number,height:number,crop:SourceCrop){if(!crop||![crop.left,crop.top,crop.width,crop.height].every(Number.isFinite)||crop.left<0||crop.top<0||crop.width<=0||crop.height<=0||crop.left+crop.width>1.000001||crop.top+crop.height>1.000001)throw Error('Invalid source crop.');const left=Math.min(width-1,Math.floor(crop.left*width)),top=Math.min(height-1,Math.floor(crop.top*height)),right=Math.min(width,Math.round((crop.left+crop.width)*width)),bottom=Math.min(height,Math.round((crop.top+crop.height)*height));return {left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};}
// 2026-11-17-1950||codex-clan-editor||clan-creator/src\server\creator\image-framing.ts||Compartir selección 3x3 recorte ajustable y validación de límites de imagen

export function artworkResource(rules:any,id?:string){return rules.aiArt?.resources.find((r:any)=>r.id===id)??(id&&Object.hasOwn(rules.aiArt?.formats??{},id)?rules.aiArt.formats[id]:undefined);}
// 2026-11-17-1954||codex-clan-editor||clan-creator/src\server\creator\image-framing.ts||Resolver formatos de imagen adicionales desde configuración compartida
