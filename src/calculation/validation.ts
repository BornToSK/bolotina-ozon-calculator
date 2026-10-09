import type {ProductInput} from './types';
export function validateProduct(p:ProductInput):string[]{
 const errors:string[]=[];
 if(typeof p.sku!=='string'||!p.sku.trim())errors.push('Артикул обязателен');
 if(!Array.isArray(p.fboClusters)||p.fboClusters.some(c=>typeof c!=='string'))errors.push('Неверные склады FBO');
 if(typeof p.name!=='string'||typeof p.shipmentScheme!=='string'||typeof p.originCluster!=='string')errors.push('Не заполнены обязательные текстовые поля');
 for(const k of ['sellerPrice','costPrice','buyoutPercent','commissionPercent','drrPercent','coinvestPercent','discountPercent','volumeLiters','taxRatePercent','acquiringPercent','pvzPercent','vatPercent','returnPackagingTariff','returnPackagingPercent','extraPackagingCost','extraPackagingPercent','salesSharePercent','monthlyIndirectExpenses','monthlySkuExpenses','leadTimeWeeks','inputVatCost','inputVatMonthly','fixedContributionsYear','undocumentedUnit','crossDockTariff','otherUnitExpenses','deferralDays'] as const)if(typeof p[k]!=='number')errors.push(`${k}: обязательное числовое поле`);
 for(const [k,v] of Object.entries(p))if(typeof v==='number'&&!Number.isFinite(v))errors.push(`${k}: требуется конечное число`);
 for(const k of ['sellerPrice','costPrice','extraPackagingCost','returnPackagingTariff','volumeLiters','monthlyIndirectExpenses','monthlySkuExpenses','leadTimeWeeks','crossDockTariff','otherUnitExpenses','fixedContributionsYear','inputVatCost','inputVatMonthly','undocumentedUnit'] as const)if(p[k]<0)errors.push(`${k}: не может быть отрицательным`);
 for(const k of ['discountPercent','coinvestPercent','commissionPercent','buyoutPercent','drrPercent','acquiringPercent','pvzPercent','vatPercent','taxRatePercent','salesSharePercent','extraPackagingPercent','returnPackagingPercent'] as const)if(p[k]<0||p[k]>100)errors.push(`${k}: допустимо 0–100%`);
 if(p.buyoutPercent===0)errors.push('Выкуп должен быть больше 0%');
 if(p.monthlySales!==null&&(typeof p.monthlySales!=='number'||p.monthlySales<0))errors.push('Продажи: требуется неотрицательное число');
 if(p.stockUnits!==null&&(typeof p.stockUnits!=='number'||p.stockUnits<0))errors.push('Остаток: требуется неотрицательное число');
 if(!['FBO','FBS'].includes(p.fulfillment)||!['none','usn_income','usn_profit','osno'].includes(p.taxSystem)||!['IP','OOO'].includes(p.legalForm))errors.push('Неверная схема или налоговый режим');
 return errors;
}
