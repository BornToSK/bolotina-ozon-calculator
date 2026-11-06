import type {SavedCalculation} from '../calculation/types';
import {validateProduct} from '../calculation/validation';
import {validateTariff} from '../calculation/tariffs';
export const storageKey='bolotina-calculation-v1';
export type LocalBaseline=SavedCalculation&{drrUpdate?:{id:string;values:Record<string,number>};appliedDrrUpdate?:string};
export function loadLocalBaseline(baseline:LocalBaseline,key:string,storage:Storage):LocalBaseline {
 const raw=storage.getItem(key);
 if(!raw)return baseline.drrUpdate?{...baseline,appliedDrrUpdate:baseline.drrUpdate.id}:baseline;
 const saved=validateSaved(JSON.parse(raw)) as SavedCalculation&{appliedDrrUpdate?:string};
 const update=baseline.drrUpdate;
 if(!update||saved.appliedDrrUpdate===update.id)return saved;
 const next={...saved,appliedDrrUpdate:update.id,products:saved.products.map(p=>Object.hasOwn(update.values,p.sku)?{...p,drrPercent:update.values[p.sku]}:p)};
 validateSaved(next);
 // Keep a copy of the user's calculation before applying the new source rates.
 const backup=key+':before-'+update.id;
 if(storage.getItem(backup)===null)storage.setItem(backup,raw);
 storage.setItem(key,JSON.stringify(next));
 return next;
}
export function validateSaved(data:unknown):SavedCalculation {
 const v=data as SavedCalculation;
 if(v?.calculatorVersion!=='1.0.0'||!Array.isArray(v.products)||!v.products.length||!v.settings)throw Error('Файл не является расчётом версии 1.0.0');
 validateTariff(v.tariff);if(v.tariffVersion!==v.tariff.version)throw Error('Версии тарифа не совпадают');
 for(const p of v.products){const errors=validateProduct(p);if(errors.length)throw Error(`${p.sku}: ${errors.join('; ')}`);}
 if(new Set(v.products.map(p=>p.sku)).size!==v.products.length)throw Error('Дублирующиеся SKU');
 if(['targetMargin','maxDrr','yellowMargin'].some(k=>!Object.hasOwn(v.settings,k))||Object.values(v.settings).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>100)||v.settings.yellowMargin>v.settings.targetMargin)throw Error('Некорректные бизнес-пороги');
 return v;
}
export function downloadJson(data:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
