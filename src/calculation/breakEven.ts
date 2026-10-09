import {calculate} from './unitEconomics';
import type {ProductInput,Tariff} from './types';
// Bisection in a continuous tariff interval. Scan tariff discontinuities separately.
function bisect(fn:(x:number)=>number,lo:number,hi:number,increasing:boolean){
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if((fn(mid)>=0)===increasing)hi=mid;else lo=mid;}return increasing?hi:lo;
}
export function targetPrice(p:ProductInput,t:Tariff,target=0,min=0,max=1e7):number|null {
 const f=(price:number)=>{const r=calculate({...p,sellerPrice:price},t);return r.profit-r.price*target/100;};
 const discount=1-p.discountPercent/100;if(discount<=0)return null;
 const boundaries=[min,100/discount,300/discount,t.additionalFees.pvzCap/(Math.max(p.pvzPercent,.000001)/100)/discount,max].filter(n=>n>=min&&n<=max).sort((a,b)=>a-b);
 for(let i=0;i<boundaries.length-1;i++){const lo=boundaries[i]+(i?1e-7:0),hi=boundaries[i+1];if(f(lo)>=0)return lo;if(f(hi)>=0)return bisect(f,lo,hi,true);}
 return f(max)>=0?max:null;
}
export function maxDrr(p:ProductInput,t:Tariff,target=0):number|null {
 const f=(drr:number)=>{const r=calculate({...p,drrPercent:drr},t);return r.profit-r.price*target/100;};
 if(f(0)<0)return null;if(f(100)>=0)return 100;return bisect(f,0,100,false);
}
export function optimizePrice(p:ProductInput,t:Tariff,target:number,maxDrrPercent:number,min:number,max:number){
 if(min<0||max<min)throw Error('Проверьте диапазон цены');
 // Minimum feasible price at conservative (maximum allowed) DRR; no demand curve is assumed.
 return targetPrice({...p,drrPercent:maxDrrPercent},t,target,min,max);
}
