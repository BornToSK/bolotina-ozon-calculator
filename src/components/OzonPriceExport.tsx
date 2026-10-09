import {useCallback,useMemo,useRef,useState} from 'react';
import * as XLSX from 'xlsx';
import type {ProductInput,Tariff} from '../calculation/types';
import {detectPriceTemplate,downloadPriceTemplate,priceItems,priceList,previewPriceTemplate,templateColumns,type TemplateMapping} from '../io/ozonPrices';
import {rub} from '../ui';

export default function OzonPriceExport({products,visibleSkus,selected,tariff,close}:{products:ProductInput[];visibleSkus:string[];selected:Set<string>;tariff:Tariff;close:()=>void}){
 const loadVersion=useRef(0);
 const [original,setOriginal]=useState<Uint8Array|null>(null);
 const [scope,setScope]=useState(selected.size?'selected':'all'),[workbook,setWorkbook]=useState<XLSX.WorkBook|null>(null),[mapping,setMapping]=useState<TemplateMapping|null>(null),[filename,setFilename]=useState(''),[error,setError]=useState('');
 const chosen=useMemo(()=>products.filter(p=>scope==='all'||(scope==='selected'?selected.has(p.sku):visibleSkus.includes(p.sku))),[products,scope,selected,visibleSkus]);
 const computed=useMemo(()=>{try{return {items:priceItems(chosen,tariff),error:''};}catch(e){return {items:[],error:String(e)};}},[chosen,tariff]);
 const preview=workbook&&mapping?previewPriceTemplate(workbook,mapping,computed.items):null;
 const columns=workbook&&mapping?templateColumns(workbook,mapping):[];
 const readTemplate=useCallback(async(file:File)=>{const version=++loadVersion.current;setWorkbook(null);setOriginal(null);setMapping(null);setFilename('');try{
  if(file.size>20*1024*1024)throw Error('Максимальный размер шаблона — 20 МБ');
  const bytes=new Uint8Array(await file.arrayBuffer());if(version!==loadVersion.current)return;const next=XLSX.read(bytes,{type:'array',cellNF:true,cellStyles:true});setOriginal(bytes);
  const detected=detectPriceTemplate(next);
  setWorkbook(next);setFilename(file.name);setMapping(detected??{sheet:next.SheetNames[0],headerRow:0,skuColumn:0,priceColumn:1});
  setError(detected?'':'Колонки не распознаны автоматически. Укажите лист, строку заголовков, артикул и цену.');
 }catch(e){if(version===loadVersion.current)setError(String(e));}},[]);
 const download=()=>{try{
  if(!workbook||!mapping||!original)throw Error('Сначала загрузите шаблон цен Ozon');
  downloadPriceTemplate(original!,mapping,computed.items);setError('');
 }catch(e){setError(String(e));}};
 return <div className="modal-overlay"><section className="modal price-export" role="dialog" aria-label="Экспорт цен для Ozon"><header><h2>Цены для Ozon</h2><button aria-label="Закрыть экспорт цен" onClick={close}>×</button></header>
 <p>Загрузите актуальный шаблон обновления цен из вашего кабинета Ozon. Проверьте новые цены и скачайте заполненный файл.</p>
 <label className="block-label">Какие товары выгрузить<select aria-label="Товары для экспорта цен" value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Все товары ({products.length})</option><option value="selected" disabled={!selected.size}>Выбранные ({selected.size})</option><option value="visible">По текущему фильтру ({visibleSkus.length})</option></select></label>
 <p className="muted">Выгружается ваша цена после скидки продавца. Соинвест Ozon не вычитается. Себестоимость, прибыль и другие внутренние данные в колонку цены не попадают. Рекомендуемые цены сначала примените в калькуляторе.</p>
 <label className="block-label">Шаблон цен Ozon (.xlsx)<input type="file" accept=".xlsx" data-testid="ozon-price-template" onChange={e=>{const file=e.target.files?.[0];if(file)void readTemplate(file);e.target.value='';}}/></label>
 {filename&&<p>{filename}</p>}
 {mapping&&workbook&&<div className="edit-form">
 <label>Лист шаблона<select aria-label="Лист шаблона цен" value={mapping.sheet} onChange={e=>setMapping({...mapping,sheet:e.target.value})}>{workbook.SheetNames.map(s=><option key={s}>{s}</option>)}</select></label>
 <label>Строка заголовков<input aria-label="Строка заголовков цен" type="number" min="1" max="100" value={mapping.headerRow+1} onChange={e=>setMapping({...mapping,headerRow:Number(e.target.value)-1})}/></label>
 <label>Колонка артикула<select aria-label="Колонка артикула Ozon" value={mapping.skuColumn} onChange={e=>setMapping({...mapping,skuColumn:Number(e.target.value)})}>{columns.map(c=><option key={c.column} value={c.column}>{c.label}</option>)}</select></label>
 <label>Колонка новой цены<select aria-label="Колонка цены Ozon" value={mapping.priceColumn} onChange={e=>setMapping({...mapping,priceColumn:Number(e.target.value)})}>{columns.map(c=><option key={c.column} value={c.column}>{c.label}</option>)}</select></label>
 </div>}
 {(error||computed.error)&&<div className="notice error" role="alert">{error||computed.error}</div>}
 {preview&&<><p>Будет обновлено: <b>{preview.changes.length}</b>. Других строк без изменения: {preview.untouched}.</p>{preview.errors.map((e,i)=><div className="notice error" key={i}>{e}</div>)}{preview.missing.length>0&&<div className="notice error">Нет в шаблоне ({preview.missing.length}): {preview.missing.join(', ')}. Выберите нужные SKU или скачайте шаблон со всеми товарами.</div>}</>}
 <div className="price-preview"><table className="compact"><thead><tr><th>Артикул</th>{preview&&<th>Цена в шаблоне</th>}<th>Новая цена продавца</th></tr></thead><tbody>{(preview?preview.changes:computed.items).slice(0,10).map(p=><tr key={p.sku}><td>{p.sku}</td>{preview&&<td>{'previous' in p?String(p.previous??'—'):'—'}</td>}<td>{rub(p.price)}</td></tr>)}</tbody></table></div>
 <p className="muted">В шаблоне Ozon заполняется «Новая предельная цена без акций» (BD). Текущие значения и служебная структура файла сохраняются: проверьте их ограничения перед загрузкой. Приём файла кабинетом зависит от актуального шаблона Ozon.</p>
 <footer><button disabled={!computed.items.length||!!computed.error} onClick={()=>{try{XLSX.writeFile(priceList(computed.items),'Болотина-список-цен.xlsx');}catch(e){setError(String(e));}}}>Скачать список цен</button><button className="primary" disabled={!preview||!!computed.error||!computed.items.length||!!preview.errors.length||!!preview.missing.length} onClick={download}>Скачать заполненный шаблон Ozon</button></footer>
 <small className="muted">«Список цен» — два столбца для переноса; для загрузки в кабинет используйте заполненный шаблон Ozon.</small>
 </section></div>;
}
