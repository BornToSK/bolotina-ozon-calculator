import type {ProductInput,Result,Tariff} from '../calculation/types';
import {portfolio,monthlyMetric} from '../calculation/portfolio';
import {compareScenarios,scenarios} from '../calculation/scenarios';
import {fmt,pct,rub} from '../ui';
export function Pnl({products,results}:{products:ProductInput[];results:Result[]}){
 const port=portfolio(products,results);
 const keys:[keyof Result,string][]=[['price','Продажи'],['commission','Комиссия Ozon'],['logistics','Логистика и возвраты'],['intake','Приёмка'],['acquiring','Эквайринг'],['advertising','Реклама'],['tax','Налоги, включая НДС'],['contributions','Взносы ИП'],['cost','Себестоимость'],['packaging','Упаковка'],['crossDock','Кросс-докинг'],['insurance','Страхование'],['indirect','Косвенные расходы'],['skuExpenses','Расходы SKU'],['other','Прочие'],['profit','Операционная прибыль']];
 return <section className="panel"><h3>P&L магазина <span className="muted">за месяц</span></h3>{!port.complete&&<div className="notice warning">Не заполнены продажи / мес.: {products.length-port.coverage} SKU. Итоги магазина не вычисляются; заполненные SKU показаны отдельно.</div>}<div className="table-scroll"><table className="report-table"><thead><tr><th>Показатель</th><th>Итого магазин</th>{products.map(p=><th key={p.sku}>{p.sku}</th>)}</tr></thead><tbody>{keys.map(([key,label])=><tr key={key}><th>{label}</th><td>{rub(port.sum(key))}</td>{results.map((r,i)=><td key={r.sku}>{rub(monthlyMetric(products[i],r,key))}</td>)}</tr>)}<tr><th>Маржинальность</th><td>{pct(port.weightedMargin)}</td>{results.map((r,i)=><td key={r.sku}>{products[i].monthlySales&&products[i].monthlySales!>0?pct(r.margin):'—'}</td>)}</tr></tbody></table></div></section>;
}
export function Scenarios({products,tariff}:{products:ProductInput[];tariff:Tariff}){
 const compared=products.map(p=>({p,scenarios:compareScenarios(p,tariff)}));
 return <section className="panel"><h3>What-if сценарии</h3><p className="muted">Каждая ячейка: прибыль / ед.; изменение прибыли; маржа и Δ п.п.; ROI и Δ п.п.; прибыль / мес. и её изменение.</p><div className="table-scroll"><table className="report-table scenarios-table"><thead><tr><th>SKU</th>{scenarios.map(s=><th key={s.name}>{s.name}</th>)}</tr></thead><tbody>{compared.map(({p,scenarios})=><tr key={p.sku}><th>{p.sku}</th>{scenarios.map(s=><td key={s.name}><b className={s.profit>=0?'good':'bad'}>{rub(s.profit)}</b><small>{s.profitDelta>0?'+':''}{rub(s.profitDelta)}</small><small>Маржа {pct(s.margin)} · Δ {fmt(s.marginDelta)} п.п.</small><small>ROI {pct(s.roi)} · Δ {fmt(s.roiDelta)} п.п.</small><small>Месяц {rub(s.monthlyProfit)} · Δ {rub(s.monthlyDelta)}</small></td>)}</tr>)}</tbody></table></div></section>;
}

