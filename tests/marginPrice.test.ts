import {expect,it} from 'vitest';
import {targetPriceInKopeks} from '../src/calculation/breakEven';
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
