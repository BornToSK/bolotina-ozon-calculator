import type {ProductInput,Tariff} from './types';
export function speedCodes(point:string){return ['pvz','utk','gorb'].includes(point)?['slot','24h','24_48h','48h']:['12h','12_24h','24_36h','36_48h','48h'];}
export function commission(p:ProductInput,price:number,t:Tariff){
 const category=p.category?t.commissions.categories[p.category]:null;
 const rate=p.autoCommission?(price<=100?t.commissions.low:price<=300?t.commissions.medium:category?.[p.fulfillment]??p.commissionPercent):p.commissionPercent;
 const speed=p.fulfillment==='FBS'&&speedCodes(p.fbsPoint).includes(p.fbsSpeed)?(t.FBS.speedPP[p.fbsSpeed]??0):0;
 return Math.max(0,price*(Math.max(0,rate-(t.deferralPP[p.deferralDays]??0))+speed)/100);
}
