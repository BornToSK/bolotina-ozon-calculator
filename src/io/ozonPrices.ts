import * as XLSX from 'xlsx';
import type {ProductInput, Tariff} from '../calculation/types';
import {calculate} from '../calculation/unitEconomics';
import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate';

export interface PriceItem {sku:string; name:string; price:number}
export interface TemplateMapping {sheet:string; headerRow:number; skuColumn:number; priceColumn:number}
export interface PriceChange {sku:string; previous:unknown; price:number; row:number}
export interface TemplatePreview {changes:PriceChange[]; missing:string[]; errors:string[]; untouched:number}

// The engine's price is seller revenue after the seller discount. Ozon coinvest
// changes buyerPrice only and must never be subtracted again in a price upload.
export function priceItems(products:ProductInput[],tariff:Tariff):PriceItem[] {
 const seen=new Set<string>();
 return products.map(p=>{
  if(seen.has(p.sku))throw Error(`Дублирующийся артикул: ${p.sku}`);
  seen.add(p.sku);
  const price=Math.round((calculate(p,tariff).price+Number.EPSILON)*100)/100;
  if(!Number.isFinite(price)||price<=0)throw Error(`${p.sku}: цена для Ozon должна быть больше нуля`);
  return {sku:p.sku,name:p.name??'',price};
 });
}
export function priceList(items:PriceItem[]) {
 const workbook=XLSX.utils.book_new();
 const sheet=XLSX.utils.json_to_sheet(items.map(p=>({'Артикул':p.sku,'Цена, руб.':p.price})));
 sheet['!cols']=[{wch:24},{wch:20}];
 for(let r=1;r<=items.length;r++)sheet[`B${r+1}`].z='0.00';
 XLSX.utils.book_append_sheet(workbook,sheet,'Цены');
 return workbook;
}
function normalized(value:unknown){return String(value??'').toLowerCase().replace(/ё/g,'е').replace(/[\n\r*]/g,' ').replace(/\s+/g,' ').trim();}
function skuHeader(value:unknown){return /^(артикул|артикул продавца|ваш артикул|offer[_ ]?id)(?:\s*[,(:].*)?$/.test(normalized(value));}
function priceHeader(value:unknown){return /^(цена|ваша цена|новая цена|текущая цена|цена товара|цена с учетом скидки|новая предельная цена без акций)(?:\s*[,(:].*)?$/.test(normalized(value));}
export function detectPriceTemplate(workbook:XLSX.WorkBook):TemplateMapping|null {
 for(const sheetName of workbook.SheetNames){
  const sheet=workbook.Sheets[sheetName],range=XLSX.utils.decode_range(sheet['!ref']??'A1');
  for(let r=range.s.r;r<=Math.min(range.e.r,99);r++){
   let skuColumn=-1,priceColumn=-1;
   for(let c=range.s.c;c<=Math.min(range.e.c,200);c++){
    const value=sheet[XLSX.utils.encode_cell({r,c})]?.v;
    if(skuHeader(value))skuColumn=c;
    if(priceHeader(value)&&!normalized(sheet[XLSX.utils.encode_cell({r:r+1,c})]?.v).startsWith('нередактируемое'))priceColumn=c;
   }
   if(skuColumn>=0&&priceColumn>=0)return {sheet:sheetName,headerRow:r,skuColumn,priceColumn};
  }
 }
 return null;
}
export function templateColumns(workbook:XLSX.WorkBook,mapping:TemplateMapping){
 const sheet=workbook.Sheets[mapping.sheet];
 if(!sheet)return [];
 const range=XLSX.utils.decode_range(sheet['!ref']??'A1');
 return Array.from({length:Math.min(range.e.c+1,201)},(_,c)=>({column:c,label:String(sheet[XLSX.utils.encode_cell({r:mapping.headerRow,c})]?.v??XLSX.utils.encode_col(c))}));
}
export function previewPriceTemplate(workbook:XLSX.WorkBook,mapping:TemplateMapping,items:PriceItem[]):TemplatePreview {
 const output:TemplatePreview={changes:[],missing:[],errors:[],untouched:0};
 const sheet=workbook.Sheets[mapping.sheet];
 if(!sheet){output.errors.push('Лист шаблона не найден');return output;}
 if(![mapping.headerRow,mapping.skuColumn,mapping.priceColumn].every(n=>Number.isInteger(n)&&n>=0)||mapping.skuColumn===mapping.priceColumn){output.errors.push('Проверьте строку заголовков и колонки');return output;}
 if(normalized(sheet[XLSX.utils.encode_cell({r:mapping.headerRow+1,c:mapping.priceColumn})]?.v).startsWith('нередактируемое')){output.errors.push('Выбрана нередактируемая колонка Ozon. Используйте «Новая предельная цена без акций».');return output;}
 const bySku=new Map(items.map(p=>[p.sku,p])),found=new Set<string>();
 const range=XLSX.utils.decode_range(sheet['!ref']??'A1');
 if(range.e.r>50000){output.errors.push('В шаблоне больше 50 000 строк');return output;}
 for(let r=mapping.headerRow+1;r<=range.e.r;r++){
  const sku=String(sheet[XLSX.utils.encode_cell({r,c:mapping.skuColumn})]?.v??'');
  if(['нередактируемое','редактируемое'].includes(normalized(sku))||sku.startsWith('Ваш артикул'))continue;
  const item=bySku.get(sku);
  if(!item){if(sku)output.untouched++;continue;}
  if(found.has(sku)){output.errors.push(`Артикул ${sku} повторяется в шаблоне (строка ${r+1})`);continue;}
  found.add(sku);
  // Never overwrite identifiers, base/strike-through/minimum prices or other fields.
  output.changes.push({sku,previous:sheet[XLSX.utils.encode_cell({r,c:mapping.priceColumn})]?.v??null,price:item.price,row:r});
 }
 output.missing=items.filter(p=>!found.has(p.sku)).map(p=>p.sku);
 if(!output.changes.length)output.errors.push('В шаблоне не найдено совпадающих артикулов. Загрузите шаблон цен с товарами из вашего кабинета.');
 return output;
}

function attributes(xml:string){return Object.fromEntries([...xml.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')]));}
// Patch just the price cells inside the original ZIP. All other XML members,
// styles, validations, relationships and Ozon service metadata stay byte-identical.
export function fillOriginalPriceTemplate(original:Uint8Array,mapping:TemplateMapping,items:PriceItem[]):Uint8Array {
 const workbook=XLSX.read(original,{type:'array',cellNF:true});
 const preview=previewPriceTemplate(workbook,mapping,items);
 if(preview.errors.length||preview.missing.length)throw Error([...preview.errors,...(preview.missing.length?[`Нет в шаблоне: ${preview.missing.join(', ')}`]:[])].join('; '));
 const files=unzipSync(original);
 const sheet=[...strFromU8(files['xl/workbook.xml']).matchAll(/<sheet\b([^>]*)\/?\s*>/g)].map(m=>attributes(m[1])).find(s=>s.name===mapping.sheet);
 const relation=[...strFromU8(files['xl/_rels/workbook.xml.rels']).matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map(m=>attributes(m[1])).find(r=>r.Id===sheet?.['r:id']);
 if(!relation?.Target)throw Error('Не удалось найти XML листа в исходном шаблоне');
 const sheetPath=new URL(relation.Target,'https://template.invalid/xl/workbook.xml').pathname.slice(1);
 if(!files[sheetPath])throw Error('XML листа отсутствует в шаблоне');
 let xml=strFromU8(files[sheetPath]);
 for(const change of preview.changes){
  const address=XLSX.utils.encode_cell({r:change.row,c:mapping.priceColumn});
  const cellPattern=new RegExp(`<c\\b([^>]*\\br="${address}"[^>]*)(?:/>|>[\\s\\S]*?</c>)`);
  const existing=xml.match(cellPattern);
  if(existing){const attrs=existing[1].replace(/\s+t="[^"]*"/g,'').replace(/\/$/,'');xml=xml.replace(cellPattern,()=>`<c${attrs}><v>${change.price}</v></c>`);}
  else {
   const rowPattern=new RegExp(`(<row\\b[^>]*\\br="${change.row+1}"[^>]*>)([\\s\\S]*?)(</row>)`);
   if(!rowPattern.test(xml))throw Error(`Не найдена строка ${change.row+1} исходного шаблона`);
   xml=xml.replace(rowPattern,(_,start:string,body:string,end:string)=>{
    const cell=`<c r="${address}"><v>${change.price}</v></c>`;
    const next=[...body.matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"/g)].find(m=>XLSX.utils.decode_col(m[1])>mapping.priceColumn);
    return start+(next?body.slice(0,next.index)+cell+body.slice(next.index):body+cell)+end;
   });
  }
 }
 files[sheetPath]=strToU8(xml);
 return zipSync(files,{level:6});
}
export function downloadPriceTemplate(original:Uint8Array,mapping:TemplateMapping,items:PriceItem[]){
 const bytes=fillOriginalPriceTemplate(original,mapping,items);
 const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download='Болотина-цены-Ozon.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function fillPriceTemplate(workbook:XLSX.WorkBook,mapping:TemplateMapping,items:PriceItem[]) {
 const preview=previewPriceTemplate(workbook,mapping,items);
 if(preview.errors.length||preview.missing.length)throw Error([...preview.errors,...(preview.missing.length?[`В шаблоне отсутствуют ${preview.missing.length} выбранных артикулов`]:[])].join('; '));
 const output=structuredClone(workbook),sheet=output.Sheets[mapping.sheet];
 for(const change of preview.changes){
  const address=XLSX.utils.encode_cell({r:change.row,c:mapping.priceColumn});
  const cell={...sheet[address],t:'n' as const,v:change.price};
  delete cell.f;delete cell.w;delete cell.F;
  sheet[address]=cell;
 }
 return output;
}
