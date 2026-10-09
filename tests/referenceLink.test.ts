import {it,expect} from 'vitest';
import {gzipSync,strToU8} from 'fflate';
import {decodeReferenceLink,referenceProducts,appendNewProducts} from '../src/io/referenceLink';
import {newProduct} from '../src/io/productDefaults';
import type {ReferenceConfig} from '../src/io/referenceLink';
const config:ReferenceConfig={globals:{taxsys:'usn_d',taxrate:'12',acq:'1.5',delivpvz:'0.7',legalform:'ip',profiles:[{name:'Схема 1',fbsPoint:'sc',fbsSpeed:'48h',fbsOrigin:'Москва, МО и Дальние регионы',returnsToOzon:true,gruzim:['Москва, МО и Дальние регионы']}]},rows:[{name:'OLD',scheme:'fbs','in-vol':'9','in-buyout':'75'},{name:'НОВЫЙ-A',scheme:'fbs','in-price':'4497','in-cost':'516','in-vol':'15','in-buyout':'75','in-drr':'12','in-coinvest':'60','in-comm':'51','in-retpack-type':'25','in-retpack':'30'}]};
it('decodes reference gzip/base64 including + and reads only final rows',()=>{
 const encoded=btoa(String.fromCharCode(...gzipSync(strToU8(JSON.stringify(config)))));
 const parsed=decodeReferenceLink('https://example.com/#gzdata='+encoded);
 const [p]=referenceProducts(parsed,1);
 expect(p.sku).toBe('НОВЫЙ-A');expect(p.sellerPrice).toBe(4497);expect(p.volumeLiters).toBe(9);expect(p.returnPackagingPercent).toBe(30);expect(p.drrPercent).toBe(12);expect(p.coinvestPercent).toBe(60);expect(p.taxRatePercent).toBe(12);expect(p.monthlySales).toBeNull();expect(p.stockUnits).toBeNull();
});
it('adds missing SKU without changing existing edited rows and is idempotent',()=>{
 const current=[{...newProduct('OLD'),sellerPrice:1234}];const incoming=[newProduct('OLD'),newProduct('NEW')];
 const merged=appendNewProducts(current,incoming);expect(merged.added).toBe(1);expect(merged.skipped).toBe(1);expect(merged.products[0]).toBe(current[0]);expect(merged.products[0].sellerPrice).toBe(1234);expect(appendNewProducts(merged.products,incoming).added).toBe(0);
});
it('rejects invalid links, counts, and unsupported nonzero expense inputs',()=>{
 expect(()=>decodeReferenceLink('bad')).toThrow();expect(()=>decodeReferenceLink('https://example.com')).toThrow();expect(()=>referenceProducts(config,0)).toThrow();expect(()=>referenceProducts(config,3)).toThrow();
 expect(()=>referenceProducts({...config,rows:[{...config.rows[1],'in-vat22':'10'}]},1)).toThrow(/сопоставления/);
});
