const formatters=new Map<number,Intl.NumberFormat>();
export const fmt=(n:number|null|undefined,digits=1)=>{
 if(n===null||n===undefined)return '—';
 let formatter=formatters.get(digits);
 if(!formatter){formatter=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:digits});formatters.set(digits,formatter);}
 return formatter.format(n);
};
export const rub=(n:number|null|undefined)=>n===null||n===undefined?'—':fmt(n)+' ₽';
export const pct=(n:number|null|undefined)=>n===null||n===undefined?'—':fmt(n)+'%';
