import type {ProductInput} from './types';
export function inventory(p:ProductInput,profit:number,investment:number){
 const sales=p.monthlySales&&p.monthlySales>0?p.monthlySales:null,stock=p.stockUnits;
 const money=stock===null?null:stock*investment,turnover=sales&&stock!==null?stock/sales*4.33:null;
 return {monthlyProfit:sales===null?null:sales*profit,turnoverWeeks:turnover,moneyInStock:money,batchProfit:stock===null?null:stock*profit,annualRoi:sales&&money&&money>0?sales*profit*12/money*100:null,cycleAnnualRoi:turnover!==null&&turnover+p.leadTimeWeeks>0&&investment>0?profit/investment*100*52/(turnover+p.leadTimeWeeks):null};
}
