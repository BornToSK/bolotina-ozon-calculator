import {useEffect,useRef,useState} from 'react';
import {numberValue} from '../io/normalizer';
export default function NumberInput({value,onChange,label,nullable=false}:{value:number|null;onChange:(n:number|null)=>void;label:string;nullable?:boolean}){
 const [draft,setDraft]=useState(value===null?'':String(value)),[error,setError]=useState(''),focused=useRef(false);
 useEffect(()=>{if(!focused.current)setDraft(value===null?'':String(value));},[value]);
 return <span className="number-wrap"><input aria-label={label} aria-invalid={!!error} title={error||label} value={draft} inputMode="decimal" onFocus={()=>focused.current=true} onBlur={()=>{focused.current=false;if(error){setDraft(value===null?'':String(value));setError('');}}} onChange={e=>{setDraft(e.target.value);try{const n=numberValue(e.target.value);if(n===null&&!nullable)throw Error('Заполните число');onChange(n);setError('');}catch(err){setError(String(err));}}}/>{error&&<small className="field-error">{error}</small>}</span>;
}
