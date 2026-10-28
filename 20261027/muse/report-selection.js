(() => {
  'use strict';
  globalThis.MuseReportSelection={mount(period,workbench){
    if(!/^\d{8}$/.test(period)||document.querySelector('[data-muse-selection-toolbar]'))return;
    let url;
    try{url=new URL(workbench||'/dashboard/muse.html',location.href);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return;}catch(_){return;}
    const selected=new Set(),bar=document.createElement('section');bar.dataset.museSelectionToolbar='1';bar.className='muse-demo';
    const title=document.createElement('strong');title.textContent='从周报视频反推 Skill';
    const tip=document.createElement('p');tip.textContent='勾选任意一条或多条素材，前往已登录工作台确认参数及费用；成果挂回本期周报。外部页面不直接调用平台，也不公开原视频。';
    const link=document.createElement('a');link.target='_blank';link.rel='noopener noreferrer';
    const all=document.createElement('button');all.type='button';all.textContent='选择当前可见素材';
    const none=document.createElement('button');none.type='button';none.textContent='清空选择';
    function update(){const target=new URL(url);target.search=new URLSearchParams({period,pick:'1',...(selected.size?{md5s:[...selected].join(',')}:{})}).toString();link.href=target.href;link.textContent=selected.size?`反推已选 ${selected.size} 条 → 工作台`:'选择本期任意素材 → 工作台';}
    function decorate(){document.querySelectorAll('[data-card-md5]').forEach(card=>{
      const md5=card.dataset.cardMd5;if(!/^[a-f0-9]{32}$/.test(md5))return;
      let input=card.querySelector('[data-muse-select-source]');
      if(!input){const label=document.createElement('label');label.className='muse-select-source';input=document.createElement('input');input.type='checkbox';input.dataset.museSelectSource=md5;input.setAttribute('aria-label',`选择素材 ${md5.slice(0,8)} 反推Skill`);
        input.onchange=()=>{if(input.checked&&selected.size>=100){input.checked=false;tip.textContent='每次最多选择100条，请减少选择。';return;}input.checked?selected.add(md5):selected.delete(md5);update();};label.append(input,document.createTextNode(' 选择此视频反推 Skill'));card.prepend(label);}
      if(input.checked!==selected.has(md5))input.checked=selected.has(md5);
    });}
    all.onclick=()=>{document.querySelectorAll('[data-card-md5]').forEach(card=>{if(card.getClientRects().length&&/^[a-f0-9]{32}$/.test(card.dataset.cardMd5)&&selected.size<100)selected.add(card.dataset.cardMd5);});decorate();update();};
    none.onclick=()=>{selected.clear();decorate();update();};
    bar.append(title,tip,all,none,link);(document.querySelector('main')||document.body).prepend(bar);update();decorate();
    let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();});});observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  }};
})();
