(() => {
  'use strict';
  const D = window.SAVAGE_CATALOG, products = D.products, categories = D.categories;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const item = id => products.find(p => p.id === id);
  const cat = id => categories.find(c => c.id === id);
  const storageKey = 'savage-overdrive-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}
  const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    lang: saved.lang === 'en' ? 'en' : 'ru',
    cart: Array.isArray(saved.cart) ? saved.cart.filter(c => item(c.id) && Number.isInteger(c.qty) && c.qty > 0).map(c => ({id:c.id, qty:Math.min(c.qty,20)})) : [],
    compare: Array.isArray(saved.compare) ? [...new Set(saved.compare)].filter(id => item(id)).slice(0,3) : [],
    motion: saved.motion !== false && !systemReduced.matches,
    light: saved.light && typeof saved.light === 'object' ? saved.light : {},
    category:'all', query:'', sort:'featured', visible:6, orbit:0, modal:null, gallery:0
  };
  if (state.compare.length) state.compare = state.compare.filter(id => item(id).category === item(state.compare[0]).category);
  const copy = {
    skip:['К содержимому','Skip to content'],gear:['Устройства','Gear'],universe:['Мир SAVAGE','Our universe'],search:['Поиск','Search'],
    compare:['Сравнить','Compare'],cart:['Корзина','Bag'],menuTitle:['Найди своё<br>преимущество.','Find<br>your edge.'],
    allGear:['Все устройства','All gear'],heroEye:['ТОЧНОСТЬ. В ТВОЕЙ ПРИРОДЕ.','PRECISION. IN YOUR NATURE.'],
    heroLine1:['ИГРАЙ','PLAY'],heroLine2:['ДЕРЗКО.','BEYOND.'],heroCaption:['Твой следующий ход<br>начинается здесь.','Your next move<br>starts here.'],
    constructionEye:['СОБРАНА ИЗ ОЩУЩЕНИЙ','BUILT FROM FEELING'],constructionTitle:['Характер.<br>В каждом слое.','Character.<br>In every layer.'],
    layer1:['Тактильность','The touch'],layer1text:['Плотные PBT-кейкапы. Твоя точка контакта.','Substantial PBT keycaps. Your point of contact.'],
    layer2:['Отклик','The response'],layer2text:['Сменные переключатели. Найди свой ход.','Swappable switches. Find your feel.'],
    layer3:['Основа','The foundation'],layer3text:['Алюминиевый корпус. Точность в деталях.','An aluminium body. Precision in the details.'],
    discover:['Открыть модель','Discover the model'],mechanical:['МЕХАНИЧЕСКАЯ КЛАВИАТУРА','MECHANICAL KEYBOARD'],explore:['Исследовать','Explore'],
    scroll:['ЛИСТАЙ. ПОЧУВСТВУЙ РАЗНИЦУ.','SCROLL. FEEL THE DIFFERENCE.'],
    manifesto:['Техника становится продолжением тебя.<br>Когда всё лишнее остаётся позади.','Gear becomes an extension of you.<br>When everything extra falls away.'],
    showroomEye:['ВОСЕМЬ ГРАНЕЙ ТВОЕЙ ИГРЫ','EIGHT SIDES OF YOUR GAME'],showroomTitle:['ТВОЁ ПОЛЕ.<br>ТВОИ ПРАВИЛА.','YOUR FIELD.<br>YOUR RULES.'],
    showroomText:['Листай устройства.<br>Выбирай то, что чувствуешь своим.','Explore the lineup.<br>Choose what feels like you.'],previous:['Предыдущее устройство','Previous device'],next:['Следующее устройство','Next device'],
    dragHint:['ПОТЯНИ В СТОРОНУ ИЛИ ИСПОЛЬЗУЙ СТРЕЛКИ','DRAG SIDEWAYS OR USE THE ARROWS'],
    catalogEye:['ТВОЙ СЕТАП. ТВОЙ ВЫБОР.','YOUR SETUP. YOUR CALL.'],catalogTitle:['ВЫБИРАЙ<br>С ХАРАКТЕРОМ.','CHOOSE<br>YOUR NATURE.'],
    models:['МОДЕЛИ','MODELS'],searchModels:['Найти модель…','Find a model…'],sort:['Сортировка','Sort'],featured:['Выбор SAVAGE','SAVAGE selection'],
    priceUp:['Сначала дешевле','Price: low to high'],priceDown:['Сначала дороже','Price: high to low'],byName:['По названию','Name A–Z'],resetFilters:['Сбросить фильтры','Reset filters'],
    moreModels:['Больше устройств','More gear'],all:['Все','All'],add:['В корзину','Add to bag'],remove:['Убрать','Remove'],close:['Закрыть','Close'],
    found:['Найдено устройств','Devices found'],noResults:['Ничего не нашлось.','Nothing here. Yet.'],trySearch:['Попробуй другое название или сбрось фильтры.','Try a different name or reset your filters.'],
    labTitle:['СВЕТ.<br>В ТВОЁМ РИТМЕ.','LIGHT.<br>IN YOUR RHYTHM.'],labText:['Поверни. Приблизь. Задай настроение.<br>У твоей игры появился свой свет.','Rotate. Get closer. Set the mood.<br>Your game has a light of its own.'],
    load3d:['Собираем свет…','Bringing light to life…'],no3d:['Объёмный просмотр недоступен в этом браузере. Каталог и фотографии доступны ниже.','3D viewing is unavailable in this browser. You can still explore the catalog and photographs.'],
    rotateHint:['ПОТЯНИ, ЧТОБЫ ПОВЕРНУТЬ · + / − МАСШТАБ','DRAG TO ROTATE · + / − TO ZOOM'],zoomIn:['Приблизить','Zoom in'],zoomOut:['Отдалить','Zoom out'],
    resetView:['Исходный ракурс','Reset view'],autoRotate:['Автовращение','Auto rotate'],lighting:['СВЕТОВОЙ ПРОФИЛЬ','LIGHTING PROFILE'],
    solid:['Постоянный','Static'],breathe:['Дыхание','Breathe'],wave:['Волна','Wave'],spectrum:['Спектр','Spectrum'],reactive:['Реакция','Reactive'],
    customColor:['Свой цвет','Custom color'],brightness:['Яркость','Brightness'],speed:['Скорость','Speed'],night:['Ночная сцена','Night scene'],sound:['Звук клавиш','Key sound'],
    reactiveNote:['В режиме «Реакция» нажми на клавишу модели или на своей клавиатуре.','In Reactive mode, press a model key or a key on your keyboard.'],
    saveLight:['Сохранить мой свет','Save my light'],localProfile:['Профиль сохранится в этом браузере.','Your profile stays in this browser.'],lightSaved:['Световой профиль сохранён.','Lighting profile saved.'],
    setupTitle:['ТВОЁ<br>ПРОСТРАНСТВО.<br>БЕЗ ГРАНИЦ.','YOUR SPACE.<br>WITHOUT<br>LIMITS.'],
    setupText:['Каждая деталь — часть одного целого.<br>Собери место, в которое хочется вернуться.','Every detail is part of a whole.<br>Build a space you want to come back to.'],
    buildSetup:['Собрать этот сетап','Build this setup'],footerMotto:['Доверься инстинкту.<br>Остальное — в твоих руках.','Trust your instinct.<br>The rest is in your hands.'],
    support:['Поддержка','Support'],delivery:['Доставка','Delivery'],about:['О SAVAGE','About SAVAGE'],demoFooter:['КОНЦЕПТ БРЕНДА / ДЕМОНСТРАЦИОННЫЙ МАГАЗИН','BRAND CONCEPT / DEMONSTRATION STORE'],
    motion:['Анимация','Motion'],backTop:['Наверх ↑','Back to top ↑'],added:['добавлен в корзину','added to your bag'],quantityLimit:['Максимум 20 единиц одной модели.','A maximum of 20 units per model.'],
    compareAdded:['добавлен к сравнению','added to comparison'],compareRemoved:['Модель убрана из сравнения.','Model removed from comparison.'],
    compareLimit:['Можно сравнить до трёх моделей одной категории.','Compare up to three models from one category.'],
    compareChanged:['Начато сравнение новой категории.','Started a comparison in a new category.'],compareEmpty:['Сравни характер.','Compare their character.'],
    compareEmptyText:['Добавь до трёх моделей одной категории с помощью значка сравнения на карточках.','Add up to three models from one category using the compare icon on product cards.'],
    compareTitle:['Детали решают.','Details make the difference.'],compareNote:['Сравниваются демонстрационные спецификации концепт-линейки SAVAGE.','Comparing the illustrative specifications of the SAVAGE concept lineup.'],
    emptyBag:['Пока здесь<br>есть только место.','For now,<br>there is only space.'],emptyBagText:['Заполни его устройствами с твоим характером.','Fill it with gear that shares your nature.'],
    continueShopping:['Выбрать устройства','Explore the gear'],subtotal:['Итого','Subtotal'],checkout:['Перейти к оформлению','Continue to checkout'],
    cartDemo:['Демонстрационная корзина. Реальная оплата и доставка не подключены.','A demonstration bag. Real payment and delivery are not connected.'],
    checkoutTitle:['Последний шаг.','One final step.'],name:['Имя','Name'],email:['Электронная почта','Email'],city:['Город','City'],
    deliveryMethod:['Способ получения','Delivery method'],courier:['Курьер','Courier'],pickup:['Пункт выдачи','Collection point'],
    checkoutDemo:['Это демонстрация. Данные формы не отправляются и не сохраняются. Деньги не списываются.','This is a demonstration. Form details are neither sent nor saved. No payment is taken.'],
    completeDemo:['Завершить демозаказ','Complete demo order'],demoSuccess:['Твой сетап<br>уже ближе.','Your setup.<br>One step closer.'],
    successText:['Демозаказ оформлен в этом браузере. Корзина очищена. Это демонстрация оформления — заказ никуда не отправлен.','The demo order was completed in this browser and your bag was cleared. This demonstrates checkout; no order was submitted.'],
    keepExploring:['Продолжить исследование','Keep exploring'],popular:['С чего начнём?','Where do we start?'],searchTitle:['Найди своё.','Find your own.'],
    nothingSearch:['Совпадений нет. Попробуй STRIKE, PULSE или название категории.','No matches. Try STRIKE, PULSE or a category name.'],
    specs:['В деталях','The details'],model:['Модель','Model'],generalView:['Общий вид','Overview'],detailView:['Деталь','Detail'],profileView:['Другой ракурс','Another angle'],
    finish:['Отделка','Finish'],viewLighting:['Вращение и подсветка · LIGHT LAB','Rotate and light it up · LIGHT LAB'],
    productDemo:['Модель, цена и характеристики представлены для демонстрации концепта бренда.','The model, price and specifications illustrate a brand concept.'],
    supportTitle:['Всё под рукой.','Here to help.'],deliveryTitle:['Доставка и возврат.','Delivery & returns.'],aboutTitle:['Доверься инстинкту.','Trust your instinct.'],
    deliveryText:['В демонстрационном оформлении можно выбрать курьерскую доставку или пункт выдачи. Службы доставки, склад и оплата не подключены.','Demo checkout offers courier delivery or collection. Delivery services, inventory and payment are not connected.'],
    deliveryText2:['Сайт показывает путь от выбора модели до оформления. Реальные сроки, стоимость доставки и условия возврата определяются при запуске магазина.','This site demonstrates the journey from choosing a model to checkout. Actual delivery times, fees and return terms would be set when the store launches.'],
    aboutText:['SAVAGE — концепт бренда игровых устройств. Его язык — холодный металл, графит, точная геометрия и сигнальный оранжевый.','SAVAGE is a gaming hardware brand concept. Its language is cool metal, graphite, precise geometry and signal orange.'],
    aboutText2:['24 модели в восьми категориях: от первой клавиши до всего пространства вокруг игры. В основе — понятный выбор, выразительные детали и взаимодействие, которое хочется попробовать.','24 models across eight categories: from the first keystroke to the space around your game. Built around clear choices, expressive details and interactions worth trying.'],
    faq1:['Как сравнить устройства?','How do I compare devices?'],faq1text:['Нажми значок сравнения на карточке. В таблицу можно добавить до трёх моделей одной категории. При выборе другой категории начнётся новое сравнение.','Use the compare icon on a product card. Add up to three models in one category. Choosing another category starts a new comparison.'],
    faq2:['Как работает LIGHT LAB?','How does LIGHT LAB work?'],faq2text:['Выбери STRIKE 75, PULSE PRO или ECHO X. Потяни модель, чтобы повернуть, используй кнопки + и − для масштаба. SYNC покажет три устройства в одном световом ритме.','Choose STRIKE 75, PULSE PRO or ECHO X. Drag to rotate and use + and − to zoom. SYNC shows all three devices sharing one lighting rhythm.'],
    faq3:['Можно ли заказать по-настоящему?','Can I place a real order?'],faq3text:['Это демонстрационный магазин концепт-бренда. Корзина и оформление работают локально; оплата и реальная отправка заказа отсутствуют.','This is a demonstration store for a concept brand. Bag and checkout work locally; payment and real order submission are not connected.'],
    lowerQuantity:['Уменьшить количество','Decrease quantity'],raiseQuantity:['Увеличить количество','Increase quantity']
  };
  const L = value => Array.isArray(value) ? value[state.lang === 'en' ? 1 : 0] : String(value ?? '');
  const t = key => L(copy[key] || [key,key]);
  const money = price => '$' + Number(price).toLocaleString(state.lang === 'en' ? 'en-US' : 'ru-RU');
  const img = (id, small = false) => 'assets/products/' + id + (small ? '-sm' : '') + '.webp';
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({lang:state.lang,cart:state.cart,compare:state.compare,motion:state.motion,light:state.light})); } catch (_) {}
  }
  const paths = {
    search:'<circle cx="10.5" cy="10.5" r="6.6"/><path d="m15.5 15.5 5 5"/>',
    compare:'<path d="M5 5v15M12 2v18M19 8v12M2 20h20"/>',
    menu:'<path d="M3 8h18M3 16h18"/>',plus:'<path d="M12 4v16M4 12h16"/>',minus:'<path d="M4 12h16"/>',
    close:'<path d="m5 5 14 14M5 19 19 5"/>',
    'arrow-left':'<path d="M20 12H4m6-6-6 6 6 6"/>','arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',rotate:'<path d="M19 9a7.5 7.5 0 1 0 0 8M19 3v6h-6"/>',
    moon:'<path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z"/>',
    sound:'<path d="M4 9v6h4l5 4V5L8 9ZM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    check:'<path d="m5 12 5 5 10-11"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.plus) + '</svg>';
  const mark = color => '<svg viewBox="0 0 188 58" aria-hidden="true" fill="'+(color || 'currentColor')+'"><path d="M0 0h28l24 34L83 0h29L63 58H42Z"/><path d="m68 58 50-58h20l50 58h-29l-31-35-31 35Z"/></svg>';
  const wordPaths = '<path d="M14 0h74l-7 15H31l-4 9h42c12 0 15 7 9 19l-8 15H-4l7-15h50l5-9H17C4 34 1 28 7 15Z"/><path fill-rule="evenodd" d="M132 0h23l27 58h-25l-5-13h-31l-13 13H84Zm2 30h12l-5-15Z"/><path d="M186 0h25l16 36 28-36h27l-47 58h-24Z"/><path fill-rule="evenodd" d="M327 0h23l27 58h-25l-5-13h-31l-13 13h-24Zm2 30h12l-5-15Z"/><path d="M411 0h74l-7 15h-51l-13 28h34l5-9h-22l7-13h44l-18 37h-81l21-45Z"/><path d="M509 0h77l-7 15h-52l-4 8h47l-6 13h-47l-3 7h52l-7 15h-77Z"/>';
  const wordmark = () => '<svg viewBox="-5 -1 592 60" fill="currentColor" aria-hidden="true">'+wordPaths+'</svg>';
  const logo = () => '<svg viewBox="0 0 840 62" fill="currentColor" aria-hidden="true"><g class="logo-mark" transform="translate(0 2)">'+mark().replace(/^.*?<path/,'<path').replace(/<\/svg>$/,'')+'</g><g transform="translate(228 2)">'+wordPaths+'</g></svg>';
  function paintIcons(root = document) {
    $$('[data-icon]',root).forEach(el => { if (!el.dataset.painted) { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)); el.dataset.painted='1'; } });
  }
  let toastTimer;
  function toast(message) {
    const el=$('.toast'); el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),3300);
  }
  function translate(root = document) {
    $$('[data-t]',root).forEach(el=>{el.innerHTML=t(el.dataset.t);});
    $$('[data-placeholder]',root).forEach(el=>{el.placeholder=t(el.dataset.placeholder);});
    $$('[data-title]',root).forEach(el=>{el.title=t(el.dataset.title);el.setAttribute('aria-label',t(el.dataset.title));});
    paintIcons(root);
  }
  function renderMenu() {
    $('.menu-categories').innerHTML=categories.map(c=>'<button class="menu-category" data-action="category" data-category="'+c.id+'"><span>'+c.code+'</span><span>'+L(c.label)+'</span><span aria-hidden="true">↗</span></button>').join('');
  }
  function counts() {
    const total=state.cart.reduce((n,c)=>n+c.qty,0);
    $$('.cart-count').forEach(el=>{el.textContent=total;});
    $$('.compare-count').forEach(el=>{el.textContent=state.compare.length;el.hidden=!state.compare.length;});
    syncCompareDock();
    $$('[data-action="compare-toggle"]').forEach(el=>{const active=state.compare.includes(el.dataset.id);el.classList.toggle('is-active',active);el.setAttribute('aria-pressed',String(active));});
  }
  function syncCompareDock(){
    const r=$('#catalog').getBoundingClientRect();
    $('.compare-dock').hidden=!state.compare.length||$('#dialog').open||r.top>innerHeight*.6||r.bottom<120;
  }
  function renderOrbit() {
    $('.orbit-categories').innerHTML=categories.map((c,i)=>'<button data-action="orbit-select" data-index="'+i+'" class="'+(i===state.orbit?'is-active':'')+'" aria-pressed="'+(i===state.orbit)+'">'+L(c.label)+'</button>').join('');
    const n=categories.length;
    $('.orbit-items').innerHTML=categories.map((c,i)=>{
      let offset=(i-state.orbit+n)%n;if(offset>n/2)offset-=n;
      const p=item(c.flagship),distance=Math.abs(offset),x=offset*(innerWidth<701?66:34),scale=distance===0?1:distance===1?.60:.36;
      return '<button class="orbit-product '+(distance===0?'is-current':'')+'" data-action="'+(distance===0?'product':'orbit-select')+'" data-id="'+p.id+'" data-index="'+i+'" aria-label="'+p.name+'" tabindex="'+(distance>1?-1:0)+'" '+(distance>2?'hidden':'')+' style="transform:translate(calc(-50% + '+x+'vw),calc(-50% + '+(distance*19)+'px)) scale('+scale+') rotate('+(offset*-8)+'deg);opacity:'+(distance===0?1:distance===1?.26:.06)+';z-index:'+(5-distance)+'"><img src="'+img(p.id)+'" alt="'+p.name+'" width="1440" height="960" '+(distance?'loading="lazy"':'')+' draggable="false"></button>';
    }).join('');
    const c=categories[state.orbit],p=item(c.flagship);
    $('.orbit-category').textContent=L(c.label);
    $('.orbit-name').textContent=p.name;
    $('.orbit-description').textContent=L(p.short);
    $('.orbit-open').dataset.id=p.id;
    $('.orbit-counter').textContent=String(state.orbit+1).padStart(2,'0')+' / 08';
  }
  function goOrbit(index) {
    state.orbit=(index+categories.length)%categories.length;
    $$('.orbit-product').forEach((el,i)=>{
      let offset=(i-state.orbit+categories.length)%categories.length;if(offset>categories.length/2)offset-=categories.length;
      const distance=Math.abs(offset),x=offset*(innerWidth<701?66:34),scale=distance===0?1:distance===1?.60:.36;
      el.hidden=distance>2;el.style.transform='translate(calc(-50% + '+x+'vw),calc(-50% + '+distance*19+'px)) scale('+scale+') rotate('+offset*-8+'deg)';
      el.style.opacity=distance===0?'1':distance===1?'.26':'.06';el.style.zIndex=String(5-distance);
      el.classList.toggle('is-current',distance===0);el.dataset.action=distance===0?'product':'orbit-select';el.tabIndex=distance>1?-1:0;
    });
    $$('.orbit-categories button').forEach((el,i)=>{el.classList.toggle('is-active',i===state.orbit);el.setAttribute('aria-pressed',String(i===state.orbit));});
    const c=categories[state.orbit],p=item(c.flagship);
    $('.orbit-category').textContent=L(c.label);$('.orbit-name').textContent=p.name;$('.orbit-description').textContent=L(p.short);$('.orbit-open').dataset.id=p.id;$('.orbit-counter').textContent=String(state.orbit+1).padStart(2,'0')+' / 08';
    const active=$('.orbit-categories .is-active');if(active)active.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  }
  function filteredProducts() {
    let result=products.filter(p=>(state.category==='all'||p.category===state.category)&&(!state.query||(p.name+' SAVAGE '+L(cat(p.category).label)+' '+L(p.short)).toLowerCase().includes(state.query.toLowerCase())));
    if(state.sort==='price-up')result.sort((a,b)=>a.price-b.price);
    if(state.sort==='price-down')result.sort((a,b)=>b.price-a.price);
    if(state.sort==='name')result.sort((a,b)=>a.name.localeCompare(b.name));
    return result;
  }
  function renderCategories() {
    $('.catalog-categories').innerHTML=[{id:'all',label:copy.all},...categories].map(c=>'<button data-action="filter" data-category="'+c.id+'" class="'+(state.category===c.id?'is-active':'')+'" aria-pressed="'+(state.category===c.id)+'">'+L(c.label)+'</button>').join('');
  }
  function renderCatalog() {
    const result=filteredProducts();
    $('.catalog-result-count').textContent=t('found')+': '+result.length+' / 24';
    $('.product-grid').innerHTML=result.length?result.slice(0,state.visible).map(p=>'<article class="product-card" data-id="'+p.id+'"><div class="card-top"><span class="card-tag">'+(p.tag||'SAVAGE / '+cat(p.category).code)+'</span><button class="card-compare" data-action="compare-toggle" data-id="'+p.id+'" aria-label="'+t('compare')+' '+p.name+'" aria-pressed="'+state.compare.includes(p.id)+'">'+icon('compare')+'</button></div><button class="card-visual" data-action="product" data-id="'+p.id+'" aria-label="'+t('discover')+' '+p.name+'"><img src="'+img(p.id,true)+'" alt="'+p.name+'" width="640" height="427" loading="lazy"></button><p class="card-category">'+L(cat(p.category).label)+'</p><div class="card-bottom"><div><button class="card-name" data-action="product" data-id="'+p.id+'">'+p.name+'</button><p>'+money(p.price)+'</p></div><button class="card-add" data-action="add" data-id="'+p.id+'" aria-label="'+t('add')+' '+p.name+'">'+icon('plus')+'</button></div></article>').join(''):'<div class="empty-catalog"><h3>'+t('noResults')+'</h3><p>'+t('trySearch')+'</p><button class="button button-dark" data-action="filters-reset">'+t('resetFilters')+'</button></div>';
    $('.catalog-more').hidden=result.length<=state.visible;
    counts();
  }
  function setCategory(id, scroll = false) {
    state.category=id;state.visible=6;renderCategories();renderCatalog();closeMenu();
    if(scroll) $('#catalog').scrollIntoView({behavior:state.motion?'smooth':'instant'});
  }
  function add(id, silent = false) {
    const p=item(id);if(!p)return;
    const entry=state.cart.find(c=>c.id===id);
    if(entry&&entry.qty>=20){toast(t('quantityLimit'));return;}
    if(entry)entry.qty++;else state.cart.push({id,qty:1});
    persist();counts();if(!silent)toast(p.name+' — '+t('added'));
  }
  function compareToggle(id) {
    const p=item(id);if(!p)return;
    if(state.compare.includes(id)){state.compare=state.compare.filter(x=>x!==id);toast(t('compareRemoved'));}
    else if(state.compare.length&&item(state.compare[0]).category!==p.category){state.compare=[id];toast(t('compareChanged'));}
    else if(state.compare.length>=3){toast(t('compareLimit'));return;}
    else{state.compare.push(id);toast(p.name+' — '+t('compareAdded'));}
    persist();counts();if(state.modal==='compare')renderComparison();
  }
  let menuOpen=false,menuFocus;
  function openMenu(){menuFocus=document.activeElement;menuOpen=true;const el=$('#gear-menu');el.hidden=false;el.inert=false;el.classList.add('open');$('.menu-scrim').hidden=false;$$('[data-action="menu"]').forEach(b=>b.setAttribute('aria-expanded','true'));requestAnimationFrame(()=>$('.menu-category')?.focus({preventScroll:true}));}
  function closeMenu(){if(!menuOpen)return;menuOpen=false;$('#gear-menu').hidden=true;$('#gear-menu').inert=true;$('#gear-menu').classList.remove('open');$('.menu-scrim').hidden=true;$$('[data-action="menu"]').forEach(b=>b.setAttribute('aria-expanded','false'));}
  const dialog=$('#dialog'),content=$('#dialog-content');
  let lastFocus=null,sourceRect=null;
  const closeButton=()=>'<button class="icon-button dialog-close" data-action="close" aria-label="'+t('close')+'">'+icon('close')+'</button>';
  function showDialog(kind,html) {
    closeMenu();
    if(!dialog.open)lastFocus=document.activeElement;
    state.modal=kind;dialog.className=kind==='cart'||kind==='checkout'||kind==='success'?'drawer-dialog':(kind==='compare'?'comparison':kind)+'-dialog-box';
    content.innerHTML=html;
    if(!dialog.open)dialog.showModal();
    document.body.style.overflow='hidden';paintIcons(content);counts();
    requestAnimationFrame(()=>{const target=$('[autofocus]',content)||$('.dialog-close',content)||$('button',content);target?.focus({preventScroll:true});});
  }
  function closeDialog() {
    if(!dialog.open)return;
    dialog.close();state.modal=null;document.body.style.overflow='';
    syncCompareDock();
    if(location.hash.startsWith('#product/'))history.replaceState(null,'',location.pathname+location.search);
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
  }
  function productGallery(p){return p.gallery||[{asset:p.id,kind:'product'},{asset:p.id,kind:'detail'}];}
  function renderProduct(id, preserveGallery = false) {
    const p=item(id);if(!p)return;if(!preserveGallery)state.gallery=0;
    state.product=id;const gallery=productGallery(p),shot=gallery[state.gallery]||gallery[0],family=products.filter(x=>x.category===p.category);
    const finish=['echo-studio','drift-desk','glide-mini','throne-elite'].includes(id)?'Frost':['strike-98','horizon-wide'].includes(id)?'Titanium':'Graphite';
    showDialog('product','<div class="product-dialog">'+closeButton()+'<div class="product-gallery"><div class="product-gallery-top"><span>SAVAGE / '+cat(p.category).code+'</span><span>'+L(cat(p.category).label).toUpperCase()+'</span></div><div class="product-main-visual '+(shot.kind==='detail'?'is-detail':shot.kind==='photo'?'is-photo':'')+'"><img class="product-main-image" src="'+img(shot.asset)+'" alt="'+p.name+' — '+t(state.gallery?'detailView':'generalView')+'"></div><div class="product-thumbnails">'+gallery.map((g,i)=>'<button class="product-thumb '+(i===state.gallery?'is-active ':'')+(g.kind==='photo'?'is-photo ':g.kind==='detail'?'is-detail ':'')+'" data-action="gallery" data-index="'+i+'" aria-label="'+t(i===0?'generalView':g.kind==='photo'?'detailView':'profileView')+'" aria-pressed="'+(i===state.gallery)+'"><img src="'+img(g.asset,true)+'" alt="" loading="lazy"></button>').join('')+'</div><div class="product-gallery-caption"><span class="gallery-label">'+t(state.gallery===0?'generalView':shot.kind==='photo'||shot.kind==='detail'?'detailView':'profileView')+'</span><span>0'+(state.gallery+1)+' / 0'+gallery.length+'</span></div></div><div class="product-info"><span class="eyebrow">'+L(cat(p.category).label)+'</span><h2 id="dialog-title">'+p.name+'</h2><p class="product-description">'+L(p.description)+'</p><div class="product-family" role="group" aria-label="'+t('model')+'">'+family.map(f=>'<button data-action="product-family" data-id="'+f.id+'" class="'+(f.id===p.id?'is-active':'')+'">'+f.name+'</button>').join('')+'</div><div class="product-price-row"><span class="product-price">'+money(p.price)+'<small>USD</small></span><span class="product-finish"><i aria-hidden="true"></i>'+finish+'</span></div><div class="product-actions"><button class="button button-dark" data-action="add" data-id="'+id+'"><span>'+t('add')+'</span><span aria-hidden="true">+</span></button><button class="icon-button" data-action="compare-toggle" data-id="'+id+'" aria-label="'+t('compare')+'" aria-pressed="'+state.compare.includes(id)+'">'+icon('compare')+'</button></div>'+(p.lab?'<button class="product-lab-link" data-action="open-lab" data-device="'+p.lab+'"><span>'+t('viewLighting')+'</span><span aria-hidden="true">↗</span></button>':'')+'<details class="product-specs" open><summary>'+t('specs')+'</summary>'+Object.entries(p.specs).map(([k,v])=>'<div class="spec-row"><span>'+L(D.specLabels[k])+'</span><span>'+L(v)+'</span></div>').join('')+'</details><p class="product-demo-note">'+t('productDemo')+'</p></div></div>');
    if(sourceRect&&state.motion){const el=$('.product-main-image');requestAnimationFrame(()=>{const r=el.getBoundingClientRect(),s=sourceRect;el.animate([{transform:'translate('+(s.x+s.width/2-r.x-r.width/2)+'px,'+(s.y+s.height/2-r.y-r.height/2)+'px) scale('+Math.min(s.width/r.width,1.6)+') rotate(-4deg)',opacity:.4},{transform:'none',opacity:1}],{duration:800,easing:'cubic-bezier(.2,.75,.2,1)'});sourceRect=null;});}
  }
  function openProduct(id, source) {
    if(!item(id))return;
    sourceRect=source?.querySelector('img')?.getBoundingClientRect()||null;
    history.replaceState(null,'','#product/'+id);renderProduct(id);
  }
  function changeGallery(index) {
    const p=item(state.product),gallery=productGallery(p);if(!gallery[index])return;state.gallery=index;
    const shot=gallery[index],visual=$('.product-main-visual'),photo=$('.product-main-image');
    visual.classList.toggle('is-photo',shot.kind==='photo');visual.classList.toggle('is-detail',shot.kind==='detail');
    photo.src=img(shot.asset);photo.alt=p.name+' — '+t(index===0?'generalView':'detailView');
    $$('.product-thumb').forEach((el,i)=>{el.classList.toggle('is-active',i===index);el.setAttribute('aria-pressed',String(i===index));});
    $('.gallery-label').textContent=t(index===0?'generalView':shot.kind==='photo'||shot.kind==='detail'?'detailView':'profileView');
    $('.product-gallery-caption>span:last-child').textContent='0'+(index+1)+' / 0'+gallery.length;
  }
  function cartTotal(){return state.cart.reduce((sum,c)=>sum+item(c.id).price*c.qty,0);}
  function renderCart() {
    showDialog('cart','<div class="drawer">'+closeButton()+'<span class="eyebrow">SAVAGE / YOUR GEAR</span><h2 id="dialog-title" class="drawer-heading">'+t('cart')+' <span class="orange">('+state.cart.reduce((n,c)=>n+c.qty,0)+')</span></h2>'+(state.cart.length?'<div class="cart-items">'+state.cart.map(c=>{const p=item(c.id);return '<article class="cart-item"><img src="'+img(p.id,true)+'" alt="'+p.name+'"><div class="cart-item-body"><button class="cart-item-name" data-action="product" data-id="'+p.id+'">'+p.name+'</button><p class="cart-item-price">'+money(p.price*c.qty)+'</p><button class="cart-item-remove" data-action="cart-remove" data-id="'+p.id+'" aria-label="'+t('remove')+' '+p.name+'">'+icon('close')+'</button><div class="quantity"><button data-action="quantity" data-id="'+p.id+'" data-delta="-1" aria-label="'+t('lowerQuantity')+'">−</button><span>'+c.qty+'</span><button data-action="quantity" data-id="'+p.id+'" data-delta="1" aria-label="'+t('raiseQuantity')+'">+</button></div></div></article>';}).join('')+'</div><div class="cart-footer"><div class="cart-subtotal"><span>'+t('subtotal')+'</span><strong>'+money(cartTotal())+'</strong></div><button class="button button-dark" data-action="checkout"><span>'+t('checkout')+'</span><span aria-hidden="true">↗</span></button><p>'+t('cartDemo')+'</p></div>':'<div class="empty-state"><span class="empty-symbol" aria-hidden="true">[ + ]</span><h3>'+t('emptyBag')+'</h3><p>'+t('emptyBagText')+'</p><button class="button button-dark" data-action="shop"><span>'+t('continueShopping')+'</span><span aria-hidden="true">↗</span></button></div>')+'</div>');
  }
  function quantity(id,delta) {
    const entry=state.cart.find(c=>c.id===id);if(!entry)return;
    if(delta>0&&entry.qty>=20){toast(t('quantityLimit'));return;}
    entry.qty+=delta;if(entry.qty<=0)state.cart=state.cart.filter(c=>c.id!==id);
    persist();counts();renderCart();
  }
  function renderCheckout() {
    if(!state.cart.length){renderCart();return;}
    showDialog('checkout','<div class="drawer">'+closeButton()+'<span class="eyebrow">SAVAGE / DEMO CHECKOUT</span><h2 id="dialog-title" class="drawer-heading">'+t('checkoutTitle')+'</h2><div class="checkout-summary"><span>'+t('subtotal')+'</span><strong>'+money(cartTotal())+'</strong></div><form class="checkout-form" id="checkout-form"><label class="field">'+t('name')+'<input name="name" autocomplete="name" required maxlength="80"></label><label class="field">'+t('email')+'<input type="email" name="email" autocomplete="email" required maxlength="120"></label><label class="field">'+t('city')+'<input name="city" autocomplete="address-level2" required maxlength="100"></label><label class="field">'+t('deliveryMethod')+'<select name="delivery"><option value="courier">'+t('courier')+'</option><option value="pickup">'+t('pickup')+'</option></select></label><p>'+t('checkoutDemo')+'</p><button class="button button-dark" type="submit"><span>'+t('completeDemo')+'</span><span aria-hidden="true">↗</span></button></form></div>');
  }
  function finishCheckout() {
    const order='SG-'+Date.now().toString(36).slice(-6).toUpperCase();state.cart=[];persist();counts();
    showDialog('success','<div class="drawer">'+closeButton()+'<div class="checkout-success"><span class="success-mark" aria-hidden="true">✓</span><span class="eyebrow">DEMO / '+order+'</span><h2 id="dialog-title">'+t('demoSuccess')+'</h2><p>'+t('successText')+'</p><button class="button button-dark" data-action="shop"><span>'+t('keepExploring')+'</span><span aria-hidden="true">↗</span></button></div></div>');
  }
  function renderSearch() {
    showDialog('search','<div class="search-dialog">'+closeButton()+'<span class="eyebrow">SAVAGE / FIND YOUR GEAR</span><h2 id="dialog-title">'+t('searchTitle')+'</h2><label class="search-big">'+icon('search')+'<input id="global-search" type="search" placeholder="'+t('searchModels')+'" aria-label="'+t('search')+'" autocomplete="off" autofocus></label><div class="search-results" aria-live="polite"></div></div>');
    searchResults('');
  }
  function searchResults(query) {
    const text=query.trim().toLowerCase(),result=products.filter(p=>!text||(p.name+' SAVAGE '+L(cat(p.category).label)+' '+L(p.short)).toLowerCase().includes(text)).slice(0,12);
    $('.search-results').innerHTML=result.length?result.map(p=>'<button class="search-result" data-action="product" data-id="'+p.id+'"><img src="'+img(p.id,true)+'" alt="" loading="lazy"><span><strong>'+p.name+'</strong><small>'+L(cat(p.category).label)+'</small></span><span>'+money(p.price)+' ↗</span></button>').join(''):'<p class="search-empty">'+t('nothingSearch')+'</p>';
  }
  function renderComparison() {
    if(!state.compare.length){showDialog('compare','<div class="comparison-dialog">'+closeButton()+'<span class="eyebrow">SAVAGE / COMPARE</span><h2 id="dialog-title">'+t('compareEmpty')+'</h2><div class="empty-state"><p>'+t('compareEmptyText')+'</p><button class="button button-dark" data-action="shop"><span>'+t('continueShopping')+'</span><span aria-hidden="true">↗</span></button></div></div>');return;}
    const list=state.compare.map(item),keys=[...new Set(list.flatMap(p=>Object.keys(p.specs)))];
    showDialog('compare','<div class="comparison-dialog">'+closeButton()+'<span class="eyebrow">SAVAGE / '+L(cat(list[0].category).label)+'</span><h2 id="dialog-title">'+t('compareTitle')+'</h2><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th scope="col">'+t('model')+'</th>'+list.map(p=>'<th scope="col"><img src="'+img(p.id,true)+'" alt="'+p.name+'"><strong>'+p.name+'</strong><p>'+money(p.price)+'</p><button class="button button-dark" data-action="add" data-id="'+p.id+'"><span>'+t('add')+'</span><span aria-hidden="true">+</span></button><button class="comparison-remove" data-action="compare-toggle" data-id="'+p.id+'">'+t('remove')+'</button></th>').join('')+'</tr></thead><tbody>'+keys.map(key=>'<tr><td>'+L(D.specLabels[key])+'</td>'+list.map(p=>'<td>'+L(p.specs[key]||'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="comparison-bottom">'+t('compareNote')+'</p></div>');
  }
  function renderInfo(kind) {
    let body='',title='';
    if(kind==='delivery'){title=t('deliveryTitle');body='<p>'+t('deliveryText')+'</p><p>'+t('deliveryText2')+'</p>';}
    else if(kind==='support'){title=t('supportTitle');body=[1,2,3].map(i=>'<details'+(i===1?' open':'')+'><summary>'+t('faq'+i)+'</summary><p>'+t('faq'+i+'text')+'</p></details>').join('');}
    else{title=t('aboutTitle');body='<p>'+t('aboutText')+'</p><p>'+t('aboutText2')+'</p><button class="button button-dark" data-action="shop"><span>'+t('continueShopping')+'</span><span aria-hidden="true">↗</span></button>';}
    showDialog('info','<div class="info-dialog">'+closeButton()+'<span class="eyebrow">SAVAGE / '+kind.toUpperCase()+'</span><h2 id="dialog-title">'+title+'</h2>'+body+'</div>');
  }
  function language() {
    state.lang=state.lang==='ru'?'en':'ru';persist();applyLanguage();
  }
  function applyLanguage() {
    document.documentElement.lang=state.lang;document.title='SAVAGE — '+(state.lang==='en'?'Play beyond.':'Играй дерзко.');
    translate();$$('[data-lang]').forEach(el=>el.classList.toggle('is-active',el.dataset.lang===state.lang));
    $('#catalog-search').setAttribute('aria-label',t('search'));$('.main-nav').setAttribute('aria-label',state.lang==='en'?'Main navigation':'Главная навигация');
    $('#lab-canvas').setAttribute('aria-label',state.lang==='en'?'Interactive 3D model. Drag or use arrow keys to rotate, plus and minus to zoom.':'Интерактивная 3D-модель. Потяни или используй стрелки для вращения, плюс и минус для масштаба.');
    renderMenu();renderCategories();renderCatalog();renderOrbit();window.SavageLab?.localize();
  }
  function applyMotion() {
    document.documentElement.classList.toggle('no-motion',!state.motion);$('[data-action="motion"]').setAttribute('aria-pressed',String(!state.motion));window.SavageLab?.motionChanged(state.motion);requestScroll();
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-action]');if(!el)return;
    const action=el.dataset.action,id=el.dataset.id;
    if(action==='menu'){menuOpen?closeMenu():openMenu();}
    else if(action==='menu-close')closeMenu();
    else if(action==='all-gear'){e.preventDefault();setCategory('all',true);}
    else if(action==='category'){setCategory(el.dataset.category,true);}
    else if(action==='language')language();
    else if(action==='product')openProduct(id,el);
    else if(action==='product-family')openProduct(id);
    else if(action==='gallery')changeGallery(Number(el.dataset.index));
    else if(action==='close')closeDialog();
    else if(action==='add')add(id);
    else if(action==='cart')renderCart();
    else if(action==='cart-remove'){state.cart=state.cart.filter(c=>c.id!==id);persist();renderCart();}
    else if(action==='quantity')quantity(id,Number(el.dataset.delta));
    else if(action==='checkout')renderCheckout();
    else if(action==='compare-toggle')compareToggle(id);
    else if(action==='compare-open')renderComparison();
    else if(action==='search')renderSearch();
    else if(action==='filter')setCategory(el.dataset.category);
    else if(action==='filters-reset'){state.query='';state.sort='featured';$('#catalog-search').value='';$('#catalog-sort').value='featured';setCategory('all');}
    else if(action==='more'){state.visible+=6;renderCatalog();}
    else if(action==='orbit-prev')goOrbit(state.orbit-1);
    else if(action==='orbit-next')goOrbit(state.orbit+1);
    else if(action==='orbit-select')goOrbit(Number(el.dataset.index));
    else if(action==='shop'){closeDialog();$('#catalog').scrollIntoView({behavior:state.motion?'smooth':'instant'});}
    else if(action==='bundle'){['strike-75','pulse-pro','echo-x','drift-xl'].forEach(id=>add(id,true));renderCart();}
    else if(action==='open-lab'){closeDialog();$('#lab').scrollIntoView({behavior:state.motion?'smooth':'instant'});window.SavageLab?.setDevice(el.dataset.device);}
    else if(action==='info')renderInfo(el.dataset.info);
    else if(action==='motion'){state.motion=!state.motion;persist();applyMotion();}
  });
  document.addEventListener('click',e=>{if(e.target.closest('a[href^="#"]'))closeMenu();});
  document.addEventListener('input',e=>{
    if(e.target.id==='catalog-search'){state.query=e.target.value.trim();state.visible=6;renderCatalog();}
    if(e.target.id==='global-search')searchResults(e.target.value);
  });
  $('#catalog-sort').addEventListener('change',e=>{state.sort=e.target.value;renderCatalog();});
  document.addEventListener('submit',e=>{if(e.target.id==='checkout-form'){e.preventDefault();if(e.target.reportValidity())finishCheckout();}});
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeDialog();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&dialog.open){e.preventDefault();closeDialog();return;}
    if(e.key==='Escape'&&menuOpen){closeMenu();menuFocus?.focus();}
    if(menuOpen&&e.key==='Tab'){const links=$$('button,a', $('#gear-menu'));const first=links[0],last=links.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();$('.menu-trigger').focus();}}
  });
  $('.orbit-stage').addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();goOrbit(state.orbit+(e.key==='ArrowRight'?1:-1));}});
  let dragStart=null,dragged=false;
  const orbitStage=$('.orbit-stage');
  orbitStage.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.round-button'))return;dragStart={x:e.clientX,y:e.clientY};dragged=false;});
  orbitStage.addEventListener('pointermove',e=>{if(dragStart&&Math.abs(e.clientX-dragStart.x)>30)dragged=true;});
  orbitStage.addEventListener('pointerup',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){goOrbit(state.orbit+(dx<0?1:-1));dragged=true;}dragStart=null;});
  orbitStage.addEventListener('pointercancel',()=>{dragStart=null;});
  orbitStage.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}},true);
  $$('.menu-categories').forEach(root=>root.addEventListener('pointerover',e=>{const button=e.target.closest('[data-category]');if(!button)return;const p=item(cat(button.dataset.category).flagship);$('.menu-preview img').src=img(p.id,true);$('.menu-preview>span').textContent=p.name;}));
  let scrollQueued=false;
  const easeProgress=(v,a,b)=>{const x=clamp((v-a)/(b-a));return x*x*(3-2*x);};
  function updateScroll(){
    scrollQueued=false;
    const hero=$('.hero-sequence'),r=hero.getBoundingClientRect(),p=clamp(-r.top/Math.max(1,hero.offsetHeight-innerHeight));
    const introOut=easeProgress(p,.04,.34),productOut=easeProgress(p,.23,.48),constructionIn=easeProgress(p,.38,.62);
    $('.hero-intro').style.opacity=String(1-introOut);
    $('.hero-title').style.transform=state.motion?'translateX('+(-introOut*65)+'px)':'none';
    $('.hero-bottom').style.opacity=String(1-easeProgress(p,.16,.36));$('.hero-bottom').style.pointerEvents=p>.35?'none':'';
    $('.hero-device').style.opacity=String(1-productOut);$('.hero-device').style.pointerEvents=p>.46?'none':'';
    const mobile=innerWidth<701;
    $('.hero-device').style.transform='translate('+(-introOut*(mobile?20:75))+'px,'+(-introOut*(mobile?15:45))+'px) rotate('+((mobile?-22:-13)+introOut*8)+'deg) scale('+(1+introOut*.1)+')';
    $('.hero-exploded').style.opacity=String(easeProgress(p,.28,.53));
    $('.construction-copy').style.opacity=String(constructionIn);$('.construction-copy').style.transform=state.motion?'translateY('+((1-constructionIn)*35)+'px)':'none';
    $('.construction-copy').style.pointerEvents=constructionIn>.5?'auto':'none';
    $('.hero-meter>span').style.transform='scaleX('+p+')';
    const y=scrollY+80,show=$('#showroom').offsetTop,catalog=$('#catalog').offsetTop,lab=$('#lab').offsetTop,footer=$('.footer').offsetTop;
    $('#header').classList.toggle('is-dark',(y>=show&&y<catalog)||(y>=lab&&y<footer));
    syncCompareDock();
    if(state.motion&&!matchMedia('(pointer:coarse)').matches){const sr=$('#setup').getBoundingClientRect();if(sr.top<innerHeight&&sr.bottom>0)$('.setup-photo').style.transform='translateY('+clamp(sr.top*.06,-35,35)+'px) scale(1.08)';}
  }
  function requestScroll(){if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateScroll);}}
  addEventListener('scroll',requestScroll,{passive:true});addEventListener('resize',()=>{requestScroll();renderOrbit();},{passive:true});
  systemReduced.addEventListener('change',e=>{if(e.matches){state.motion=false;applyMotion();}});
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});},{threshold:.14});
  $$('[data-animate]').filter(el=>!el.closest('.hero-pin')).forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
  const activity=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-offscreen',!entry.isIntersecting)),{rootMargin:'150px'});
  $$('.scene').forEach(el=>activity.observe(el));
  $$('[data-brand]').forEach(el=>{el.innerHTML=logo();});$$('[data-mark]').forEach(el=>{el.innerHTML=mark();});$$('[data-wordmark]').forEach(el=>{el.innerHTML=wordmark();});
  applyLanguage();applyMotion();requestScroll();
  if(state.motion){$$('.hero-title .line-mask>span').forEach((el,i)=>el.animate([{transform:'translateY(115%) rotate(3deg)'},{transform:'none'}],{duration:1100,delay:150+i*100,easing:'cubic-bezier(.2,.75,.2,1)',fill:'backwards'}));$('.hero-device').animate([{opacity:0,filter:'blur(10px)',translate:'120px 65px'},{opacity:1,filter:'blur(0)',translate:'0 0'}],{duration:1400,easing:'cubic-bezier(.2,.75,.2,1)'});}
  function route(){const match=location.hash.match(/^#product\/([a-z0-9-]+)$/);if(match&&item(match[1]))openProduct(match[1]);}
  addEventListener('hashchange',route);route();
  window.SAVAGE={state,t,L,toast,persist,products,openProduct,closeDialog};
})();
