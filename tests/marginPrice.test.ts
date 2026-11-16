import {expect,it} from 'vitest';
import {planMarginPrices,targetPriceInKopeks} from '../src/calculation/breakEven';
import {calculate} from '../src/calculation/unitEconomics';
import {defaultTariff} from '../src/calculation/tariffs';
import {newProduct} from '../src/io/productDefaults';

it('rounds up to the first kopek that achieves a 15% margin at the current DRR',()=>{
 const product={...newProduct('test'),sellerPrice:1000,costPrice:497.13,discountPercent:5,commissionPercent:31,drrPercent:12};
 const price=targetPriceInKopeks(product,defaultTariff,15)!;
 expect(Number.isFinite(price)).toBe(true);
 expect(Math.round(price*100)/100).toBe(price);
 expect(calculate({...product,sellerPrice:price}).margin).toBeGreaterThanOrEqual(15);
 expect(calculate({...product,sellerPrice:(Math.round(price*100)-1)/100}).margin).toBeLessThan(15);
 expect(targetPriceInKopeks({...product,drrPercent:5},defaultTariff,15)).toBeLessThan(price);
});

it('does not return a sale price when 15% cannot be achieved',()=>{
 const product={...newProduct('test'),costPrice:200,sellerPrice:500,drrPercent:85};
 expect(targetPriceInKopeks(product,defaultTariff,15)).toBeNull();
 expect(targetPriceInKopeks({...product,discountPercent:100},defaultTariff,15)).toBeNull();
});

it('plans custom prices for selected SKUs without touching the rest or unreachable rows',()=>{
 const selected={...newProduct('001'),sellerPrice:1000,costPrice:200,drrPercent:5};
 const skipped={...selected,sku:'002',drrPercent:95};
 const outside={...selected,sku:'003'};
 const input=[selected,skipped,outside];
 const target=18.5;
 const plan=planMarginPrices(input,defaultTariff,target,new Set(['001','002']));
 expect(plan.changed).toBe(1);
 expect(plan.unreachable).toEqual(['002']);
 expect(plan.products.slice(1)).toEqual(input.slice(1));
 expect(plan.products[0]).toEqual({...selected,sellerPrice:plan.products[0].sellerPrice});
 expect(calculate(plan.products[0]).margin).toBeGreaterThanOrEqual(target);
 expect(planMarginPrices(plan.products,defaultTariff,target,null)).toMatchObject({changed:1,unchanged:1,unreachable:['002']});
 expect(()=>planMarginPrices(input,defaultTariff,100,null)).toThrow();
});
