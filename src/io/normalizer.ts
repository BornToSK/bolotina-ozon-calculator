export function numberValue(value:unknown):number|null {
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Некорректное число');return value;}
 const s=String(value).trim();if(['—','-','–',''].includes(s))return null;
 const cleaned=s.replace(/[\s\u00a0₽%]/g,'').replace(',','.');
 if(!/^[+-]?\d+(?:\.\d+)?$/.test(cleaned))throw Error(`Не удалось прочитать число «${s}»`);
 const n=Number(cleaned);if(!Number.isFinite(n))throw Error('Число вне диапазона');return n;
}
export function percentValue(value:unknown,excelPercent=false){const n=numberValue(value);return n===null?null:excelPercent&&typeof value==='number'?n*100:n;}
