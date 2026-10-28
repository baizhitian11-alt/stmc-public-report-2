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
  // Only on the workbench (logged in) does the status API answer; on the public copy it 404s and nothing renders.
  function publishPanel(period) {
    const api = '/api/muse/publish-gallery';
    const box = document.createElement('div'); box.className = 'muse-publish'; box.hidden = true;
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'muse-publish-btn';
    const link = document.createElement('a'); link.target = '_blank'; link.rel = 'noopener noreferrer';
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '复制链接';
    const tip = document.createElement('span'); tip.className = 'muse-publish-tip'; tip.setAttribute('role', 'status');
    box.append(btn, link, copy, tip); gallery.before(box);
    let timer = null;
    function show(s) {
      clearTimeout(timer); box.hidden = false;
      const busy = s.status === 'running', url = s.url || '';
      btn.disabled = busy; btn.textContent = busy ? '🌐 发布中…' : url ? '🌐 重新发布到公网' : '🌐 发布画廊到公网';
      link.hidden = copy.hidden = !url; link.href = url; link.textContent = url;
      const when = s.published_at ? new Date(s.published_at * 1000).toLocaleString() : '';
      tip.textContent = busy ? '正在推送 Demo 视频到公网，视频多时需要几分钟，可以离开本页。'
        : s.status === 'failed' ? '发布失败：' + (s.error || '未知错误')
        : s.status === 'done' ? `已发布${when ? '（' + when + '）' : ''}。首次发布约 1–2 分钟后链接生效；有新 Demo 再点一次即可增量更新。`
        : '只发布本页的 AI Demo、标题和「去妙思做同款」按钮，不含原素材、指令和周报数据；拿到链接的人无需登录即可查看。';
      if (busy) timer = setTimeout(poll, 4000);
    }
    function poll() {
      return fetch(api + '?period=' + encodeURIComponent(period), {credentials:'same-origin', cache:'no-store'})
        .then(r => r.ok ? r.json() : null).then(j => { if (j && j.ok) show(j.data || {}); }).catch(() => {});
    }
    btn.onclick = () => {
      if (!confirm('把本批 Demo 画廊发布到公网（GitHub Pages）？拿到链接的人无需登录即可查看。')) return;
      btn.disabled = true;
      fetch(api, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({period})})
        .then(r => r.json()).then(j => { if (!j.ok) throw new Error(j.error || '发布失败'); show(j.data || {}); })
        .catch(e => { btn.disabled = false; tip.textContent = e.message; });
    };
    copy.onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(link.href) : Promise.reject())
        .then(() => { tip.textContent = '已复制公网链接'; }, () => { prompt('复制公网链接', link.href); });
    };
    poll();
  }
  fetch(new URL('manifest.json', base), {cache:'no-store'}).then(r => {
    if (!r.ok) throw new Error('manifest unavailable'); return r.json();
  }).then(data => {
    if (!Array.isArray(data.items)) return;
    globalThis.__musePeriod = data.period;
    const ecoButton = document.querySelector('#weeklyEcoSection a');
    if (ecoButton) ecoButton.textContent = `本期妙思素材 · ${data.items.length} 条 · 查看 Demo 与 Skill`;
    const map = new Map(data.items.map(x => [x.md5, x]));
    if (gallery) {
      const count = document.querySelector('[data-muse-count]');
      const nodes = new Map();
      function update(next) {
        if (count) count.textContent = `${next.period} · ${next.items.length} 条素材 · ${next.items.filter(x=>x.demo).length} 条 Demo 可播放 · ${next.items.filter(x=>x.stage==='live').length} 条 Skill 已发布`;
        const retained = new Set(next.items.map(item => item.md5));
        for (const [md5, previous] of nodes) {
          if (retained.has(md5)) continue;
          previous.node.querySelector('video')?.pause();
          previous.node.remove();
          nodes.delete(md5);
        }
        for (const item of next.items) {
          const signature = JSON.stringify(item), previous = nodes.get(item.md5);
          if (previous?.signature === signature) continue;
          const node = card(item);
          if (previous) {
            const player = previous.node.querySelector('video');
            if (player && !player.paused) { player.addEventListener('pause', () => update(next), {once:true}); continue; }
            previous.node.replaceWith(node);
          } else gallery.append(node);
          nodes.set(item.md5, {signature,node});
        }
      }
      update(data);
      publishPanel(data.period);
      const timer = setInterval(() => {
        if (document.hidden) return;
        fetch(new URL('manifest.json', base), {cache:'no-store'}).then(r=>r.ok?r.json():null)
          .then(next=>{if(next?.period===data.period&&Array.isArray(next.items))update(next);}).catch(()=>{});
      }, 30000);
      window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
      return;
    }
    function decorate() {
      document.querySelectorAll('[data-card-md5]').forEach(el => {
        const md5 = el.dataset.cardMd5;
        const prompts = el.querySelectorAll('.hook-prompt-block, .hp');
        if (prompts.length) {
          prompts.forEach(old => {
            const slot = document.createElement('div'); slot.dataset.museSearch = md5;
            old.replaceWith(slot);
          });
          return;
        }
        // The public build strips the prompt block, so a published Skill would
        // otherwise lose its only mount point and show no button at all.
        const item = map.get(md5);
        if (!item || (item.stage !== 'live' && !globalThis.MuseSearch?.pending(item))) return;
        let slot = el.querySelector('[data-muse-search]');
        if (!slot) {
          slot = document.createElement('div'); slot.dataset.museSearch = md5;
          slot.dataset.museAttached = '1';
          el.append(slot);
        }
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
