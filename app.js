(() => {
  'use strict';
  let language = 'ja';
  const $ = id => document.getElementById(id);
  const defaults = { people: '4', 'water-stock': '14', 'water-use': '0.30', uses: '5', 'waste-use': '0.35' };
  const inputIds = Object.keys(defaults);
  function numeric(id) {
    const el = $(id), n = Number(el.value);
    if (el.value.trim() === '' || !Number.isFinite(n) || n < Number(el.min) || n > Number(el.max) || ((id === 'people' || id === 'uses') && !Number.isInteger(n))) return null;
    return n;
  }
  function calculate() {
    const values = Object.fromEntries(inputIds.map(id => [id, numeric(id)]));
    const valid = !Object.values(values).includes(null);
    $('people-out').textContent = values.people ?? '—';
    $('water-out').textContent = values['water-stock'] === null ? '—' : values['water-stock'] + ' L';
    if (!valid) {
      ['result-uses', 'result-daily', 'result-empty', 'result-interval', 'water-only-days'].forEach(id => $(id).textContent = '—');
      $('result-days').textContent = language === 'ja' ? '入力欄の範囲内の数値を指定してください。' : 'Please enter numbers within each input’s range.';
      $('multiday-body').replaceChildren();
      $('water-track-fill').style.width = '0%'; return;
    }
    const people = values.people, stock = values['water-stock'], perUse = values['water-use'], uses = values.uses, waste = values['waste-use'];
    const count = Math.floor((stock + 1e-9) / perUse), daily = people * uses * perUse;
    const emptyCount = Math.floor((15 + 1e-9) / (perUse + waste));
    $('result-uses').textContent = count;
    $('result-daily').textContent = daily.toFixed(1) + ' L';
    $('result-empty').textContent = emptyCount;
    const days = stock / daily, interval = emptyCount / (people * uses);
    $('result-interval').textContent = interval < 0.1 ? '<0.1' : (Math.floor((interval + 1e-9) * 10) / 10).toFixed(1);
    $('water-only-days').textContent = language === 'ja' ? `水だけの換算：約${days.toFixed(1)}日分（排出は別途必要）` : `Water-only coverage: about ${days.toFixed(1)} days; emptying still required`;
    const dailyWaste = people * uses * (perUse + waste);
    $('result-days').textContent = language === 'ja' ? `${people}人・1人1日${uses}回の仮定で、汚水は約${dailyWaste.toFixed(1)}L／日。約${emptyCount}回までを目安に排出を計画。清水が残っていても汚水管理が先に必要です。` : `At ${uses} uses/person/day for ${people} people, about ${dailyWaste.toFixed(1)}L/day enters the waste tank. Plan emptying within roughly ${emptyCount} uses, even while flushing water remains.`;
    $('multiday-body').replaceChildren(...[3,7].map(period=>{
      const totalUses=people*uses*period, waterTotal=daily*period, wasteTotal=dailyWaste*period;
      const during=Math.floor(totalUses/emptyCount), complete=Math.ceil(totalUses/emptyCount);
      const row=document.createElement('tr');
      const cells=[period+(language==='ja'?'日':' days'),String(totalUses),waterTotal.toFixed(1)+' L',Math.max(0,waterTotal-stock).toFixed(1)+' L',wasteTotal.toFixed(1)+' L',during+' / '+complete];
      cells.forEach((text,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=text;row.append(cell);});return row;
    }));
    $('water-track-fill').style.width = Math.min(stock / 60 * 100, 100) + '%';
  }
  function setLanguage(lang) {
    language = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-ja][data-en]').forEach(el => { el.innerHTML = el.dataset[lang]; });
    document.querySelectorAll('[data-lang]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
    document.title = lang === 'ja' ? 'ポータブル水洗トイレ | MIELOO CORPORATION' : 'Portable Toilet | MIELOO CORPORATION';
    calculate();
    syncVideoSubtitles();
    if (featureDialog.open) renderFeature();
  }
  document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => setLanguage(btn.dataset.lang)));
  inputIds.forEach(id => $(id).addEventListener('input', calculate));
  $('reset-calc').addEventListener('click', () => { inputIds.forEach(id => $(id).value = defaults[id]); calculate(); });
  const viewport = $('scene-viewport');
  const slides = [...viewport.querySelectorAll('.scene-slide')];
  const tabs = [...document.querySelectorAll('[data-scene]')];
  let activeScene = 0;
  function updateScene(index) {
    activeScene = Math.max(0, Math.min(slides.length - 1, index));
    tabs.forEach((tab, i) => tab.setAttribute('aria-current', String(i === activeScene)));
    $('scene-count').textContent = String(activeScene + 1).padStart(2, '0') + ' / 03';
    $('scene-prev').disabled = activeScene === 0;
    $('scene-next').disabled = activeScene === slides.length - 1;
  }
  function goToScene(index) {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    updateScene(target);
    viewport.scrollTo({left:slides[target].offsetLeft - slides[0].offsetLeft, behavior:'instant'});
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => goToScene(i)));
  $('scene-prev').addEventListener('click', () => goToScene(activeScene - 1));
  $('scene-next').addEventListener('click', () => goToScene(activeScene + 1));
  let scrollTimer;
  viewport.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => updateScene(Math.round(viewport.scrollLeft / viewport.clientWidth)), 100);
  }, {passive:true});
  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); goToScene(activeScene + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let width = viewport.clientWidth;
  new ResizeObserver(() => {
    if (width !== viewport.clientWidth) {
      width = viewport.clientWidth;
      viewport.scrollTo({left:activeScene * width, behavior:'instant'});
    }
  }).observe(viewport);
  updateScene(0);
  const productVideo = $('product-video');
  const chapterButtons = [...document.querySelectorAll('[data-seek]')];
  function syncVideoSubtitles() {
    for (const track of productVideo.textTracks) track.mode = track.language === language ? 'showing' : 'disabled';
  }
  productVideo.addEventListener('loadedmetadata', syncVideoSubtitles);
  productVideo.querySelectorAll('track').forEach(track => track.addEventListener('load', syncVideoSubtitles));
  chapterButtons.forEach(button => button.addEventListener('click', async () => {
    productVideo.currentTime = Number(button.dataset.seek);
    try { await productVideo.play(); $('video-status').textContent = ''; }
    catch { $('video-status').textContent = language === 'ja' ? '動画の再生ボタンを押してください。' : 'Press play on the video to continue.'; }
  }));
  productVideo.addEventListener('timeupdate', () => {
    let current = 0;
    chapterButtons.forEach((button, i) => { if (productVideo.currentTime >= Number(button.dataset.seek)) current = i; });
    chapterButtons.forEach((button, i) => button.setAttribute('aria-current', String(i === current)));
  });
  productVideo.addEventListener('error', () => { $('video-status').textContent = language === 'ja' ? '動画を読み込めませんでした。ページを再読み込みしてください。' : 'The video could not load. Please reload the page.'; });
  syncVideoSubtitles();
  const featureDialog = $('feature-dialog');
  let featureKey = null, featureIndex = 0, featureOpener = null, featureZoom = false;
  const featureData = () => window.E001_FEATURES[featureKey];
  function renderFeature() {
    const data = featureData();
    if (!data) return;
    const image = data.images[featureIndex];
    $('feature-title').textContent = data.title[language];
    $('feature-intro').textContent = data.intro[language];
    $('feature-points').replaceChildren(...data.points.map(point => { const li=document.createElement('li');li.textContent=point[language];return li; }));
    $('feature-image').src = image.src;
    $('feature-image').alt = image.caption[language];
    $('feature-image-caption').textContent = image.caption[language];
    $('feature-image-source').textContent = image.source[language];
    $('feature-count').textContent = String(featureIndex+1).padStart(2,'0')+' / '+String(data.images.length).padStart(2,'0');
    $('feature-prev').disabled = featureIndex===0;
    $('feature-next').disabled = featureIndex===data.images.length-1;
    $('feature-media').classList.toggle('zoomed', featureZoom);
    $('feature-zoom').setAttribute('aria-pressed',String(featureZoom));
    $('feature-zoom').textContent = language==='ja' ? (featureZoom?'拡大を戻す −':'画像を拡大 ＋') : (featureZoom?'Reset zoom −':'Enlarge image +');
    $('feature-thumbnails').replaceChildren(...data.images.map((photo,i)=>{
      const button=document.createElement('button'),img=document.createElement('img');
      button.type='button';button.setAttribute('aria-label',(language==='ja'?'画像 ':'Image ')+(i+1)+': '+photo.caption[language]);
      button.setAttribute('aria-current',String(i===featureIndex));
      img.src=photo.src;img.alt='';button.append(img);
      button.addEventListener('click',()=>{featureIndex=i;featureZoom=false;renderFeature();});return button;
    }));
  }
  document.querySelectorAll('[data-feature]').forEach(button=>button.addEventListener('click',()=>{
    if(!window.E001_FEATURES[button.dataset.feature])return;
    featureKey=button.dataset.feature;featureIndex=0;featureZoom=false;featureOpener=button;renderFeature();
    if(!featureDialog.open)featureDialog.showModal();
  }));
  function moveFeature(delta){
    featureIndex=Math.max(0,Math.min(featureData().images.length-1,featureIndex+delta));featureZoom=false;renderFeature();
  }
  $('feature-prev').addEventListener('click',()=>moveFeature(-1));
  $('feature-next').addEventListener('click',()=>moveFeature(1));
  $('feature-zoom').addEventListener('click',()=>{featureZoom=!featureZoom;renderFeature();});
  $('feature-close').addEventListener('click',()=>featureDialog.close());
  featureDialog.addEventListener('close',()=>{featureOpener?.focus({preventScroll:true});});
  featureDialog.addEventListener('click',event=>{
    if(event.target!==featureDialog)return;
    const box=featureDialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)featureDialog.close();
  });
  featureDialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();moveFeature(event.key==='ArrowRight'?1:-1);
    }
  });
  let touchStart=null;
  $('feature-media').addEventListener('touchstart',event=>{if(!featureZoom&&event.touches.length===1)touchStart={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
  $('feature-media').addEventListener('touchend',event=>{
    if(!touchStart||featureZoom)return;
    const dx=event.changedTouches[0].clientX-touchStart.x,dy=event.changedTouches[0].clientY-touchStart.y;touchStart=null;
    if(Math.abs(dx)>65&&Math.abs(dy)<65)moveFeature(dx<0?1:-1);
  },{passive:true});
  const storageDialog = $('storage-dialog');
  $('show-storage').addEventListener('click', () => storageDialog.showModal());
  $('close-storage').addEventListener('click', () => storageDialog.close());
  storageDialog.addEventListener('click', event => { if (event.target === storageDialog) storageDialog.close(); });
  calculate();
})();
