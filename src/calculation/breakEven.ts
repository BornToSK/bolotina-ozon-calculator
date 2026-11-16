import {calculate} from './unitEconomics';
import type {ProductInput,Tariff} from './types';
// Bisection in a continuous tariff interval. Scan tariff discontinuities separately.
function bisect(fn:(x:number)=>number,lo:number,hi:number,increasing:boolean){
 for(let i=0;i<70;i++){const mid=(lo+hi)/2;if((fn(mid)>=0)===increasing)hi=mid;else lo=mid;}return increasing?hi:lo;
}
export function targetPrice(p:ProductInput,t:Tariff,target=0,min=0,max=1e7):number|null {
 const f=(price:number)=>{const r=calculate({...p,sellerPrice:price},t);return r.profit-r.price*target/100;};
 const discount=1-p.discountPercent/100;if(discount<=0)return null;
 const boundaries=[...new Set([min,100/discount,300/discount,(t.observedFbs?.minimumExclusive??300)/discount,t.additionalFees.pvzCap/(Math.max(p.pvzPercent,.000001)/100)/discount,max].filter(n=>n>=min&&n<=max))].sort((a,b)=>a-b);
 for(let i=0;i<boundaries.length-1;i++){const lo=boundaries[i]+(i?1e-7:0),hi=boundaries[i+1];if(lo>hi)continue;if(f(lo)>=0)return lo;if(f(hi)>=0)return bisect(f,lo,hi,true);}
 return f(max)>=0?max:null;
}
export function targetPriceInKopeks(p:ProductInput,t:Tariff,target:number):number|null {
 let min=.01;
 // Rounding up can cross a tariff threshold. Check the exact amount that will be saved.
 for(let attempt=0;attempt<8&&min<=1e7;attempt++){
  const price=targetPrice(p,t,target,min);
  if(price===null)return null;
  const cents=Math.ceil(price*100);
  const rounded=cents/100;
  if(calculate({...p,sellerPrice:rounded},t).margin>=target)return rounded;
  min=(cents+1)/100;
 }
 return null;
}
export function planMarginPrices(products:ProductInput[],t:Tariff,target:number,skus:ReadonlySet<string>|null){
 if(!Number.isFinite(target)||target<0||target>=100)throw Error('Введите маржу от 0% до значения меньше 100%');
 const unreachable:string[]=[];
 let changed=0,unchanged=0;
 const next=products.map(p=>{
  if(skus&&!skus.has(p.sku))return p;
  const sellerPrice=targetPriceInKopeks(p,t,target);
  if(sellerPrice===null){unreachable.push(p.sku);return p;}
  if(sellerPrice===p.sellerPrice){unchanged++;return p;}
  changed++;
  return {...p,sellerPrice};
 });
 return {products:next,changed,unchanged,unreachable};
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
