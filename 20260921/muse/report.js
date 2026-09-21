(async () => {
  'use strict';
  const own = document.currentScript;
  const base = new URL('.', own.src);
  if (!globalThis.MuseSearch) {
    await new Promise(resolve => {
      const script = document.createElement('script'); script.src = new URL('skill-search.js', base).href;
      script.onload = resolve; script.onerror = resolve; document.head.append(script);
    });
  }
  const gallery = document.querySelector('[data-muse-gallery]');
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = new URL('report.css', base).href;
  document.head.append(style);
  const labels = {prepared:'待生成',draft:'草稿',demo_generating:'生成中',demo_ready:'Demo 已生成 · 未发布',live:'已发布 · 可按名称搜索（原视频接入待验证）',offline:'已下架',failed:'需在工作台处理'};
  function card(item, compact = false) {
    const box = document.createElement('section'); box.className = 'muse-demo';
    const title = document.createElement('h3'); title.textContent = item.title; box.append(title);
    const status = document.createElement('p');
    status.textContent = item.client_url ? '已发布 · 客户入口已验证' : (labels[item.stage] || '待处理'); box.append(status);
    if (item.demo && /^[a-f0-9]{32}\.mp4$/.test(item.demo)) {
      const video = document.createElement('video'); video.src = new URL(item.demo, base).href;
      video.controls = true; video.preload = 'none'; video.playsInline = true; video.setAttribute('aria-label', `${item.title} AI Demo`); box.append(video);
      const hint = document.createElement('small'); hint.textContent = 'AI 创意示例，非原广告；实际投放前需审核商品资料与宣传表述。'; box.append(hint);
    }
    if (item.client_url && item.stage === 'live') {
      try {
        const url = new URL(item.client_url);
        if (url.protocol === 'https:' && url.hostname === 'admuse.qq.com') {
          const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = '去妙思做同款'; box.append(a);
        }
      } catch (_) { /* An invalid link is never rendered. */ }
    }
    const search = document.createElement('div'); box.append(search);
    globalThis.MuseSearch?.mount(search, item);
    if (compact) box.classList.add('muse-compact');
    return box;
  }
  fetch(new URL('manifest.json', base), {cache:'no-store'}).then(r => {
    if (!r.ok) throw new Error('manifest unavailable'); return r.json();
  }).then(data => {
    if (!Array.isArray(data.items) || !data.items.length) return;
    globalThis.__musePeriod = data.period;
    const map = new Map(data.items.map(x => [x.md5, x]));
    if (gallery) {
      const count = document.querySelector('[data-muse-count]');
      if (count) count.textContent = `${data.period} · ${data.items.length} 条素材 · ${data.items.filter(x=>x.demo).length} 条 Demo 可播放`;
      gallery.replaceChildren(...data.items.map(x=>card(x)));
      return;
    }
    function decorate() {
      document.querySelectorAll('[data-card-md5]').forEach(el => {
        const md5 = el.dataset.cardMd5;
        el.querySelectorAll('[data-muse-attached]').forEach(node => node.remove());
        el.querySelectorAll('.hook-prompt-block, .hp').forEach(old => {
          const slot = document.createElement('div'); slot.dataset.museSearch = md5;
          old.replaceWith(slot);
        });
      });
      document.querySelectorAll('[data-muse-search]').forEach(slot => {
        const md5 = slot.dataset.museSearch || slot.closest('[data-card-md5]')?.dataset.cardMd5;
        globalThis.MuseSearch?.mount(slot, map.get(md5));
      });
    }
    decorate();
    let scheduled = false;
    new MutationObserver(() => {
      if (scheduled) return; scheduled = true;
      requestAnimationFrame(() => {scheduled = false; decorate();});
    }).observe(document.body, {childList:true,subtree:true});
  }).catch(() => {
    if (gallery) gallery.textContent = '状态加载失败，请刷新重试；原周报内容不受影响。';
  });
})();
