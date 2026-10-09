import {expect,it,vi} from 'vitest';
import {calculate} from '../src/calculation/unitEconomics';
import {createCachedCalculator} from '../src/calculation/cachedCalculator';
import {defaultTariff} from '../src/calculation/tariffs';
import {newProduct} from '../src/io/productDefaults';
it('recalculates only changed immutable SKU or changed tariff, without stale results',()=>{
 const engine=vi.fn(calculate),cached=createCachedCalculator(engine);
 const first={...newProduct('A'),sellerPrice:2000},second={...newProduct('B'),sellerPrice:3000};
 const initial=cached(first,defaultTariff);cached(second,defaultTariff);
 expect(cached(first,defaultTariff)).toBe(initial);expect(engine).toHaveBeenCalledTimes(2);
 const changed={...first,sellerPrice:2500};
 expect(cached(changed,defaultTariff).profit).not.toBe(initial.profit);
 cached(second,defaultTariff);expect(engine).toHaveBeenCalledTimes(3);
 const tariff=structuredClone(defaultTariff);tariff.FBS.speedPP['24_36h']=5;
 expect(cached(changed,tariff).commission).not.toBe(cached(changed,defaultTariff).commission);
 expect(engine).toHaveBeenCalledTimes(4);
});
