import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {defaultTariff} from './calculation/tariffs';
import {defaultSettings} from './io/productDefaults';
import './styles.css';
const ermosh=new URLSearchParams(location.search).get("shop")==="ermosh";
createRoot(document.getElementById('root')!).render(<React.StrictMode><App baseline={ermosh?{calculatorVersion:"1.0.0",name:"Ермошенко",savedAt:new Date().toISOString(),products:[],settings:defaultSettings,tariff:defaultTariff,tariffVersion:defaultTariff.version}:undefined}/></React.StrictMode>);
