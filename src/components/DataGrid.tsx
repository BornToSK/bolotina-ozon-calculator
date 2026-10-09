import {memo,useMemo,useState} from 'react';
import {flexRender,getCoreRowModel,getSortedRowModel,useReactTable,type Cell,type ColumnDef,type Row,type SortingState} from '@tanstack/react-table';
import type {BusinessSettings,ProductInput,Result} from '../calculation/types';
import NumberInput from './NumberInput';
import {fmt,pct,rub} from '../ui';
import {Copy,ClipboardPaste,Columns3,ArrowDownToLine} from 'lucide-react';
export type GridRow={p:ProductInput;r:Result};
// Column render callbacks are recreated when inputs change. flexRender treats
// them as React component types, remounting the editor and losing focus/caret.
// These callbacks contain no hooks: evaluate them as templates so NumberInput
// and the native input retain their identity across calculation updates.
function renderCell(cell:Cell<GridRow,unknown>){
 const template=cell.column.columnDef.cell;
 return typeof template==='function'?template(cell.getContext()):template;
}
type ColumnLayout={width:number;left:number|undefined;sticky:boolean};
type BodyRowProps={row:Row<GridRow>;selected:Set<string>;settings:BusinessSettings;layout:Map<string,ColumnLayout>;update:(sku:string,field:keyof ProductInput,value:any)=>void};
const GridBodyRow=memo(function GridBodyRow({row,selected,layout}:BodyRowProps){
 return <tr className={selected.has(row.original.p.sku)?'selected':''}>{row.getVisibleCells().map(cell=>{
  const position=layout.get(cell.column.id)!;
  return <td key={cell.id} className={position.sticky?'sticky':''} style={{width:position.width,left:position.left}}>{renderCell(cell)}</td>;
 })}</tr>;
},(previous,next)=>previous.row.original.p===next.row.original.p&&previous.row.original.r===next.row.original.r&&previous.selected===next.selected&&previous.settings===next.settings&&previous.layout===next.layout&&previous.update===next.update);
export function marginClass(m:number,s:BusinessSettings){return m<0?'loss':m<s.yellowMargin?'bad':m<s.targetMargin?'caution':'good';}
export default function DataGrid({rows,settings,update,selected,setSelected,open,onPaste,onCopy,onFill}:{rows:GridRow[];settings:BusinessSettings;update:(sku:string,field:keyof ProductInput,value:any)=>void;selected:Set<string>;setSelected:(s:Set<string>)=>void;open:(sku:string)=>void;onPaste:(text:string)=>void;onCopy:()=>void;onFill:()=>void}){
 const [sorting,setSorting]=useState<SortingState>([]),[visibility,setVisibility]=useState({}),[showColumns,setShowColumns]=useState(false);
 const columns=useMemo<ColumnDef<GridRow>[]>(()=>{
 const input=(field:keyof ProductInput,label:string,size=104):ColumnDef<GridRow>=>({id:field,header:label,size,accessorFn:row=>row.p[field],cell:({row})=><span className={field==='drrPercent'&&row.original.p.drrPercent>settings.maxDrr?'drr-warning':''}><NumberInput label={`${row.original.p.sku} ${label}`} value={row.original.p[field] as number|null} nullable={['monthlySales','stockUnits'].includes(field)} onChange={n=>update(row.original.p.sku,field,n)}/></span>});
 const result=(field:keyof Result,label:string,percent=false):ColumnDef<GridRow>=>({id:field,header:label,size:115,accessorFn:row=>row.r[field],cell:({row})=>{const r=row.original.r,value=r[field] as number|null;return <span className={`metric ${field==='margin'?marginClass(r.margin,settings):field==='profit'?(r.profit>=0?'good':'bad'):''}`} title={r.traces[field]?`Как считается? ${r.traces[field].formula}\n${Object.entries(r.traces[field].inputs).map(([k,v])=>`${k}: ${fmt(v)}`).join('; ')}`:label}>{percent?pct(value):rub(value)}</span>;}});
 return [
 {id:'select',size:44,enableSorting:false,header:()=> <input type="checkbox" aria-label="Выбрать видимые товары" checked={!!rows.length&&rows.every(row=>selected.has(row.p.sku))} onChange={e=>{const n=new Set(selected);rows.forEach(row=>{if(e.target.checked)n.add(row.p.sku);else n.delete(row.p.sku);});setSelected(n);}}/>,cell:({row})=><input type="checkbox" aria-label={`Выбрать ${row.original.p.sku}`} checked={selected.has(row.original.p.sku)} onChange={e=>{const n=new Set(selected);if(e.target.checked)n.add(row.original.p.sku);else n.delete(row.original.p.sku);setSelected(n);}}/>},
 {id:'sku',header:'SKU',size:128,accessorFn:row=>row.p.sku,cell:({row})=><button className="sku-link" onClick={()=>open(row.original.p.sku)}>{row.original.p.sku}</button>},
 {id:'name',header:'Название',size:180,accessorFn:row=>row.p.name,cell:({row})=><input aria-label={`${row.original.p.sku} Название`} placeholder="Без названия" value={row.original.p.name??''} onChange={e=>update(row.original.p.sku,'name',e.target.value)}/>},
 {id:'fulfillment',header:'Схема',size:84,accessorFn:row=>row.p.fulfillment,cell:({row})=><select aria-label={`${row.original.p.sku} Схема`} value={row.original.p.fulfillment} onChange={e=>update(row.original.p.sku,'fulfillment',e.target.value)}><option>FBS</option><option>FBO</option></select>},
 input('sellerPrice','Цена, ₽',112),result('buyerPrice','Цена на витрине'),input('costPrice','Себест., ₽'),input('discountPercent','Скидка, %'),input('coinvestPercent','Соинвест, %'),input('commissionPercent','Комиссия, %'),input('volumeLiters','Объём, л'),input('buyoutPercent','Выкуп, %'),input('drrPercent','ДРР, %'),result('commission','Комиссия, ₽'),result('logistics','Логистика'),result('advertising','Реклама'),result('tax','Налоги'),result('totalExpenses','Все расходы'),result('profit','Прибыль / ед.'),result('margin','Маржа',true),result('roi','ROI',true),input('monthlySales','Продажи / мес.'),result('monthlyProfit','Прибыль / мес.'),input('stockUnits','Остаток, шт.')];
 },[rows,settings,selected,setSelected,update,open]);
 const table=useReactTable({data:rows,columns,getRowId:row=>row.p.sku,state:{sorting,columnVisibility:visibility},onSortingChange:setSorting,onColumnVisibilityChange:setVisibility,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),columnResizeMode:'onChange',defaultColumn:{minSize:65,maxSize:400}});
 const sticky=(id:string)=>['select','sku','name','fulfillment','sellerPrice'].includes(id);
 const left=(id:string)=>table.getVisibleLeafColumns().filter(c=>sticky(c.id)).slice(0,table.getVisibleLeafColumns().filter(c=>sticky(c.id)).findIndex(c=>c.id===id)).reduce((s,c)=>s+c.getSize(),0);
 let pinnedOffset=0;
 const layoutKey=JSON.stringify(table.getVisibleLeafColumns().map(column=>{
  const pinned=sticky(column.id),position={width:column.getSize(),left:pinned?pinnedOffset:undefined,sticky:pinned};
  if(pinned)pinnedOffset+=column.getSize();
  return [column.id,position];
 }));
 const layout=useMemo(()=>new Map<string,ColumnLayout>(JSON.parse(layoutKey)),[layoutKey]);
 return <section className="grid-card"><div className="grid-meta"><span><strong>{rows.length}</strong> товаров <span className="muted">· выбрано {selected.size}</span></span><div className="actions"><button onClick={onCopy}><Copy size={14}/>Copy</button><button onClick={async()=>{try{onPaste(await navigator.clipboard.readText());}catch{document.getElementById('paste-panel')?.focus();}}}><ClipboardPaste size={14}/>Paste</button><button onClick={onFill} disabled={!selected.size}><ArrowDownToLine size={14}/>Fill down</button><button onClick={()=>setShowColumns(!showColumns)}><Columns3 size={14}/>Колонки</button></div></div>
 {showColumns&&<div className="column-menu">{table.getAllLeafColumns().filter(c=>!sticky(c.id)).map(c=><label key={c.id}><input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()}/>{String(c.columnDef.header)}</label>)}</div>}
 <div className="table-scroll"><table className="data-table" style={{width:table.getTotalSize()}}><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} className={sticky(header.id)?'sticky':''} style={{width:header.getSize(),left:sticky(header.id)?left(header.id):undefined}}><div className="th-text" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header,header.getContext())}{header.column.getIsSorted()==='asc'?' ↑':header.column.getIsSorted()==='desc'?' ↓':''}</div><span className="resizer" onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}/></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row=><GridBodyRow key={row.original.p.sku} row={row} selected={selected} settings={settings} layout={layout} update={update}/>)}</tbody></table></div><footer className="grid-foot">Редактируйте значения в ячейках · нажмите SKU для разбора расходов · формулы — при наведении на результат</footer></section>;
}

