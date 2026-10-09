import type {ProductInput,Tariff} from './types';
export function upperVolume(label:string){const numbers=label.match(/[\d]+(?:[.,]\d+)?/g);return numbers?Number(numbers[numbers.length-1].replace(',','.')):0;}
export function logistics(p:ProductInput,price:number,t:Tariff){
 const vi=t.volumes.findIndex(v=>upperVolume(v)>=p.volumeLiters);
 if(vi<0)throw Error('Объём вне тарифной сетки');
 const rate=(o:number,d:number)=>price<=300?(t.lowPriceRoutes[vi]?.[o]?.[d]??t.lowPriceFallback[vi]):(t.routes[vi]?.[o]?.[d]??t.fallback[vi]);
 const origin=t.origins.indexOf(p.originCluster); if(origin<0)throw Error('Неизвестный кластер отгрузки');
 let f=0,r=0,sum=0;
 const stocked=new Set(p.fboClusters.map(c=>t.origins.indexOf(c)));
 if(p.fulfillment==='FBO'&&(!stocked.size||stocked.has(-1)))throw Error('Выберите известные склады FBO');
 for(const [dest,share] of Object.entries(t.shares)){
  if(share<=0)continue; const di=t.destinations.indexOf(dest);if(di<0)throw Error('Неизвестный кластер покупателя: '+dest);
  const local=t.origins.indexOf(dest);
  const source=p.fulfillment==='FBS'?origin:stocked.has(local)?local:(t.nearest[di]??[]).find(o=>stocked.has(o));
  if(source===undefined)throw Error('Нет маршрута от размещённого склада FBO');
  f+=rate(source,di)*share;
  r+=(local<0?0:p.fulfillment==='FBS'&&!p.returnsToOzon?rate(local,t.destinations.indexOf(p.originCluster)):rate(local,di))*share;sum+=share;
 }
 const b=p.buyoutPercent/100,non=1-b;
 const forward=f/sum/b*t.logisticsCoefficients.forward;
 const reverse=r/sum*non/b*t.logisticsCoefficients.reverse;
 const processing=t.returns.processing*non/b;
 const returnPackaging=p.returnPackagingTariff*p.returnPackagingPercent/100*non/b;
 const pvz=Math.min(price*p.pvzPercent/100,t.additionalFees.pvzCap)/b;
 if(p.fulfillment==='FBS'&&!(p.fbsPoint in t.FBS.intake))throw Error('Неизвестная точка сдачи FBS');
 const intake=p.fulfillment==='FBS'?t.FBS.intake[p.fbsPoint]/b:p.freeFboIntake?0:Math.min(t.FBO.intakeCap,t.FBO.intakeBase+Math.max(0,Math.ceil(upperVolume(t.volumes[vi]))-1)*t.FBO.intakePerLiter);
 return {forward,reverse,processing,returnPackaging,pvz,intake,total:forward+reverse+processing+returnPackaging+pvz};
}
