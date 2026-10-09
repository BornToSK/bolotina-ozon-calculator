import * as XLSX from 'xlsx';
import {numberValue,percentValue} from './normalizer';
import type {BusinessSettings,ProductInput,Result,Tariff} from '../calculation/types';
import {defaultTariff} from '../calculation/tariffs';
import {upperVolume} from '../calculation/ozonLogistics';
import {validateProduct} from '../calculation/validation';
import {portfolio} from '../calculation/portfolio';
import {compareScenarios} from '../calculation/scenarios';
import legacy from '../data/legacy-config.json';
import {newProduct} from './productDefaults';
export {newProduct,defaultSettings} from './productDefaults';
export interface ImportPreview {products:ProductInput[];sheets:string[];mapping:Record<string,string>;warnings:string[];errors:string[];fixture:Record<string,Record<string,number|null>>}
const aliases:Record<string,keyof ProductInput>={'Артикул':'sku','SKU':'sku','Название':'name','Схема':'fulfillment','Цена, ₽':'sellerPrice','Цена':'sellerPrice','Скидка, %':'discountPercent','Себест., ₽':'costPrice','Себестоимость':'costPrice','Продажи/мес':'monthlySales','Соинвест, %':'coinvestPercent','Комиссия, %':'commissionPercent','Выкуп, %':'buyoutPercent','ДРР, %':'drrPercent','Объём, л':'volumeLiters','Остаток, шт':'stockUnits'};
export function parseWorkbook(w:XLSX.WorkBook,customMapping:Record<string,string>={}):ImportPreview {
 const out:ImportPreview={products:[],sheets:w.SheetNames,mapping:{},warnings:[],errors:[],fixture:{}};
 const textSheet=w.Sheets['Лист1'];
 const text=textSheet?(XLSX.utils.sheet_to_json<unknown[]>(textSheet,{header:1}).flat().filter(v=>typeof v==='string') as string[]).join('\n'):'';
 const blocks=new Map<string,string>();
 for(const match of text.matchAll(/=== АРТИКУЛ \d+: (.+?) \((FBO|FBS)\) ===([\s\S]*?)(?====|$)/g))blocks.set(match[1],match[2]+'\n'+match[3]);
 const sheetName=w.Sheets['Юнит-экономика']?'Юнит-экономика':w.Sheets['Лист2']?'Лист2':w.SheetNames.find(n=>n!=='Лист1');
 if(!sheetName){out.errors.push('Не найдена структурированная таблица');return out;}
 const sheet=w.Sheets[sheetName],rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:null});
 const headerIndex=rows.findIndex(row=>row.some(v=>['Артикул','SKU','sku'].includes(String(v))||customMapping[String(v)]==='sku'));
 if(headerIndex<0){out.errors.push('Не найдена колонка Артикул / SKU');return out;}
 const headers=rows[headerIndex].map(String),sample=newProduct('');
 const fields=headers.map(h=>Object.hasOwn(customMapping,h)?Object.hasOwn(sample,customMapping[h])?customMapping[h] as keyof ProductInput:null:Object.hasOwn(aliases,h)?aliases[h]:Object.hasOwn(sample,h)?h as keyof ProductInput:null);
 headers.forEach((h,i)=>{if(fields[i])out.mapping[h]=fields[i]!;});
 for(let j=headerIndex+1;j<rows.length;j++){
  const row=rows[j],sku=String(row[fields.indexOf('sku')]??'');if(!sku||sku==='ИТОГО')continue;
  const p=newProduct(sku),block=blocks.get(sku);
  try {
   fields.forEach((field,i)=>{if(!field||row[i]===null||row[i]===undefined)return;
    const cell=sheet[XLSX.utils.encode_cell({r:j,c:i})];
    if(Array.isArray(sample[field]))(p as any)[field]=JSON.parse(String(row[i]));
    else if(typeof sample[field]==='boolean')(p as any)[field]=row[i]===true||row[i]===1||row[i]==='true';
    else if(typeof sample[field]==='number'||['monthlySales','stockUnits'].includes(field))(p as any)[field]=field.endsWith('Percent')?percentValue(row[i],cell?.z?.includes('%'))??sample[field]:numberValue(row[i])??sample[field];
    else (p as any)[field]=String(row[i]);
   });
   if(block){
    p.fulfillment=block.startsWith('FBO')?'FBO':'FBS';
    const numeric=(pattern:RegExp,fallback:number)=>numberValue(block.match(pattern)?.[1])??fallback;
    p.shipmentScheme=block.match(/Схема отгрузки: (.+)/)?.[1]??p.shipmentScheme;
    p.commissionPercent=numeric(/Комиссия: ([\d.,]+)%/,p.commissionPercent);
    p.buyoutPercent=numeric(/Выкуп: ([\d.,]+)%/,p.buyoutPercent);
    p.drrPercent=numeric(/ДРР на заказ: ([\d.,]+)%/,p.drrPercent);
    p.coinvestPercent=numeric(/Соинвест: ([\d.,]+)%/,p.coinvestPercent);
    p.vatPercent=numeric(/НДС: ([\d.,]+)%/,p.vatPercent);
    p.volumeBand=block.match(/Объём: (.+)/)?.[1]??p.volumeBand;p.volumeLiters=upperVolume(p.volumeBand);
    p.salesSharePercent=numeric(/Доля в продажах: ([\d.,]+)%/,0);
    p.monthlyIndirectExpenses=numeric(/прочие\+косвен.\/мес: ([\d.,]+)/,0);
    p.monthlySkuExpenses=numeric(/расходы на артикул\/мес: ([\d.,]+)/,0);
    // Shared fields omitted from legacy text export come from the user-supplied gzdata config.
    // Excel row fields above remain authoritative; reference results are never copied into inputs.
    const g=legacy.globals,ref=(legacy.rows as Record<string,string>[]).find(r=>r.name===sku),profile=g.profiles[Number(ref?.['in-profile']??0)];
    p.taxRatePercent=Number(g.taxrate);p.acquiringPercent=Number(g.acq);p.pvzPercent=Number(g.delivpvz);
    p.fbsPoint=profile.fbsPoint;p.fbsSpeed=profile.fbsSpeed;p.originCluster=profile.fbsOrigin;p.returnsToOzon=profile.returnsToOzon;p.fboClusters=profile.gruzim;
    // ASSUMPTION: legacy text omits return packaging; shared saved-reference defaults are 25 RUB / 25%.
    p.returnPackagingTariff=Number(ref?.['in-retpack-type']??25);p.returnPackagingPercent=Number(ref?.['in-retpack']??25);p.freeFboIntake=ref?.['in-freeintake']==='yes';
    p.leadTimeWeeks=Number(ref?.['in-leadtime']??0);p.stockUnits=Number(ref?.['in-stock']??0)||null;
   } else if(sheetName!=='Юнит-экономика')out.warnings.push(`${sku}: подробных параметров нет; проверьте настройки`);
   if(p.monthlySales===0)p.monthlySales=null;
   const errors=validateProduct(p);if(errors.length)throw Error(errors.join('; '));
   if(out.products.some(x=>x.sku===p.sku))throw Error('Дублирующийся SKU');
   out.products.push(p);
   if(sheetName==='Лист2')out.fixture[sku]={commission:numberValue(row[5]),logistics:numberValue(row[6]),advertising:numberValue(row[7]),tax:numberValue(row[8]),expensesBeforeTax:numberValue(row[9]),profit:numberValue(row[10]),margin:percentValue(row[11]),roi:percentValue(row[12],true)};
  }catch(e){out.errors.push(`Строка ${j+1}, ${sku}: ${String(e)}`);}
 }
 if(blocks.size){out.warnings.push('Недостающие общие настройки взяты из сохранённой ссылки: УСН доходы 12%, ИП, эквайринг 1,5%, FBS позже 48 ч, доупаковка возвратов 25 ₽ × 25%. Для нового расчёта проверьте настройки своего кабинета.');if(blocks.size!==out.products.length)out.errors.push('Количество SKU в Лист1 и Лист2 различается');}
 if(!out.products.length)out.errors.push('Нет товаров для импорта');
 return out;
}
export function parseExcel(data:ArrayBuffer|Uint8Array,mapping:Record<string,string>={}){return parseWorkbook(XLSX.read(data,{type:'array',cellNF:true}),mapping);}
export function buildExport(products:ProductInput[],results:Result[],settings:BusinessSettings,tariff:Tariff){
 const wb=XLSX.utils.book_new();
 const add=(name:string,rows:Record<string,unknown>[])=>{const s=XLSX.utils.json_to_sheet(rows);s['!cols']=Object.keys(rows[0]??{}).map(k=>({wch:Math.max(14,Math.min(28,k.length+2))}));XLSX.utils.book_append_sheet(wb,s,name);};
 add('Юнит-экономика',products.map((p,i)=>({...p,fboClusters:JSON.stringify(p.fboClusters),...Object.fromEntries(Object.entries(results[i]).filter(([k])=>!['sku','warnings','traces'].includes(k)).map(([k,v])=>['result_'+k,v]))})));
 const port=portfolio(products,results);
 const keys=['price','commission','logistics','intake','acquiring','advertising','tax','contributions','cost','packaging','indirect','skuExpenses','other','crossDock','insurance','profit'] as const;
 add('P&L',keys.map(k=>({Показатель:k,...Object.fromEntries(results.map((r,i)=>[r.sku,products[i].monthlySales&&products[i].monthlySales!>0?Number(r[k])*products[i].monthlySales!:null])),Итого:port.sum(k)})));
 const tariffText=JSON.stringify(tariff),chunks=tariffText.match(/.{1,30000}/gs)??[];
 add('Настройки',[{calculatorVersion:'1.0.0',tariffVersion:tariff.version,effectiveFrom:tariff.effectiveFrom,effectiveTo:tariff.effectiveTo,source:tariff.source,...settings},...chunks.map((chunk,i)=>({Параметр:`tariffJSON часть ${i+1}`,Значение:chunk}))]);
 add('Сценарии',products.flatMap(p=>compareScenarios(p,tariff).map(r=>({sku:p.sku,scenario:r.name,profit:r.profit,margin:r.margin,roi:r.roi,monthlyProfit:r.monthlyProfit,profitDelta:r.profitDelta,marginDelta:r.marginDelta,roiDelta:r.roiDelta,monthlyDelta:r.monthlyDelta}))));
 return wb;
}
export function exportExcel(products:ProductInput[],results:Result[],settings:BusinessSettings,tariff:Tariff=defaultTariff){XLSX.writeFile(buildExport(products,results,settings,tariff),'Болотина-юнит-экономика.xlsx');}

