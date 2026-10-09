import type {ProductInput,Result} from './types';
export function monthlyMetric(p:ProductInput,r:Result,key:keyof Result):number|null{return p.monthlySales&&p.monthlySales>0?Number(r[key])*p.monthlySales:null;}
export function expenseStructure(p:ReturnType<typeof portfolio>){return p.complete?[{name:'Комиссия',value:p.sum('commission')!},{name:'Логистика + приёмка',value:p.sum('logistics')!+p.sum('intake')!},{name:'Реклама',value:p.advertising!},{name:'Налоги + взносы',value:p.tax!+p.sum('contributions')!},{name:'Товар + упаковка',value:p.sum('cost')!+p.sum('packaging')!},{name:'Остальные',value:p.sum('acquiring')!+p.sum('indirect')!+p.sum('skuExpenses')!+p.sum('other')!+p.sum('crossDock')!+p.sum('insurance')!}]:[];}
export function portfolio(products:ProductInput[],results:Result[]){
 const complete=products.length>0&&products.every(p=>p.monthlySales!==null&&p.monthlySales>0);
 const sum=(key:keyof Result)=>complete?results.reduce((s,r,i)=>s+(Number(r[key])||0)*(products[i].monthlySales??0),0):null;
 const revenue=sum('price'),profit=sum('profit');
 return {complete,coverage:products.filter(p=>p.monthlySales&&p.monthlySales>0).length,revenue,profit,weightedMargin:revenue&&profit!==null?profit/revenue*100:null,averageMargin:results.length?results.reduce((s,r)=>s+r.margin,0)/results.length:null,averageRoi:results.filter(r=>r.roi!==null).length?results.reduce((s,r)=>s+(r.roi??0),0)/results.filter(r=>r.roi!==null).length:null,ozon:complete?(sum('commission')!+sum('logistics')!+sum('intake')!+sum('acquiring')!+sum('crossDock')!+sum('insurance')!):null,advertising:sum('advertising'),tax:sum('tax'),money:products.every(p=>p.stockUnits!==null)?results.reduce((s,r)=>s+(r.moneyInStock??0),0):null,sum};
}
