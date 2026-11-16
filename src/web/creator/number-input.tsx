import React,{useEffect,useState} from 'react';
export function validNumberText(raw:string,min:number,max:number,step=1){if(!raw.trim())return null;const n=Number(raw);return Number.isFinite(n)&&n>=min&&n<=max&&(step<1||Number.isInteger(n))?n:null;}
export function NumberInput({value,onChange,min=0,max=999,step=1,...props}:Omit<React.InputHTMLAttributes<HTMLInputElement>,'value'|'onChange'|'min'|'max'|'step'> & {value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number}){
 const [raw,setRaw]=useState(String(value));useEffect(()=>setRaw(String(value)),[value]);const valid=validNumberText(raw,min,max,step);
 return <input {...props} type="number" min={min} max={max} step={step} value={raw} aria-invalid={raw!==''&&valid===null||undefined} onChange={e=>{const text=e.target.value;setRaw(text);const n=validNumberText(text,min,max,step);if(n!==null)onChange(n);}} onBlur={e=>{if(valid===null)setRaw(String(value));props.onBlur?.(e);}}/>;
}
// 2026-11-15-1450||codex-clan-editor||clan-creator/src/web/creator/number-input.tsx||Permitir edición numérica temporal sin guardar vacío, fracciones enteras inválidas o valores fuera del rango
