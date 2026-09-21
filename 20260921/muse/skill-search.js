(function(root) {
  'use strict';
  const PAGE='https://admuse.qq.com/#/generator/video-generate';
  function marker(item) {
    if(item?.stage!=='live'||!/^\d+$/.test(String(item.search_id||'')))return '';
    return typeof item.search_name==='string'?item.search_name.trim():'';
  }
  function copy(text, doc=root.document) {
    const active=doc.activeElement, input=doc.createElement('textarea');
    input.value=text;input.readOnly=true;input.style.cssText='position:fixed;left:-10000px;top:0;';
    doc.body.append(input);let ok=false;
    try{input.select();ok=!!doc.execCommand('copy');}catch(_){ok=false;}
    finally{input.remove();active?.focus?.({preventScroll:true});}
    if(ok)return Promise.resolve(true);
    if(root.navigator?.clipboard?.writeText)return root.navigator.clipboard.writeText(text).then(()=>true,()=>false);
    return Promise.resolve(false);
  }
  function mount(host,item) {
    if(!host||host.dataset.museSearchReady==='1')return;
    const name=marker(item),doc=host.ownerDocument||root.document;
    // Cards without a published Skill stay exactly as the report rendered them;
    // a disabled placeholder on every card would drown out the ones that work.
    if(!name){host.replaceChildren();host.dataset.museSearchReady='1';return;}
    host.dataset.museSearchReady='1';host.replaceChildren();
    const button=doc.createElement('a');button.className='hp-btn';button.textContent='去妙思做同款';
    button.href=PAGE;button.target='_blank';button.rel='noopener noreferrer';
    button.title=`复制「${name}」，到妙思「搜索技能」粘贴；编号 ${item.search_id}`;
    const status=doc.createElement('span');status.setAttribute('role','status');status.style.cssText='font-size:12px;margin-left:8px;';
    const detail=doc.createElement('small');detail.style.cssText='display:block;margin-top:6px;line-height:1.7;';
    detail.textContent=`本条已生成妙思技能「${name}」（编号 ${item.search_id}）：点按钮打开妙思后，在「搜索技能」粘贴该名称即可换成自己的商品图与要求生成。`;
    if(item.source_mode==='legacy_text_disabled')detail.textContent+=' 该条为早期试验版，未参考原视频画面。';
    function onCopy(value,label){
      return copy(value,doc).then(ok=>{
        status.textContent=ok?`已复制${label}`:'自动复制失败，请手动复制下方标记';
        if(!ok){let field=host.querySelector('input');if(!field){field=doc.createElement('input');field.readOnly=true;field.setAttribute('aria-label','手动复制技能标记');host.append(field);}field.value=value;field.focus();field.select();}
      });
    }
    button.addEventListener('click',event=>{event.stopPropagation();onCopy(name,'技能标记');});
    const idButton=doc.createElement('button');idButton.type='button';idButton.className='hp-btn';idButton.textContent='复制编号';idButton.style.marginLeft='8px';
    idButton.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();onCopy(String(item.search_id),'编号');});
    host.append(button,idButton,status,detail);
  }
  root.MuseSearch={PAGE,marker,copy,mount};
  if(root.document?.currentScript?.hasAttribute('data-muse-app')) {
    let period=null,map=new Map(),loading=false,scheduled=false;
    function decorate(){
      const next=typeof currentHistoryDate==='string'?currentHistoryDate:'';
      if(next!==period){
        period=next;map=new Map();loading=!!next;
        root.document.querySelectorAll('[data-muse-search]').forEach(el=>delete el.dataset.museSearchReady);
        if(next)fetch(`/历史周报/${encodeURIComponent(next)}/site/muse/manifest.json`,{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{
          if(period!==next)return;map=new Map((d?.items||[]).map(x=>[x.md5,x]));loading=false;decorate();
        }).catch(()=>{if(period===next){loading=false;decorate();}});
      }
      if(!loading)root.document.querySelectorAll('[data-muse-search]').forEach(el=>mount(el,map.get(el.dataset.museSearch)));
    }
    new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();});}).observe(root.document.body,{childList:true,subtree:true});
    decorate();
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=root.MuseSearch;
})(globalThis);
