import React,{createContext,useContext} from 'react';
import {HelpTooltip} from './help-tooltip';
import {useLanguage} from './i18n';

type HelpFields=Record<string,{help:string}>;
const HelpContext=createContext<HelpFields>({});
export function FieldHelpProvider({fields,children}:{fields:HelpFields;children:React.ReactNode}) {
  return <HelpContext.Provider value={fields}>{children}</HelpContext.Provider>;
}
export function FieldCaption({name,label,helpText}:{name:string;label:string;helpText?:string}) {
  const {t}=useLanguage();
  const fields=useContext(HelpContext);
  const text=helpText??fields[name]?.help;
  return <span className="field-caption"><span>{label}</span>{text&&<HelpTooltip withinLabel label={label} text={t(text)}/>}</span>;
}
