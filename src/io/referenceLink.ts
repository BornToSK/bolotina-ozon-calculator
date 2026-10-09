import {gunzipSync,strFromU8} from 'fflate';
import {newProduct} from './productDefaults';
import {numberValue} from './normalizer';
import {defaultTariff} from '../calculation/tariffs';
import {upperVolume} from '../calculation/ozonLogistics';
import {validateProduct} from '../calculation/validation';
import type {ProductInput,Tariff} from '../calculation/types';

export interface ReferenceConfig {rows:Record<string,string>[];globals:Record<string,any>}
export function decodeReferenceLink(link:string):ReferenceConfig {
 let url:URL;try{url=new URL(link.trim());}catch{throw Error('Вставьте полную сохранённую ссылку калькулятора');}
 const encoded=new URLSearchParams(url.hash.slice(1)).get('gzdata');
 if(!encoded)throw Error('В ссылке нет сохранённых данных gzdata');
 // URLSearchParams treats literal + as spaces. Reference links use ordinary base64.
 const base64=encoded.replace(/ /g,'+');
 if(base64.length>100000)throw Error('Сохранённая ссылка слишком большая');
 try{
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  if(bytes.length<18||new DataView(bytes.buffer).getUint32(bytes.length-4,true)>8*1024*1024)throw Error('Размер данных превышает 8 МБ');
  const config=JSON.parse(strFromU8(gunzipSync(bytes)));
  if(!Array.isArray(config.rows)||!config.globals||config.rows.length>2000)throw Error('Нет таблицы товаров');
  return config;
 }catch(e){throw Error('Не удалось прочитать сохранённую ссылку: '+String(e));}
}
export function referenceProducts(config:ReferenceConfig,count:number,t:Tariff=defaultTariff):ProductInput[]{
 if(!Number.isInteger(count)||count<1||count>config.rows.length)throw Error(`Укажите количество от 1 до ${config.rows.length}`);
 const g=config.globals;
 const n=(value:unknown,fallback=0)=>numberValue(value)??fallback;
 return config.rows.slice(-count).map(row=>{
  if(typeof row.name!=='string'||!row.name)throw Error('У товара отсутствует артикул');
  const p=newProduct(row.name),profile=g.profiles?.[n(row['in-profile'])];
  if(!profile)throw Error(`${p.sku}: не найдена схема отгрузки`);
  if(!['fbs','fbo'].includes(row.scheme))throw Error(`${p.sku}: неизвестная схема`);
  p.fulfillment=row.scheme.toUpperCase() as ProductInput['fulfillment'];
  p.shipmentScheme=profile.name??'Схема '+(n(row['in-profile'])+1);
  const fields:Record<string,keyof ProductInput>={'in-price':'sellerPrice','in-discount':'discountPercent','in-cost':'costPrice','in-coinvest':'coinvestPercent','in-comm':'commissionPercent','in-buyout':'buyoutPercent','in-drr':'drrPercent','in-vat':'vatPercent','in-retpack-type':'returnPackagingTariff','in-retpack':'returnPackagingPercent','in-share':'salesSharePercent','in-other':'monthlyIndirectExpenses','in-skuother':'monthlySkuExpenses','in-undoccost':'undocumentedUnit','in-insfix':'fixedContributionsYear','in-leadtime':'leadTimeWeeks'};
  for(const [key,field] of Object.entries(fields))(p as any)[field]=n(row[key]);
  const volumeIndex=n(row['in-vol']);p.volumeBand=t.volumes[volumeIndex];
  if(!p.volumeBand)throw Error(`${p.sku}: неизвестный диапазон объёма`);
  p.volumeLiters=upperVolume(p.volumeBand);p.freeFboIntake=row['in-freeintake']==='yes';
  p.monthlySales=n(row['in-sales'])||null;p.stockUnits=n(row['in-stock'])||null;
  p.taxRatePercent=n(g.taxrate);p.acquiringPercent=n(g.acq);p.pvzPercent=n(g.delivpvz);
  const taxes:Record<string,ProductInput['taxSystem']>={usn_d:'usn_income',usn_dr:'usn_profit',osno:'osno',none:'none'};
  if(!taxes[g.taxsys])throw Error('Налоговая система ссылки не поддерживается');p.taxSystem=taxes[g.taxsys];
  p.legalForm=g.legalform==='ooo'?'OOO':'IP';p.insuranceEnabled=g.insurance==='yes';p.deferralDays=g.deferral==='yes'?n(g.deferralDays):0;
  p.fbsPoint=profile.fbsPoint;p.fbsSpeed=profile.fbsSpeed;p.originCluster=profile.fbsOrigin;p.returnsToOzon=profile.returnsToOzon;p.fboClusters=[...profile.gruzim];
  // Complex legacy VAT expense allocations need a separate mapping, never silently drop nonzero values.
  for(const key of ['in-vat22','in-vat10','in-vat7','in-vat5','in-costvat22','in-costvat10','in-costvat7','in-costvat5','in-undocother','in-undocsku'])if(n(row[key])!==0)throw Error(`${p.sku}: поле ${key} требует ручного сопоставления; импорт остановлен`);
  const errors=validateProduct(p);if(errors.length)throw Error(`${p.sku}: ${errors.join('; ')}`);
  return p;
 });
}
export function appendNewProducts(current:ProductInput[],incoming:ProductInput[]){
 const known=new Set(current.map(p=>p.sku));const added:ProductInput[]=[];
 for(const p of incoming)if(!known.has(p.sku)){known.add(p.sku);added.push(p);}
 return {products:[...current,...added],added:added.length,skipped:incoming.length-added.length};
}
