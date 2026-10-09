import snapshot from '../../tariffs/ozon-2026-10-05.json';
import type {Tariff} from './types';
export const defaultTariff=snapshot as Tariff;
export function validateTariff(value:unknown):Tariff {
 const t=value as Tariff;
 if(!t||!/^\d{4}-\d{2}-\d{2}$/.test(t.effectiveFrom)||!t.version||!t.volumes?.length||!t.origins?.length||!t.destinations?.length)throw Error('Неверная структура тарифа');
 for(const k of ['routes','lowPriceRoutes'] as const)if(t[k]?.length!==t.volumes.length||t[k].some(v=>v.length!==t.origins.length||v.some(r=>r.length!==t.destinations.length||r.some(n=>n!==null&&(!Number.isFinite(n)||n<0)))))throw Error('Неверная матрица маршрутов');
 if(!t.FBO||!t.FBS?.intake||!t.FBS.speedPP||!t.commissions?.categories||!t.returns||!t.insurance||!t.additionalFees||!t.deferralPP||!t.logisticsCoefficients||!t.crossDock)throw Error('Не заполнены разделы тарифа');
 for(const [label,v] of Object.entries({shares:t.shares,intake:t.FBS.intake,speed:t.FBS.speedPP,deferral:t.deferralPP}))if(!v||Object.values(v).some(n=>!Number.isFinite(n)))throw Error('Неверные числа: '+label);
 if(Object.values(t.shares).some(n=>n<0)||Object.values(t.shares).reduce((s,n)=>s+n,0)<=0)throw Error('Доли кластеров должны быть положительными');
 for(const v of [t.FBO,t.commissions,t.returns,t.insurance,t.additionalFees,t.logisticsCoefficients])for(const n of Object.values(v))if(typeof n==='number'&&(!Number.isFinite(n)||n<0))throw Error('Отрицательный или неверный тариф');
 if(t.fallback?.length!==t.volumes.length||t.lowPriceFallback?.length!==t.volumes.length||[...t.fallback,...t.lowPriceFallback].some(n=>!Number.isFinite(n)||n<0))throw Error('Неверные резервные тарифы');
 return t;
}
