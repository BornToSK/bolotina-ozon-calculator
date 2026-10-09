import type {ProductInput} from './types';
export function taxes(p:ProductInput,price:number,buyer:number,marketplace:number,vatServices:number,expenses:number){
 const premium=Math.max(0,price-buyer-marketplace),revenue=buyer+premium;
 const outputVat=revenue*p.vatPercent/(100+p.vatPercent);
 const deductible=p.vatPercent>0&&p.vatPercent!==5&&p.vatPercent!==7;
 const inputVat=deductible?Math.max(0,vatServices-(price-buyer))*22/122+p.inputVatCost+(p.monthlySales&&p.monthlySales>0?p.inputVatMonthly/p.monthlySales:0):0;
 const vat=p.taxSystem==='none'?0:Math.max(0,outputVat-inputVat);
 const documented=Math.max(0,expenses-p.undocumentedUnit);
 // ASSUMPTION inherited from reference: variable IP contribution is 1% of base,
 // without annual threshold/cap. This is a forecast, not tax filing software.
 const contributions=p.legalForm==='IP'&&p.taxSystem!=='osno'&&p.taxSystem!=='none'?
  Math.max(0,p.taxSystem==='usn_income'?revenue-outputVat:price-documented-outputVat+inputVat)*.01+
  (p.monthlySales&&p.monthlySales>0?p.fixedContributionsYear*p.salesSharePercent/100/12/p.monthlySales:0):0;
 const rate=p.taxRatePercent/100;
 const incomeTax=p.taxSystem==='none'?0:p.taxSystem==='usn_income'?Math.max(0,(revenue-outputVat)*rate-contributions):p.taxSystem==='usn_profit'?Math.max((price-documented-contributions-outputVat+inputVat)*rate,revenue*.01):Math.max(0,price-outputVat-documented+inputVat)*rate;
 return {incomeTax,vat,total:incomeTax+vat,contributions,premium,outputVat,inputVat};
}
