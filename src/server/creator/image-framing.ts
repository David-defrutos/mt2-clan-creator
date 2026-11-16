export type ArtworkPurpose='card'|'character'|'icon';
export interface ImageFraming {purpose:ArtworkPurpose;mode:'contain'|'cover'|'original';zoom?:number;x?:number;y?:number}
export function framingGeometry(width:number,height:number,targetWidth:number,targetHeight:number,mode:'contain'|'cover',zoom=1,x=50,y=50){const factor=(mode==='cover'?Math.max(targetWidth/width,targetHeight/height):Math.min(targetWidth/width,targetHeight/height))*zoom,w=Math.max(1,Math.round(width*factor)),h=Math.max(1,Math.round(height*factor));return {width:w,height:h,left:Math.round((targetWidth-w)*x/100),top:Math.round((targetHeight-h)*y/100)};}
// 2026-11-16-2327||codex-clan-editor||clan-creator/src/server/creator/image-framing.ts||Compartir cálculo de encuadre entre vista previa e imagen aplicada
