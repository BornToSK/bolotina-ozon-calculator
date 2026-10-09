export interface ProductInput {
 sku:string; name?:string; fulfillment:'FBO'|'FBS'; shipmentScheme:string; category?:string;
 sellerPrice:number; discountPercent:number; coinvestPercent:number; costPrice:number;
 extraPackagingCost:number; extraPackagingPercent:number; returnPackagingTariff:number; returnPackagingPercent:number;
 commissionPercent:number; autoCommission:boolean; volumeLiters:number; volumeBand:string;
 buyoutPercent:number; drrPercent:number; acquiringPercent:number; pvzPercent:number;
 taxSystem:'none'|'usn_income'|'usn_profit'|'osno'; taxRatePercent:number; vatPercent:number;
 legalForm:'IP'|'OOO'; inputVatCost:number; inputVatMonthly:number; undocumentedUnit:number; fixedContributionsYear:number;
 monthlySales:number|null; salesSharePercent:number; monthlyIndirectExpenses:number; monthlySkuExpenses:number;
 stockUnits:number|null; leadTimeWeeks:number; crossDockEnabled:boolean; crossDockTariff:number;
 insuranceEnabled:boolean; freeFboIntake:boolean; fbsPoint:string; fbsSpeed:string; originCluster:string;
 returnsToOzon:boolean; deferralDays:number; otherUnitExpenses:number; fboClusters:string[];
}
export interface BusinessSettings {targetMargin:number; maxDrr:number; yellowMargin:number}
export interface Tariff {
 version:string; effectiveFrom:string; effectiveTo:string|null; source:string; status:string;
 volumes:string[]; origins:string[]; destinations:string[]; routes:(number|null)[][][]; lowPriceRoutes:(number|null)[][][];
 fallback:number[]; lowPriceFallback:number[]; nearest:number[][]; shares:Record<string,number>;
 FBO:{intakeBase:number;intakePerLiter:number;intakeCap:number};
 FBS:{intake:Record<string,number>;speedPP:Record<string,number>};
 commissions:{low:number;medium:number;categories:Record<string,{FBO:number;FBS:number}>};
 logisticsCoefficients:{forward:number;reverse:number}; returns:{processing:number};
 insurance:{dailyPercent:number}; crossDock:{perLiter:number;status:string};
 additionalFees:{pvzPercent:number;pvzCap:number}; deferralPP:Record<string,number>;
}
export interface Trace {formula:string; inputs:Record<string,number|null>}
export interface Result {
 sku:string; price:number; buyerPrice:number; coinvestAmount:number; commission:number; acquiring:number;
 forwardLogistics:number; reverseLogistics:number; returnProcessing:number; returnPackaging:number;
 logistics:number; intake:number; pvz:number; crossDock:number; insurance:number;
 advertisingOrder:number; advertising:number; incomeTax:number; vat:number; tax:number; contributions:number;
 cost:number; packaging:number; indirect:number; skuExpenses:number; other:number;
 expensesBeforeTax:number; totalExpenses:number; profit:number; margin:number; roi:number|null;
 monthlyProfit:number|null; revenueMonth:number|null; turnoverWeeks:number|null; moneyInStock:number|null;
 batchProfit:number|null; annualRoi:number|null; cycleAnnualRoi:number|null;
 warnings:string[]; traces:Record<string,Trace>;
}
export interface SavedCalculation {calculatorVersion:'1.0.0'; tariffVersion:string; savedAt:string; name:string; products:ProductInput[]; settings:BusinessSettings; tariff:Tariff}
