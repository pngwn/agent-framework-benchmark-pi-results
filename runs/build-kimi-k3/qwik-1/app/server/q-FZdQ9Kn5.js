import{s as M,m,n as pe,o as me,F as U,p as fe,c as ee,i as H,q as be,b as E,d as $,t as X,w as ve,R as ge,Q as he}from"./q-BrBSDCN_.js";const O={manifestHash:"k63ze5",core:"q-B5DfOwCy.js",preloader:"q-DoNi8vyY.js",qwikLoader:"q-naDMFAHy.js",bundleGraphAsset:"assets/phYmrWhG-bundle-graph.json",injections:[],mapping:{s_bcSRfGamcdE:"q-D_L08ix_.js",s_coEBgmYKqgY:"q-DFhwuYAQ.js",s_pUGOqWyxhfk:"q-pkYFggrr.js",s_qAHWQFxHfds:"q-DFhwuYAQ.js",s_sxjG03x0uTo:"q-DFhwuYAQ.js",s_Mu408HBngsg:"q-BdEQ1-gb.js",s_U1tciZeUyKk:"q-BF2hghwu.js",s_f6SK9S2yfmw:"q-CSBE-WFe.js",s_5FuQ6jqB0ts:"q-BKAILPKT.js",s_20wt1t0Rias:"q-pkYFggrr.js",s_2WRCw8S8mSI:"q-CWpPQHk7.js",s_39r7c1CaIKs:"q-CtbKDv_E.js",s_4abDjELQ4CI:"q-CtMEODXu.js",s_6e0cvM1fmTk:"q-Drfp8auO.js",s_7ke5QlSpT3Y:"q-DFhwuYAQ.js",s_CEQ306skxNM:"q-CTn1UyKy.js",s_OBtjTjx7zdA:"q-D88jycTG.js",s_PEghzTEs2vs:"q-De69VKH2.js",s_UUWqksVd0pg:"q-_rFUrxU7.js",s_di3bXWxL4Kg:"q-D_L08ix_.js",s_eid0ise4wdU:"q-BO9zUCpO.js",s_hNe9KTtO1MQ:"q-CEYhzBgu.js",s_hPKop2OjYeU:"q-DU5qWXl5.js",s_iZzkemVDkNo:"q-VjL_Kl9-.js",s_pjFLhWmw41Q:"q-BdEQ1-gb.js",s_rGK30in9lrw:"q-DblzicHx.js",s_t7kQ3wM6e8U:"q-CUiFXF6q.js",s_vG9jg9NGntM:"q-BF2hghwu.js",s_x0eS4HCFIO8:"q-BXcLsK2h.js",s_gMa4jLszv4Q:"q-BdEQ1-gb.js",s_qN0eNszMTnk:"q-BO9zUCpO.js",s_DcaM1g7auDY:"q-B2Ze8zDc.js",s_MYflfezmDXs:"q-DrQLrqB4.js",s_dQsqAVpy26g:"q-BMECh7k9.js",s_uas8gXh8q18:"q-cH2O5FLo.js",s_30BOGgXp0Ek:"q-DblzicHx.js",s_AnDREDljA5I:"q-D88jycTG.js",s_EtEr0SMyXZ4:"q-BdEQ1-gb.js",s_EvQERBtGSJk:"q-VjL_Kl9-.js",s_O63WNee7t98:"q-VjL_Kl9-.js",s_OsTiCgAT5Z0:"q-VjL_Kl9-.js",s_eKr0d5dlSkE:"q-BdEQ1-gb.js",s_lKqAQRacZfQ:"q-D88jycTG.js",s_xl9GCjVEmXg:"q-BF2hghwu.js"}};/**
 * @license
 * @builder.io/qwik/server 1.20.3-dev+2fec922
 * Copyright Builder.io, Inc. All Rights Reserved.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/QwikDev/qwik/blob/main/LICENSE
 */var ye=!1,we="",qe=(t,...e)=>{const r=xe(ye,t,...e);debugger;return r},_e=t=>t,xe=(t,e,...r)=>{const n=e instanceof Error?e:new Error(e);return console.error("%cQWIK ERROR",we,n.message,..._e(r),n.stack),n},ke=(t,...e)=>`Code(${t}) https://github.com/QwikDev/qwik/blob/main/packages/qwik/src/core/error/error.ts#L${8+t}`,$e=11,Ee=(t,...e)=>{const r=ke(t,...e);return qe(r,...e)},Se="<sync>";function te(t,e){const r=e==null?void 0:e.mapper,n=t.symbolMapper?t.symbolMapper:(o,s,i)=>{var l;if(r){const d=C(o),c=r[d];if(!c){if(d===Se)return[d,""];if((l=globalThis.__qwik_reg_symbols)==null?void 0:l.has(d))return[o,"_"];if(i)return[o,`${i}?qrl=${o}`];console.error("Cannot resolve symbol",o,"in",r,i)}return c}};return{isServer:!0,async importSymbol(o,s,i){var c;const l=C(i),d=(c=globalThis.__qwik_reg_symbols)==null?void 0:c.get(l);if(d)return d;throw Ee($e,i)},raf:()=>(console.error("server can not rerender"),Promise.resolve()),nextTick:o=>new Promise(s=>{setTimeout(()=>{s(o())})}),chunkForSymbol(o,s,i){return n(o,r,i)}}}async function je(t,e){const r=te(t,e);M(r)}var C=t=>{const e=t.lastIndexOf("_");return e>-1?t.slice(e+1):t},Pe="q:instance",T={$DEBUG$:!1,$invPreloadProbability$:.65},Ae=Date.now(),Ce=/\.[mc]?js$/,re=0,Ne=1,De=2,Be=3,I,z,Le=(t,e)=>({$name$:t,$state$:Ce.test(t)?re:Be,$deps$:ae?e==null?void 0:e.map(r=>({...r,$factor$:1})):e,$inverseProbability$:1,$createdTs$:Date.now(),$waitedMs$:0,$loadedMs$:0}),Oe=t=>{const e=new Map;let r=0;for(;r<t.length;){const n=t[r++],a=[];let o,s=1;for(;o=t[r],typeof o=="number";)o<0?s=-o/10:a.push({$name$:t[o],$importProbability$:s,$factor$:1}),r++;e.set(n,a)}return e},ne=t=>{let e=Q.get(t);if(!e){let r;if(z){if(r=z.get(t),!r)return;r.length||(r=void 0)}e=Le(t,r),Q.set(t,e)}return e},Te=(t,e)=>{e&&("debug"in e&&(T.$DEBUG$=!!e.debug),typeof e.preloadProbability=="number"&&(T.$invPreloadProbability$=1-e.preloadProbability)),!(I!=null||!t)&&(I="",z=Oe(t))},Q=new Map,ae,N,oe=0,S=[],Ie=(...t)=>{console.log(`Preloader ${Date.now()-Ae}ms ${oe}/${S.length} queued>`,...t)},ze=()=>{Q.clear(),N=!1,ae=!0,oe=0,S.length=0},Qe=()=>{N&&(S.sort((t,e)=>t.$inverseProbability$-e.$inverseProbability$),N=!1)},Fe=()=>{Qe();let t=.4;const e=[];for(const r of S){const n=Math.round((1-r.$inverseProbability$)*10);n!==t&&(t=n,e.push(t)),e.push(r.$name$)}return e},se=(t,e,r)=>{if(r!=null&&r.has(t))return;const n=t.$inverseProbability$;if(t.$inverseProbability$=e,!(n-t.$inverseProbability$<.01)&&(I!=null&&t.$state$<De&&(t.$state$===re&&(t.$state$=Ne,S.push(t),T.$DEBUG$&&Ie(`queued ${Math.round((1-t.$inverseProbability$)*100)}%`,t.$name$)),N=!0),t.$deps$)){r||(r=new Set),r.add(t);const a=1-t.$inverseProbability$;for(const o of t.$deps$){const s=ne(o.$name$);if(s.$inverseProbability$===0)continue;let i;if(a===1||a>=.99&&F<100)F++,i=Math.min(.01,1-o.$importProbability$);else{const l=1-o.$importProbability$*a,d=o.$factor$,c=l/d;i=Math.max(.02,s.$inverseProbability$*c),o.$factor$=c}se(s,i,r)}}},Z=(t,e)=>{const r=ne(t);r&&r.$inverseProbability$>e&&se(r,e)},F,Re=(t,e)=>{if(!(t!=null&&t.length))return;F=0;let r=e?1-e:.4;if(Array.isArray(t))for(let n=t.length-1;n>=0;n--){const a=t[n];typeof a=="number"?r=1-a/10:Z(a,r)}else Z(t,r)};function Ue(t){const e=[],r=n=>{if(n)for(const a of n)e.includes(a.url)||(e.push(a.url),a.imports&&r(a.imports))};return r(t),e}var He=t=>{var n;const e=fe(),r=(n=t==null?void 0:t.qrls)==null?void 0:n.map(a=>{var l;const o=a.$refSymbol$||a.$symbol$,s=a.$chunk$,i=e.chunkForSymbol(o,s,(l=a.dev)==null?void 0:l.file);return i?i[1]:s}).filter(Boolean);return[...new Set(r)]};function Ke(t,e,r){const n=e.prefetchStrategy;if(n===null)return[];if(!(r!=null&&r.manifest.bundleGraph))return He(t);if(typeof(n==null?void 0:n.symbolsToPrefetch)=="function")try{const o=n.symbolsToPrefetch({manifest:r.manifest});return Ue(o)}catch(o){console.error("getPrefetchUrls, symbolsToPrefetch()",o)}const a=new Set;for(const o of(t==null?void 0:t.qrls)||[]){const s=C(o.$refSymbol$||o.$symbol$);s&&s.length>=10&&a.add(s)}return[...a]}var Ge=(t,e)=>{if(!(e!=null&&e.manifest.bundleGraph))return[...new Set(t)];ze();let r=.99;for(const n of t.slice(0,15))Re(n,r),r*=.85;return Fe()},R=(t,e)=>{if(e==null)return null;const r=`${t}${e}`.split("/"),n=[];for(const a of r)a===".."&&n.length>0?n.pop():n.push(a);return n.join("/")},We=(t,e,r,n,a)=>{var l;const o=R(t,(l=e==null?void 0:e.manifest)==null?void 0:l.preloader),s="/"+(e==null?void 0:e.manifest.bundleGraphAsset);if(o&&s&&r!==!1){const d=typeof r=="object"?{debug:r.debug,preloadProbability:r.ssrPreloadProbability}:void 0;Te(e==null?void 0:e.manifest.bundleGraph,d);const c=[];r!=null&&r.debug&&c.push("d:1"),r!=null&&r.maxIdlePreloads&&c.push(`P:${r.maxIdlePreloads}`),r!=null&&r.preloadProbability&&c.push(`Q:${r.preloadProbability}`);const v=c.length?`,{${c.join(",")}}`:"",q=`let b=fetch("${s}");import("${o}").then(({l})=>l(${JSON.stringify(t)},b${v}));`;n.push(m("link",{rel:"modulepreload",href:o,nonce:a,crossorigin:"anonymous"}),m("link",{rel:"preload",href:s,as:"fetch",crossorigin:"anonymous",nonce:a}),m("script",{type:"module",async:!0,dangerouslySetInnerHTML:q,nonce:a}))}const i=R(t,e==null?void 0:e.manifest.core);i&&n.push(m("link",{rel:"modulepreload",href:i,nonce:a}))},Ye=(t,e,r,n,a)=>{if(n.length===0||r===!1)return null;const{ssrPreloads:o,ssrPreloadProbability:s}=Je(typeof r=="boolean"?void 0:r);let i=o;const l=[],d=[],c=e==null?void 0:e.manifest.manifestHash;if(i){const h=e==null?void 0:e.manifest.preloader,u=e==null?void 0:e.manifest.core,b=Ge(n,e);let x=4;const j=s*10;for(const g of b)if(typeof g=="string"){if(x<j)break;if(g===h||g===u)continue;if(d.push(g),--i===0)break}else x=g}const v=R(t,c&&(e==null?void 0:e.manifest.preloader));let _=d.length?`${JSON.stringify(d)}.map((l,e)=>{e=document.createElement('link');e.rel='modulepreload';e.href=${JSON.stringify(t)}+l;document.head.appendChild(e)});`:"";return v&&(_+=`window.addEventListener('load',f=>{f=_=>import("${v}").then(({p})=>p(${JSON.stringify(n)}));try{requestIdleCallback(f,{timeout:2000})}catch(e){setTimeout(f,200)}})`),_&&l.push(m("script",{type:"module","q:type":"preload",async:!0,dangerouslySetInnerHTML:_,nonce:a})),l.length>0?m(U,{children:l}):null},Ve=(t,e,r,n,a)=>{var o;if(r.preloader!==!1){const s=Ke(e,r,n);if(s.length>0){const i=Ye(t,n,r.preloader,s,(o=r.serverData)==null?void 0:o.nonce);i&&a.push(i)}}};function Je(t){return{...Xe,...t}}var Xe={ssrPreloads:7,ssrPreloadProbability:.5,debug:!1,maxIdlePreloads:25,preloadProbability:.35},Ze='const t=document,e=window,n=new Set,o=new Set([t]);let r;const s=(t,e)=>Array.from(t.querySelectorAll(e)),a=t=>{const e=[];return o.forEach(n=>e.push(...s(n,t))),e},i=t=>{w(t),s(t,"[q\\\\:shadowroot]").forEach(t=>{const e=t.shadowRoot;e&&i(e)})},c=t=>t&&"function"==typeof t.then,l=(t,e,n=e.type)=>{a("[on"+t+"\\\\:"+n+"]").forEach(o=>{b(o,t,e,n)})},f=e=>{if(void 0===e._qwikjson_){let n=(e===t.documentElement?t.body:e).lastElementChild;for(;n;){if("SCRIPT"===n.tagName&&"qwik/json"===n.getAttribute("type")){e._qwikjson_=JSON.parse(n.textContent.replace(/\\\\x3C(\\/?script)/gi,"<$1"));break}n=n.previousElementSibling}}},p=(t,e)=>new CustomEvent(t,{detail:e}),b=async(e,n,o,r=o.type)=>{const s="on"+n+":"+r;e.hasAttribute("preventdefault:"+r)&&o.preventDefault(),e.hasAttribute("stoppropagation:"+r)&&o.stopPropagation();const a=e._qc_,i=a&&a.li.filter(t=>t[0]===s);if(i&&i.length>0){for(const t of i){const n=t[1].getFn([e,o],()=>e.isConnected)(o,e),r=o.cancelBubble;c(n)&&await n,r&&o.stopPropagation()}return}const l=e.getAttribute(s);if(l){const n=e.closest("[q\\\\:container]"),r=n.getAttribute("q:base"),s=n.getAttribute("q:version")||"unknown",a=n.getAttribute("q:manifest-hash")||"dev",i=new URL(r,t.baseURI);for(const p of l.split("\\n")){const l=new URL(p,i),b=l.href,h=l.hash.replace(/^#?([^?[|]*).*$/,"$1")||"default",q=performance.now();let _,d,y;const w=p.startsWith("#"),g={qBase:r,qManifest:a,qVersion:s,href:b,symbol:h,element:e,reqTime:q};if(w){const e=n.getAttribute("q:instance");_=(t["qFuncs_"+e]||[])[Number.parseInt(h)],_||(d="sync",y=Error("sym:"+h))}else{u("qsymbol",g);const t=l.href.split("#")[0];try{const e=import(t);f(n),_=(await e)[h],_||(d="no-symbol",y=Error(`${h} not in ${t}`))}catch(t){d||(d="async"),y=t}}if(!_){u("qerror",{importError:d,error:y,...g}),console.error(y);break}const m=t.__q_context__;if(e.isConnected)try{t.__q_context__=[e,o,l];const n=_(o,e);c(n)&&await n}catch(t){u("qerror",{error:t,...g})}finally{t.__q_context__=m}}}},u=(e,n)=>{t.dispatchEvent(p(e,n))},h=t=>t.replace(/([A-Z])/g,t=>"-"+t.toLowerCase()),q=async t=>{let e=h(t.type),n=t.target;for(l("-document",t,e);n&&n.getAttribute;){const o=b(n,"",t,e);let r=t.cancelBubble;c(o)&&await o,r||(r=r||t.cancelBubble||n.hasAttribute("stoppropagation:"+t.type)),n=t.bubbles&&!0!==r?n.parentElement:null}},_=t=>{l("-window",t,h(t.type))},d=()=>{const s=t.readyState;if(!r&&("interactive"==s||"complete"==s)&&(o.forEach(i),r=1,u("qinit"),(e.requestIdleCallback??e.setTimeout).bind(e)(()=>u("qidle")),n.has("qvisible"))){const t=a("[on\\\\:qvisible]"),e=new IntersectionObserver(t=>{for(const n of t)n.isIntersecting&&(e.unobserve(n.target),b(n.target,"",p("qvisible",n)))});t.forEach(t=>e.observe(t))}},y=(t,e,n,o=!1)=>{t.addEventListener(e,n,{capture:o,passive:!1})},w=(...t)=>{for(const r of t)"string"==typeof r?n.has(r)||(o.forEach(t=>y(t,r,q,!0)),y(e,r,_,!0),n.add(r)):o.has(r)||(n.forEach(t=>y(r,t,q,!0)),o.add(r))};if(!("__q_context__"in t)){t.__q_context__=0;const r=e.qwikevents;r&&(Array.isArray(r)?w(...r):w("click","input")),e.qwikevents={events:n,roots:o,push:w},y(t,"readystatechange",d),d()}',Me=`const doc = document;
const win = window;
const events = /* @__PURE__ */ new Set();
const roots = /* @__PURE__ */ new Set([doc]);
let hasInitialized;
const nativeQuerySelectorAll = (root, selector) => Array.from(root.querySelectorAll(selector));
const querySelectorAll = (query) => {
  const elements = [];
  roots.forEach((root) => elements.push(...nativeQuerySelectorAll(root, query)));
  return elements;
};
const findShadowRoots = (fragment) => {
  processEventOrNode(fragment);
  nativeQuerySelectorAll(fragment, "[q\\\\:shadowroot]").forEach((parent) => {
    const shadowRoot = parent.shadowRoot;
    shadowRoot && findShadowRoots(shadowRoot);
  });
};
const isPromise = (promise) => promise && typeof promise.then === "function";
const broadcast = (infix, ev, type = ev.type) => {
  querySelectorAll("[on" + infix + "\\\\:" + type + "]").forEach((el) => {
    dispatch(el, infix, ev, type);
  });
};
const resolveContainer = (containerEl) => {
  if (containerEl._qwikjson_ === void 0) {
    const parentJSON = containerEl === doc.documentElement ? doc.body : containerEl;
    let script = parentJSON.lastElementChild;
    while (script) {
      if (script.tagName === "SCRIPT" && script.getAttribute("type") === "qwik/json") {
        containerEl._qwikjson_ = JSON.parse(
          script.textContent.replace(/\\\\x3C(\\/?script)/gi, "<$1")
        );
        break;
      }
      script = script.previousElementSibling;
    }
  }
};
const createEvent = (eventName, detail) => new CustomEvent(eventName, {
  detail
});
const dispatch = async (element, onPrefix, ev, eventName = ev.type) => {
  const attrName = "on" + onPrefix + ":" + eventName;
  if (element.hasAttribute("preventdefault:" + eventName)) {
    ev.preventDefault();
  }
  if (element.hasAttribute("stoppropagation:" + eventName)) {
    ev.stopPropagation();
  }
  const ctx = element._qc_;
  const relevantListeners = ctx && ctx.li.filter((li) => li[0] === attrName);
  if (relevantListeners && relevantListeners.length > 0) {
    for (const listener of relevantListeners) {
      const results = listener[1].getFn([element, ev], () => element.isConnected)(ev, element);
      const cancelBubble = ev.cancelBubble;
      if (isPromise(results)) {
        await results;
      }
      if (cancelBubble) {
        ev.stopPropagation();
      }
    }
    return;
  }
  const attrValue = element.getAttribute(attrName);
  if (attrValue) {
    const container = element.closest("[q\\\\:container]");
    const qBase = container.getAttribute("q:base");
    const qVersion = container.getAttribute("q:version") || "unknown";
    const qManifest = container.getAttribute("q:manifest-hash") || "dev";
    const base = new URL(qBase, doc.baseURI);
    for (const qrl of attrValue.split("\\n")) {
      const url = new URL(qrl, base);
      const href = url.href;
      const symbol = url.hash.replace(/^#?([^?[|]*).*$/, "$1") || "default";
      const reqTime = performance.now();
      let handler;
      let importError;
      let error;
      const isSync = qrl.startsWith("#");
      const eventData = {
        qBase,
        qManifest,
        qVersion,
        href,
        symbol,
        element,
        reqTime
      };
      if (isSync) {
        const hash = container.getAttribute("q:instance");
        handler = (doc["qFuncs_" + hash] || [])[Number.parseInt(symbol)];
        if (!handler) {
          importError = "sync";
          error = new Error("sym:" + symbol);
        }
      } else {
        emitEvent("qsymbol", eventData);
        const uri = url.href.split("#")[0];
        try {
          const module = import(
                        uri
          );
          resolveContainer(container);
          handler = (await module)[symbol];
          if (!handler) {
            importError = "no-symbol";
            error = new Error(\`\${symbol} not in \${uri}\`);
          }
        } catch (err) {
          importError || (importError = "async");
          error = err;
        }
      }
      if (!handler) {
        emitEvent("qerror", {
          importError,
          error,
          ...eventData
        });
        console.error(error);
        break;
      }
      const previousCtx = doc.__q_context__;
      if (element.isConnected) {
        try {
          doc.__q_context__ = [element, ev, url];
          const results = handler(ev, element);
          if (isPromise(results)) {
            await results;
          }
        } catch (error2) {
          emitEvent("qerror", { error: error2, ...eventData });
        } finally {
          doc.__q_context__ = previousCtx;
        }
      }
    }
  }
};
const emitEvent = (eventName, detail) => {
  doc.dispatchEvent(createEvent(eventName, detail));
};
const camelToKebab = (str) => str.replace(/([A-Z])/g, (a) => "-" + a.toLowerCase());
const processDocumentEvent = async (ev) => {
  let type = camelToKebab(ev.type);
  let element = ev.target;
  broadcast("-document", ev, type);
  while (element && element.getAttribute) {
    const results = dispatch(element, "", ev, type);
    let cancelBubble = ev.cancelBubble;
    if (isPromise(results)) {
      await results;
    }
    cancelBubble || (cancelBubble = cancelBubble || ev.cancelBubble || element.hasAttribute("stoppropagation:" + ev.type));
    element = ev.bubbles && cancelBubble !== true ? element.parentElement : null;
  }
};
const processWindowEvent = (ev) => {
  broadcast("-window", ev, camelToKebab(ev.type));
};
const processReadyStateChange = () => {
  const readyState = doc.readyState;
  if (!hasInitialized && (readyState == "interactive" || readyState == "complete")) {
    roots.forEach(findShadowRoots);
    hasInitialized = 1;
    emitEvent("qinit");
    const riC = win.requestIdleCallback ?? win.setTimeout;
    riC.bind(win)(() => emitEvent("qidle"));
    if (events.has("qvisible")) {
      const results = querySelectorAll("[on\\\\:qvisible]");
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            dispatch(entry.target, "", createEvent("qvisible", entry));
          }
        }
      });
      results.forEach((el) => observer.observe(el));
    }
  }
};
const addEventListener = (el, eventName, handler, capture = false) => {
  el.addEventListener(eventName, handler, { capture, passive: false });
};
const processEventOrNode = (...eventNames) => {
  for (const eventNameOrNode of eventNames) {
    if (typeof eventNameOrNode === "string") {
      if (!events.has(eventNameOrNode)) {
        roots.forEach(
          (root) => addEventListener(root, eventNameOrNode, processDocumentEvent, true)
        );
        addEventListener(win, eventNameOrNode, processWindowEvent, true);
        events.add(eventNameOrNode);
      }
    } else {
      if (!roots.has(eventNameOrNode)) {
        events.forEach(
          (eventName) => addEventListener(eventNameOrNode, eventName, processDocumentEvent, true)
        );
        roots.add(eventNameOrNode);
      }
    }
  }
};
if (!("__q_context__" in doc)) {
  doc.__q_context__ = 0;
  const qwikevents = win.qwikevents;
  if (qwikevents) {
    if (Array.isArray(qwikevents)) {
      processEventOrNode(...qwikevents);
    } else {
      processEventOrNode("click", "input");
    }
  }
  win.qwikevents = {
    events,
    roots,
    push: processEventOrNode
  };
  addEventListener(doc, "readystatechange", processReadyStateChange);
  processReadyStateChange();
}`;function et(t={}){return t.debug?Me:Ze}function L(){if(typeof performance>"u")return()=>0;const t=performance.now();return()=>(performance.now()-t)/1e6}function tt(t){let e=t.base;return typeof t.base=="function"&&(e=t.base(t)),typeof e=="string"?(e.endsWith("/")||(e+="/"),e):"/build/"}var rt="<!DOCTYPE html>";async function nt(t,e){var W,Y;let r=e.stream,n=0,a=0,o=0,s=0,i="",l;const d=((W=e.streaming)==null?void 0:W.inOrder)??{strategy:"auto",maximunInitialChunk:5e4,maximunChunk:3e4},c=e.containerTagName??"html",v=e.containerAttributes??{},q=r,_=L(),h=tt(e),u=ie(e.manifest),b=(Y=e.serverData)==null?void 0:Y.nonce;function x(){i&&(q.write(i),i="",n=0,o++,o===1&&(s=_()))}function j(p){const f=p.length;n+=f,a+=f,i+=p}switch(d.strategy){case"disabled":r={write:j};break;case"direct":r=q;break;case"auto":let p=0,f=!1;const V=d.maximunChunk??0,B=d.maximunInitialChunk??0;r={write(y){y==="<!--qkssr-f-->"?f||(f=!0):y==="<!--qkssr-pu-->"?p++:y==="<!--qkssr-po-->"?p--:j(y),p===0&&(f||n>=(o===0?B:V))&&(f=!1,x())}};break}c==="html"?r.write(rt):r.write("<!--cq-->"),u||console.warn("Missing client manifest, loading symbols in the client might 404. Please ensure the client build has run and generated the manifest for the server build."),await je(e,u);const g=u==null?void 0:u.manifest.injections,P=g?g.map(p=>m(p.tag,p.attributes??{})):[];let A=e.qwikLoader?typeof e.qwikLoader=="object"?e.qwikLoader.include==="never"?2:0:e.qwikLoader==="inline"?1:e.qwikLoader==="never"?2:0:0;const D=u==null?void 0:u.manifest.qwikLoader;if(A===0&&!D&&(A=1),A===0)P.unshift(m("link",{rel:"modulepreload",href:`${h}${D}`,nonce:b}),m("script",{type:"module",async:!0,src:`${h}${D}`,nonce:b}));else if(A===1){const p=et({debug:e.debug});P.unshift(m("script",{id:"qwikloader",type:"module",async:!0,nonce:b,dangerouslySetInnerHTML:p}))}We(h,u,e.preloader,P,b);const le=L(),ce=[];let K=0,G=0;await pe(t,{stream:r,containerTagName:c,containerAttributes:v,serverData:e.serverData,base:h,beforeContent:P,beforeClose:async(p,f,V,B)=>{K=le();const y=L();l=await me(p,f,void 0,B);const w=[];Ve(h,l,e,u,w);const ue=JSON.stringify(l.state,void 0,void 0);if(w.push(m("script",{type:"qwik/json",dangerouslySetInnerHTML:ot(ue),nonce:b})),l.funcs.length>0){const k=v[Pe];w.push(m("script",{"q:func":"qwik/json",dangerouslySetInnerHTML:lt(k,l.funcs),nonce:b}))}const J=Array.from(f.$events$,k=>JSON.stringify(k));if(J.length>0){const k=`(window.qwikevents||(window.qwikevents=[])).push(${J.join(",")})`;w.push(m("script",{dangerouslySetInnerHTML:k,nonce:b}))}return st(ce,p),G=y(),m(U,{children:w})},manifestHash:(u==null?void 0:u.manifest.manifestHash)||"dev"+at()}),c!=="html"&&r.write("<!--/cq-->"),x();const de=l.resources.some(p=>p._cache!==1/0);return{prefetchResources:void 0,snapshotResult:l,flushes:o,manifest:u==null?void 0:u.manifest,size:a,isStatic:!de,timing:{render:K,snapshot:G,firstFlush:s}}}function at(){return Math.random().toString(36).slice(2)}function ie(t){const e=t?{...O,...t}:O;if(!e||"mapper"in e)return e;if(e.mapping){const r={};return Object.entries(e.mapping).forEach(([n,a])=>{r[C(n)]=[n,a]}),{mapper:r,manifest:e,injections:e.injections||[]}}}var ot=t=>t.replace(/<(\/?script)/gi,"\\x3C$1");function st(t,e){var r;for(const n of e){const a=(r=n.$componentQrl$)==null?void 0:r.getSymbol();a&&!t.includes(a)&&t.push(a)}}var it='document["qFuncs_HASH"]=';function lt(t,e){return it.replace("HASH",t)+`[${e.join(`,
`)}]`}async function vt(t){const e=te({},ie(t));M(e)}const ct=()=>{const t=be();return E(U,{children:[$("title",null,null,t.title,1,null),t.meta.map(e=>X("meta",{...e},null,0,e.key)),t.links.map(e=>X("link",{...e},null,0,e.key))]},1,"w3_0")},dt=ee(H(ct,"s_x0eS4HCFIO8")),ut=':root{--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;--text-xs: .75rem;--text-sm: .875rem;--text-base: 1rem;--text-lg: 1.25rem;--text-xl: 1.5rem;--text-2xl: 2rem;--leading-tight: 1.25;--leading-normal: 1.5;--weight-normal: 400;--weight-semibold: 600;--weight-bold: 700;--space-1: .25rem;--space-2: .5rem;--space-3: .75rem;--space-4: 1rem;--space-5: 1.5rem;--space-6: 2rem;--space-7: 3rem;--content-max-width: 72rem;--header-height: 3.5rem;--radius-sm: .25rem;--radius-md: .5rem;--radius-pill: 999px;--card-min-width: 9.5rem;--sprite-size: 96px;--artwork-size: 18rem;--color-bg: #f5f6f8;--color-surface: #ffffff;--color-text: #1b2230;--color-text-muted: #556070;--color-border: #dde1e8;--color-link: #1d5cc4;--color-accent: #c8102e;--color-on-accent: #ffffff;--color-stat-bar: #3f7de0;--color-stat-track: #e8ebf0;--color-focus: #1d5cc4;--type-normal: #6b6b47;--type-fighting: #a8281f;--type-flying: #5c4fb8;--type-poison: #86338a;--type-ground: #8a6d1f;--type-rock: #7e6b24;--type-bug: #62711a;--type-ghost: #5b4785;--type-steel: #5f6d7e;--type-fire: #c2410c;--type-water: #2a5fc4;--type-grass: #3f7d1f;--type-electric: #8a6a00;--type-psychic: #c0265a;--type-ice: #25777b;--type-dragon: #5228c9;--type-dark: #4f4036;--type-fairy: #a3407a;--color-on-type: #ffffff}*,*:before,*:after{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:var(--font-sans);font-size:var(--text-base);line-height:var(--leading-normal);background:var(--color-bg);color:var(--color-text)}a{color:var(--color-link)}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--color-focus);outline-offset:2px}.container{max-width:var(--content-max-width);margin-inline:auto;padding-inline:var(--space-4)}.site-header{background:var(--color-accent);color:var(--color-on-accent)}.site-header-inner{display:flex;align-items:center;justify-content:space-between;height:var(--header-height)}.brand{color:var(--color-on-accent);font-size:var(--text-lg);font-weight:var(--weight-bold);text-decoration:none}.site-nav{display:flex;gap:var(--space-5)}.site-nav a{color:var(--color-on-accent);text-decoration:none}.site-nav a:hover{text-decoration:underline}main.container{padding-block:var(--space-6)}h1{font-size:var(--text-2xl);line-height:var(--leading-tight);font-weight:var(--weight-bold);margin:0 0 var(--space-5)}h2{font-size:var(--text-xl);line-height:var(--leading-tight);font-weight:var(--weight-semibold);margin:0 0 var(--space-4)}p{margin:0 0 var(--space-4)}.site-footer{background:var(--color-surface);border-top:1px solid var(--color-border);margin-top:var(--space-7);padding:var(--space-5) var(--space-4);text-align:center;color:var(--color-text-muted);font-size:var(--text-sm)}.site-footer p{margin:0}.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-5)}section.card{margin-bottom:var(--space-6)}.muted{color:var(--color-text-muted)}.count{color:var(--color-text-muted);font-size:var(--text-sm);margin:0 0 var(--space-4)}.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:var(--space-4);margin-bottom:var(--space-4)}@media (max-width: 640px){.filters{grid-template-columns:1fr}}.field label{display:block;font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-1)}.field input,.field select{width:100%;padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit}.card-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--card-min-width),1fr));gap:var(--space-4)}.poke-card{display:block;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4);text-align:center;text-decoration:none;color:inherit}.poke-card:hover{border-color:var(--color-text-muted)}.poke-card img{width:var(--sprite-size);height:var(--sprite-size);margin-inline:auto;object-fit:contain}.poke-num{display:block;font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-2)}.poke-name{display:block;font-weight:var(--weight-semibold)}.poke-note{display:block;font-size:var(--text-xs);color:var(--color-text-muted);margin-top:var(--space-1)}.badge-list{display:flex;flex-wrap:wrap;gap:var(--space-1);justify-content:center;margin-top:var(--space-2)}.type-badge{display:inline-block;padding:0 var(--space-2);border-radius:var(--radius-pill);color:var(--color-on-type);font-size:var(--text-xs);line-height:1.7;text-decoration:none;white-space:nowrap}.type-normal{background:var(--type-normal)}.type-fighting{background:var(--type-fighting)}.type-flying{background:var(--type-flying)}.type-poison{background:var(--type-poison)}.type-ground{background:var(--type-ground)}.type-rock{background:var(--type-rock)}.type-bug{background:var(--type-bug)}.type-ghost{background:var(--type-ghost)}.type-steel{background:var(--type-steel)}.type-fire{background:var(--type-fire)}.type-water{background:var(--type-water)}.type-grass{background:var(--type-grass)}.type-electric{background:var(--type-electric)}.type-psychic{background:var(--type-psychic)}.type-ice{background:var(--type-ice)}.type-dragon{background:var(--type-dragon)}.type-dark{background:var(--type-dark)}.type-fairy{background:var(--type-fairy)}.pagination{display:flex;align-items:center;justify-content:center;gap:var(--space-5);margin-top:var(--space-6)}.poke-hero{display:flex;gap:var(--space-6);flex-wrap:wrap;margin-bottom:var(--space-6)}.poke-hero .artwork{width:var(--artwork-size);height:var(--artwork-size);max-width:100%;object-fit:contain;flex-shrink:0}.hero-info{flex:1;min-width:14rem}.hero-info h1{margin:0 0 var(--space-2)}.hero-dex{font-size:var(--text-sm);color:var(--color-text-muted);margin:0}.hero-genus{color:var(--color-text-muted);margin:0 0 var(--space-3)}.hero-types{display:flex;gap:var(--space-2);margin:0 0 var(--space-4)}.hero-types .type-badge{font-size:var(--text-sm);padding:0 var(--space-3)}.kv-list{display:flex;flex-wrap:wrap;gap:var(--space-6);margin:0 0 var(--space-4)}.kv-list dt{font-size:var(--text-sm);color:var(--color-text-muted)}.kv-list dd{margin:0;font-weight:var(--weight-semibold)}.stats-table{width:100%;border-collapse:collapse}.stats-table th,.stats-table td{padding:var(--space-2) var(--space-3);text-align:left;vertical-align:middle}.stats-table th{font-weight:var(--weight-normal);width:6rem}.stats-table td.stat-value{width:3rem}.stats-table tr.total th,.stats-table tr.total td{font-weight:var(--weight-semibold);border-top:1px solid var(--color-border)}.stat-track{background:var(--color-stat-track);border-radius:var(--radius-pill);height:.5rem;overflow:hidden}.stat-bar{background:var(--color-stat-bar);height:100%;border-radius:var(--radius-pill)}.link-list{margin:0;padding-left:var(--space-5)}.link-list li{margin-bottom:var(--space-1)}.hidden-note{color:var(--color-text-muted);font-size:var(--text-sm)}.game-picker{display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5)}.game-picker label{font-size:var(--text-sm);color:var(--color-text-muted)}.game-picker select{padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit;min-width:16rem}.moves-table{width:100%;border-collapse:collapse;margin-bottom:var(--space-6)}.moves-table caption{text-align:left;font-size:var(--text-lg);font-weight:var(--weight-semibold);padding:0 0 var(--space-3)}.moves-table th{text-align:left;font-size:var(--text-sm);font-weight:var(--weight-normal);color:var(--color-text-muted);border-bottom:1px solid var(--color-border);padding:var(--space-2) var(--space-3)}.moves-table th button{all:unset;cursor:pointer}.moves-table th button:hover{color:var(--color-text)}.moves-table th[aria-sort=ascending] button:after{content:" ▲";font-size:var(--text-xs)}.moves-table th[aria-sort=descending] button:after{content:" ▼";font-size:var(--text-xs)}.moves-table td{padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--color-border)}.relations{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4) var(--space-6);margin:0}@media (max-width: 640px){.relations{grid-template-columns:1fr}}.relations dt{font-size:var(--text-sm);color:var(--color-text-muted);margin-bottom:var(--space-1)}.relations dd{margin:0 0 var(--space-2);display:flex;flex-wrap:wrap;gap:var(--space-1)}.type-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(8rem,1fr));gap:var(--space-3)}.type-grid a{display:block;text-align:center;padding:var(--space-3) var(--space-2);border-radius:var(--radius-md);color:var(--color-on-type);text-decoration:none;font-weight:var(--weight-semibold)}.move-links{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:var(--space-1) var(--space-4);font-size:var(--text-sm)}',pt=()=>(ve(H(ut,"s_qN0eNszMTnk")),E(he,{children:[$("head",null,null,[$("meta",null,{charset:"utf-8"},null,3,null),$("meta",null,{name:"viewport",content:"width=device-width, initial-scale=1"},null,3,null),E(dt,null,3,"Am_0")],1,null),$("body",null,null,E(ge,null,3,"Am_1"),1,null)]},1,"Am_2")),mt=ee(H(pt,"s_eid0ise4wdU"));function gt(t){return nt(E(mt,null,3,"Ox_0"),{manifest:O,...t,containerAttributes:{lang:"en",...t.containerAttributes}})}export{O as m,gt as r,vt as s};
