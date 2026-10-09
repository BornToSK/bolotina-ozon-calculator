import type {ProductInput,Result,Tariff} from './types';
import {calculate} from './unitEconomics';
// App inputs/tariffs are immutable: edits replace objects. WeakMaps retain no
// discarded scenarios and invalidate automatically on a new product/tariff.
export function createCachedCalculator(engine=calculate){
 const tariffs=new WeakMap<Tariff,WeakMap<ProductInput,Result>>();
 return (product:ProductInput,tariff:Tariff)=>{
  let products=tariffs.get(tariff);
  if(!products){products=new WeakMap();tariffs.set(tariff,products);}
  let result=products.get(product);
  if(!result){result=engine(product,tariff);products.set(product,result);}
  return result;
 };
}
