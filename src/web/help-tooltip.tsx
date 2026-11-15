import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useLanguage} from './i18n';

export function HelpTooltip({label, text, withinLabel = false}: {label:string; text:string; withinLabel?:boolean}) {
  const {t}=useLanguage();
  const id=useId();
  const anchor=useRef<HTMLSpanElement>(null);
  const tooltip=useRef<HTMLSpanElement>(null);
  const hideTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>()=>clearTimeout(hideTimer.current),[]);
  function enter(){clearTimeout(hideTimer.current);setHovered(true);setDismissed(false);}
  function leave(){clearTimeout(hideTimer.current);hideTimer.current=setTimeout(()=>setHovered(false),120);}
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const [pinned,setPinned]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  const [position,setPosition]=useState({left:8,top:8});
  const visible=(hovered||focused||pinned)&&!dismissed;
  useLayoutEffect(()=>{
    if(!visible)return;
    function place(){
      if(!anchor.current||!tooltip.current)return;
      const rect=anchor.current.getBoundingClientRect();
      const size=tooltip.current.getBoundingClientRect();
      const left=Math.max(8,Math.min(rect.left,window.innerWidth-size.width-8));
      const below=rect.bottom+8;
      const top=below+size.height<=window.innerHeight-8?below:Math.max(8,rect.top-size.height-8);
      setPosition({left,top});
    }
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[visible,text]);
  function toggle(event:React.MouseEvent<HTMLElement>){event.preventDefault();event.stopPropagation();setPinned(!pinned);setDismissed(pinned);}
  const props={className:'help-trigger','aria-label':t('Ayuda: {label}',{label}),'aria-describedby':visible?id:undefined,
    onFocus:()=>{setFocused(true);setDismissed(false);},onBlur:()=>{setFocused(false);setPinned(false);setDismissed(false);},
    onClick:toggle,onKeyDown:(event:React.KeyboardEvent<HTMLElement>)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setPinned(false);setDismissed(true);}
      if(withinLabel&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.stopPropagation();setPinned(!pinned);setDismissed(pinned);}
    }};
  // Avoid associating a form label with a second labelable control.
  return <span ref={anchor} className="help-tooltip" onMouseEnter={enter} onMouseLeave={leave}>
    {withinLabel?<span {...props} role="button" tabIndex={0}>?</span>:<button {...props} type="button">?</button>}
    {visible&&createPortal(<span ref={tooltip} id={id} role="tooltip" className="help-text help-text-floating" style={position} onMouseEnter={enter} onMouseLeave={leave}>{text}</span>,document.body)}
  </span>;
}
