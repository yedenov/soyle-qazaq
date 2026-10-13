import { units, lessons, phrases, categories, articles, resources } from './data.mjs';
import { STORAGE_KEY, initialState, validateImport, completeLesson, reviewPhrase, reviewQueue, dueCount, dateKey, addDays, xpTotal, streak, achievements } from './domain.mjs';
import { icon, heroArt, articleArt } from './icons.mjs';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
let state = initialState();
let storageWarning = '';
let quiz = null;
let review = null;
let phraseFilter = { query: '', category: 'all', favorites: false };
let libraryFilter = 'all';
let toastTimer;
let route = '';

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) state = validateImport(JSON.parse(stored));
} catch {
  storageWarning = 'Сохранённые данные недоступны. Прогресс этой сессии пока хранится в памяти. Вы можете сохранить новый экспорт в профиле.';
}

const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const today = () => dateKey();
const number = value => Number(value).toLocaleString('ru-RU');
const completedCount = () => Object.keys(state.completedLessons).length;
const reviewedToday = () => state.reviewRewards.filter(item => item.startsWith(`${today()}:`)).length;
const nextLesson = () => lessons.find(item => !state.completedLessons[item.id]) || lessons[0];
const lessonLink = lesson => `#/lesson/${lesson.id}`;
const percent = (value, total) => Math.min(100, Math.round(value / total * 100));
const dateLabel = day => new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

function announce(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
}

function save(next = state) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageWarning = '';
  } catch {
    storageWarning = 'Браузер не разрешает сохранение. Экспортируйте прогресс в профиле перед закрытием страницы.';
    announce(storageWarning);
  }
  document.documentElement.dataset.motion = state.profile.reducedMotion ? 'reduced' : 'normal';
}

const navigation = [
  ['/', 'home', 'Мой день'], ['/learn', 'book', 'Уроки'], ['/practice', 'cards', 'Карточки'], ['/phrasebook', 'chat', 'Разговорник'],
  ['/library', 'compass', 'О языке и культуре'], ['/achievements', 'trophy', 'Достижения'],
];

function activeRoute(path) {
  if (path === '/') return route === '/';
  if (path === '/learn') return route.startsWith('/learn') || route.startsWith('/lesson');
  return route.startsWith(path);
}

function shell(content, label) {
  const level = Math.floor(xpTotal(state) / 500) + 1;
  const initials = state.profile.name ? [...state.profile.name.trim()][0].toLocaleUpperCase('ru-RU') : 'С';
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="Основная навигация">
      <a class="brand" href="#/" aria-label="Söyle Qazaq — главная"><span class="brand-mark">${icon('chat')}</span><span>söyle<span class="brand-sub">QAZAQ</span></span></a>
      <div class="sidebar-tag">Язык, который сближает</div>
      <p class="nav-heading">ВАШЕ ПРОСТРАНСТВО</p>
      <nav class="navigation">${navigation.map(([path, symbol, title]) => `<a class="nav-link ${activeRoute(path) ? 'active' : ''}" href="#${path}" ${activeRoute(path) ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${title}</span>${path === '/practice' && dueCount(state) ? `<span class="nav-count">${dueCount(state)}</span>` : ''}</a>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="level-card"><span class="level-flower">${icon('sprout')}</span><div><strong>Уровень ${level}</strong><span>${number(xpTotal(state))} XP · шаг за шагом</span></div><div class="level-track"><span style="width:${(xpTotal(state) % 500) / 5}%"></span></div></div>
      <a class="nav-link ${route === '/profile' ? 'active' : ''}" href="#/profile">${icon('settings')}<span>Мой профиль</span></a>
      <a class="about-link" href="#/about">О проекте ${icon('external')}</a><p class="local-note">${icon('shield')} Прогресс на этом устройстве</p></div>
    </aside>
    <div class="main-shell"><header class="topbar"><div class="breadcrumb"><span>Моё обучение</span>${icon('chevron')}<strong>${esc(label)}</strong></div><a href="#/practice" class="streak-pill" title="Дней с завершённым уроком или повторением подряд">${icon('flame')}<b>${streak(state)}</b><span>дн. подряд</span></a><a class="avatar" href="#/profile" aria-label="Открыть профиль">${esc(initials)}</a></header>
      <main id="main" tabindex="-1">${storageWarning ? `<div class="storage-warning" role="alert">${icon('shield')}<span>${esc(storageWarning)}</span></div>` : ''}${content}</main>
      <footer class="footer"><span>Söyle Qazaq · маленькие шаги к большому разговору</span><a href="#/about">Сделано с заботой о языке ${icon('heart')}</a></footer>
    </div>
    <nav class="mobile-nav" aria-label="Мобильная навигация">${[['/', 'home', 'Мой день'], ['/learn', 'book', 'Уроки'], ['/practice', 'cards', 'Карточки'], ['/phrasebook', 'chat', 'Фразы'], ['/profile', 'user', 'Профиль']].map(([path, symbol, title]) => `<a href="#${path}" class="${activeRoute(path) ? 'active' : ''}">${icon(symbol)}<span>${title}</span></a>`).join('')}</nav>
  </div>`;
}

function pageHeading(eyebrow, title, text, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${text ? `<p class="page-description">${text}</p>` : ''}</div>${action}</div>`;
}

function sectionHeading(title, link, url) {
  return `<div class="section-heading"><h2>${title}</h2>${link ? `<a href="${url}" class="text-link">${link}${icon('arrow')}</a>` : ''}</div>`;
}

function dashboard() {
  const lesson = nextLesson();
  const learned = Object.keys(state.reviews).length;
  const goal = state.profile.goal;
  const count = reviewedToday();
  const dailyPhrase = phrases[Math.floor(Date.now() / 86400000) % phrases.length];
  const progress = percent(completedCount(), lessons.length);
  return `${pageHeading('ЖАҚСЫ КҮН · ХОРОШИЙ ДЕНЬ', `${state.profile.name ? `Сәлем, ${esc(state.profile.name)}` : 'Сәлем, достым'}<span class="greeting-spark">✳</span>`, 'Чуть больше казахского. Чуть ближе друг к другу.', `<span class="date-badge">${icon('calendar')}${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span>`)}
    <div class="hero-grid"><section class="hero-card"><div class="hero-copy"><span class="hero-tag"><span></span> ВАШ МАЛЕНЬКИЙ ШАГ СЕГОДНЯ</span><h2>Большие разговоры<br>начинаются с <em>сәлем.</em></h2><p>Пять минут для новых слов.<br>И целый мир, чтобы их использовать.</p><a class="button button-dark" href="${lessonLink(lesson)}">${completedCount() ? 'Продолжить обучение' : 'Начать первый урок'}${icon('arrow')}</a><span class="hero-footnote">${icon('clock')}${lesson.duration} минут · ${esc(lesson.short)}</span></div>${heroArt()}</section>
    <section class="goal-card"><div class="goal-heading"><span class="mini-icon">${icon('spark')}</span><a href="#/profile" aria-label="Изменить дневную цель">${icon('settings')}</a></div><h2>В своём ритме</h2><p>Ваша цель на сегодня</p><div class="goal-ring" style="--progress:${percent(count, goal)}%"><div><strong>${Math.min(count, goal)}<small> / ${goal}</small></strong><span>карточек</span></div></div><p class="goal-caption">${count >= goal ? 'Цель достигнута. Тамаша!' : 'Небольшая практика — большой вклад.'}</p><a href="#/practice" class="button button-outline">${count >= goal ? 'Ещё немного практики' : 'Повторить слова'}${icon('arrow')}</a></section></div>
    <div class="stats-row"><div class="stat-card"><span class="stat-icon lilac">${icon('book')}</span><div><strong>${completedCount()} <small>/ 12</small></strong><span>уроков пройдено</span></div><span class="stat-detail">${progress}% пути</span></div><div class="stat-card"><span class="stat-icon mint">${icon('cards')}</span><div><strong>${learned}</strong><span>карточек изучено</span></div><span class="stat-detail">из ${phrases.length}</span></div><div class="stat-card"><span class="stat-icon peach">${icon('spark')}</span><div><strong>${number(xpTotal(state))}</strong><span>очков опыта</span></div><span class="stat-detail">ваш прогресс</span></div></div>
    ${sectionHeading('Ваш учебный маршрут', 'Все уроки', '#/learn')}<div class="unit-grid">${units.map(unitCard).join('')}</div>
    <div class="bottom-grid"><section class="phrase-day"><span class="eyebrow">БҮГІНГІ ФРАЗА · ФРАЗА ДНЯ</span><div class="phrase-day-content"><div><h2 lang="kk">${esc(dailyPhrase.kk)}</h2><p>${esc(dailyPhrase.ru)}</p></div><button class="round-button" data-action="speak" data-phrase="${dailyPhrase.id}" aria-label="Озвучить фразу">${icon('audio')}</button></div><a class="text-link" href="#/phrasebook">Открыть разговорник${icon('arrow')}</a></section><a href="#/library/small-steps" class="editorial-teaser"><div><span class="eyebrow">НЕ ТОЛЬКО СЛОВА</span><h2>Почувствуйте<br>язык изнутри.</h2><span class="text-link">Истории и идеи для практики${icon('arrow')}</span></div>${articleArt('books')}</a></div>`;
}

function unitCard(unit) {
  const items = lessons.filter(item => item.unit === unit.id);
  const count = items.filter(item => state.completedLessons[item.id]).length;
  const first = items.find(item => !state.completedLessons[item.id]) || items[0];
  return `<a class="unit-card" href="${lessonLink(first)}"><div class="unit-top"><span class="unit-symbol ${unit.color}">${icon(unit.icon)}</span><span class="unit-number">МОДУЛЬ ${unit.number}</span>${icon('arrow')}</div><h3>${unit.title}</h3><p>${unit.subtitle}</p><div class="unit-progress"><span style="width:${count * 25}%"></span></div><div class="unit-meta"><span>${count} из 4 уроков</span><span>${count === 4 ? 'Завершён ✓' : 'Начальный'}</span></div></a>`;
}

function learnPage() {
  return `${pageHeading('ПО ОДНОМУ ШАГУ', 'От первого слова —<br>к первому разговору.', '12 коротких уроков. Все открыты: выбирайте свою отправную точку.', `<div class="course-progress"><strong>${completedCount()}<span>/12</span></strong><small>уроков завершено</small></div>`)}<div class="course-banner">${icon('sprout')}<span>Начальный маршрут · примеры, понятные правила и 4 вопроса в каждом уроке</span><span class="pill">~ 1 час на весь маршрут</span></div>
    <div class="learning-units">${units.map(unit => `<section class="learning-unit"><div class="learning-unit-header"><span class="unit-symbol ${unit.color}">${icon(unit.icon)}</span><div><p class="eyebrow">МОДУЛЬ ${unit.number}</p><h2>${unit.title}</h2><p>${unit.subtitle}</p></div></div><div class="lesson-list">${lessons.filter(item => item.unit === unit.id).map((lesson, index) => {
      const done = state.completedLessons[lesson.id];
      return `<a class="lesson-row ${done ? 'complete' : ''}" href="${lessonLink(lesson)}"><span class="lesson-number">${done ? icon('check') : String(index + 1).padStart(2, '0')}</span><div><h3>${lesson.title}</h3><p>${lesson.goal}</p></div><span class="lesson-time">${icon('clock')}${lesson.duration} мин</span><span class="lesson-status">${done ? `${done.score}% · повторить` : '+100 XP'}</span>${icon('chevron')}</a>`;
    }).join('')}</div></section>`).join('')}</div><div class="info-strip">${icon('shield')}<p>Это вводный учебный маршрут, а не сертификация языкового уровня. Все примеры можно повторять в удобном темпе.</p></div>`;
}

function lessonPage(id) {
  const lesson = lessons.find(item => item.id === id);
  if (!lesson) return notFound();
  if (quiz?.id === id && quiz.stage !== 'intro') return quizPage(lesson);
  const unit = units.find(item => item.id === lesson.unit);
  return `<a class="back-link" href="#/learn">${icon('arrowLeft')}Ко всем урокам</a>${pageHeading(`МОДУЛЬ ${unit.number} · ${unit.title.toUpperCase()}`, lesson.title, lesson.goal, `<span class="pill">${icon('clock')}${lesson.duration} минут</span>`)}
    <div class="lesson-layout"><article class="study-card"><span class="eyebrow">РАЗБЕРЁМСЯ ВМЕСТЕ</span><h2>Немного о том, как это работает</h2><p class="rule-text">${lesson.rule}</p><h3 class="example-heading">Прочитайте и произнесите вслух</h3><div class="examples">${lesson.examples.map((example, index) => `<div class="example"><span class="example-number">0${index + 1}</span><div><strong lang="kk">${example.kk}</strong><p>${example.ru}</p>${example.note ? `<small>${example.note}</small>` : ''}</div><button class="round-button" data-action="speak-example" data-lesson="${id}" data-index="${index}" aria-label="Озвучить пример ${index + 1}">${icon('audio')}</button></div>`).join('')}</div></article>
    <aside class="lesson-aside"><div class="practice-prompt"><span class="large-icon lilac">${icon('spark')}</span><h2>Попробуем?</h2><p>Ответьте на 4 вопроса. После каждого — небольшое объяснение.</p><ul><li>${icon('check')}3 верных ответа для зачёта</li><li>${icon('check')}+100 XP за первое завершение</li><li>${icon('check')}Можно пробовать сколько угодно</li></ul><button class="button button-primary full" data-action="quiz-start" data-id="${id}">Начать практику${icon('arrow')}</button>${state.completedLessons[id] ? `<span class="saved-result">${icon('check')}Ваш лучший результат: ${state.completedLessons[id].score}%</span>` : ''}</div><p class="small-note">Озвучивание использует казахский голос устройства, если он установлен. Его наличие зависит от браузера.</p></aside></div>`;
}

function quizPage(lesson) {
  if (quiz.stage === 'result') {
    const { result, earned } = quiz;
    const index = lessons.findIndex(item => item.id === lesson.id);
    const next = lessons[index + 1];
    return `<div class="result-page"><span class="result-medallion ${result.passed ? 'success' : ''}">${icon(result.passed ? 'trophy' : 'sprout')}</span><p class="eyebrow">${result.passed ? 'ТАМАША · ОТЛИЧНО' : 'КАЖДАЯ ПОПЫТКА — ПРАКТИКА'}</p><h1>${result.passed ? 'Ещё один шаг сделан.' : 'Давайте попробуем ещё.'}</h1><p>${result.passed ? 'Эти слова уже чуть ближе. Вернитесь к ним в разговоре.' : 'Для зачёта нужно 3 верных ответа. Перечитайте объяснения и повторите.'}</p><div class="result-stats"><div><strong>${result.correct}/${result.total}</strong><span>верных ответов</span></div><div><strong>${result.percent}%</strong><span>точность</span></div><div><strong>+${earned}</strong><span>XP ${earned ? 'заработано' : 'за эту попытку'}</span></div></div>${result.passed && !earned ? '<p class="small-note">XP за этот урок уже начислены. Повторение улучшает результат без повторного начисления.</p>' : ''}<div class="result-actions">${result.passed && next ? `<a class="button button-primary" href="${lessonLink(next)}">Следующий урок${icon('arrow')}</a>` : ''}<button class="button ${result.passed ? 'button-outline' : 'button-primary'}" data-action="quiz-start" data-id="${lesson.id}">${icon('refresh')}Повторить</button><a class="button button-quiet" href="#/learn">Все уроки</a></div><details class="answer-review"><summary>Разобрать все ответы</summary>${lesson.questions.map((q, index) => `<div class="answer-review-item"><strong>${index + 1}. ${q.prompt}</strong><p class="${quiz.answers[index] === q.correct ? 'correct-text' : 'incorrect-text'}">Ваш ответ: ${q.options[quiz.answers[index]]}</p><p>Верный ответ: ${q.options[q.correct]}</p><small>${q.explanation}</small></div>`).join('')}</details></div>`;
  }
  const q = lesson.questions[quiz.index];
  const answered = quiz.answers[quiz.index] !== undefined;
  const correct = quiz.answers[quiz.index] === q.correct;
  return `<div class="quiz-wrap"><div class="quiz-top"><button class="back-link" data-action="quiz-exit">${icon('arrowLeft')}К материалу</button><span>${quiz.index + 1} / ${lesson.questions.length}</span></div><div class="quiz-track"><span style="width:${quiz.index / lesson.questions.length * 100}%"></span></div><span class="eyebrow">${lesson.short.toUpperCase()} · ВЫБЕРИТЕ ОДИН ОТВЕТ</span><h1 class="quiz-question">${q.prompt}</h1><div class="quiz-options" role="group" aria-label="Варианты ответа">${q.options.map((option, index) => `<button class="quiz-option ${answered && index === q.correct ? 'correct' : ''} ${answered && index === quiz.answers[quiz.index] && !correct ? 'incorrect' : ''}" data-action="quiz-answer" data-index="${index}" ${answered ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${option}</span>${answered && index === q.correct ? icon('check') : answered && index === quiz.answers[quiz.index] ? icon('close') : ''}</button>`).join('')}</div>${answered ? `<div class="quiz-feedback ${correct ? 'positive' : 'negative'}" role="status"><span class="feedback-icon">${icon(correct ? 'check' : 'sprout')}</span><div><strong>${correct ? 'Дұрыс! Всё верно.' : 'Запомним вместе.'}</strong><p>${q.explanation}</p></div></div><button class="button button-primary quiz-next" data-action="quiz-next">${quiz.index === lesson.questions.length - 1 ? 'Посмотреть результат' : 'Следующий вопрос'}${icon('arrow')}</button>` : '<p class="quiz-hint">Ошибаться можно. Именно для этого мы практикуемся.</p>'}</div>`;
}

function practicePage() {
  if (review?.stage === 'active') return reviewSession();
  if (review?.stage === 'done') return `<div class="result-page"><span class="result-medallion success">${icon('cards')}</span><p class="eyebrow">СЛОВА ОСТАЮТСЯ С ВАМИ</p><h1>Отличная небольшая практика.</h1><p>Вы повторили ${review.cards.length} карточек. Следующие даты уже в расписании.</p><div class="result-stats"><div><strong>${review.cards.length}</strong><span>повторено</span></div><div><strong>+${review.earned}</strong><span>XP</span></div><div><strong>${review.remembered}</strong><span>легко вспомнили</span></div></div><div class="result-actions"><button class="button button-primary" data-action="review-again">К карточкам${icon('arrow')}</button><a class="button button-outline" href="#/">Мой день</a></div><p class="small-note">Это ваша самооценка, а не тест на владение языком.</p></div>`;
  const studied = Object.keys(state.reviews).length;
  const due = dueCount(state);
  const queue = reviewQueue(state);
  const upcoming = phrases.filter(item => state.reviews[item.id]).sort((a, b) => state.reviews[a.id].due.localeCompare(state.reviews[b.id].due)).slice(0, 12);
  return `${pageHeading('ВСПОМИНАТЬ ЛУЧШЕ, ЧЕМ ПЕРЕЧИТЫВАТЬ', 'Слова, которые остаются.', 'Откройте карточку, вспомните перевод и честно оцените себя.')}<div class="practice-overview"><section class="review-start"><span class="eyebrow">ВАША СЛОВАРНАЯ КОПИЛКА</span><h2>${queue.length ? 'Немного практики.<br>Много новых возможностей.' : 'На сегодня всё повторено.'}</h2><p>${queue.length ? `В сессии — ${queue.length} карточек. Сначала слова, которым пора вернуться, затем новые.` : 'Все карточки уже запланированы на следующие дни. Можно свободно повторить любые слова.'}</p><button class="button button-dark" data-action="review-start">${queue.length ? `Начать · ${queue.length} карточек` : 'Свободная практика'}${icon('arrow')}</button><div class="floating-cards" aria-hidden="true"><div>сөз<span>слово</span></div><div>әлем<span>мир</span></div></div></section><div class="review-counts"><div><span class="stat-icon peach">${icon('refresh')}</span><strong>${due}</strong><span>пора повторить</span></div><div><span class="stat-icon lilac">${icon('cards')}</span><strong>${phrases.length - studied}</strong><span>новых карточек</span></div><div><span class="stat-icon mint">${icon('check')}</span><strong>${studied}</strong><span>уже встречались</span></div></div></div><div class="info-strip">${icon('calendar')}<p><strong>Как устроено повторение:</strong> «Пока сложно» возвращает слово завтра. «Вспомнил» оставляет текущий интервал, «Легко» увеличивает его: 1 → 3 → 7 → 14 → 30 дней.</p></div>
    ${sectionHeading('Ваше расписание', 'Все слова', '#/phrasebook')}${upcoming.length ? `<div class="schedule-table"><div class="schedule-row schedule-header"><span>Слово или фраза</span><span>Перевод</span><span>Следующее повторение</span></div>${upcoming.map(item => `<div class="schedule-row"><strong lang="kk">${item.kk}</strong><span>${item.ru}</span><span class="${state.reviews[item.id].due <= today() ? 'due-label' : ''}">${state.reviews[item.id].due <= today() ? 'Пора повторить' : dateLabel(state.reviews[item.id].due)}</span></div>`).join('')}</div>` : `<div class="empty-state"><span class="large-icon lilac">${icon('sprout')}</span><h3>Здесь вырастет ваша коллекция</h3><p>После первой сессии появятся слова и даты следующего повторения.</p></div>`}`;
}

function reviewSession() {
  const card = review.cards[review.index];
  const category = categories.find(item => item.id === card.category);
  return `<div class="review-session"><div class="quiz-top"><button class="back-link" data-action="review-exit">${icon('arrowLeft')}Завершить сессию</button><span>${review.index + 1} / ${review.cards.length}</span></div><div class="quiz-track"><span style="width:${review.index / review.cards.length * 100}%"></span></div><p class="eyebrow">${category.name.toUpperCase()} · ВСПОМНИТЕ ПЕРЕВОД</p><div class="flashcard ${review.flipped ? 'flipped' : ''}"><span class="flashcard-label">ҚАЗАҚША</span><h1 lang="kk">${card.kk}</h1><button class="round-button" data-action="speak" data-phrase="${card.id}" aria-label="Озвучить карточку">${icon('audio')}</button>${review.flipped ? `<div class="flashcard-answer"><span>ПО-РУССКИ</span><p>${card.ru}</p></div>` : `<button class="button button-outline" data-action="review-flip">Показать перевод${icon('refresh')}</button>`}</div>${review.flipped ? `<div class="review-ratings"><button data-action="review-rate" data-quality="0"><span>Пока сложно</span><small>Повторим завтра</small></button><button data-action="review-rate" data-quality="1"><span>Вспомнил</span><small>Сохраним интервал</small></button><button data-action="review-rate" data-quality="2"><span>Легко</span><small>Увеличим интервал</small></button></div>` : '<p class="quiz-hint">Сначала попробуйте вспомнить. Даже если не получается — это полезная попытка.</p>'}</div>`;
}

function phrasebookPage() {
  return `${pageHeading('НУЖНЫЕ СЛОВА В НУЖНЫЙ МОМЕНТ', 'Разговор начинается здесь.', `${phrases.length} слов и фраз для повседневной жизни. Сохраняйте то, что пригодится вам.`, `<span class="phrase-total">${icon('chat')}${phrases.length} фразы</span>`)}<div class="search-toolbar"><label class="search-input">${icon('search')}<input id="phrase-search" type="search" value="${esc(phraseFilter.query)}" placeholder="Найти по-казахски или по-русски…" aria-label="Поиск по разговорнику"></label><button class="button ${phraseFilter.favorites ? 'button-primary' : 'button-outline'}" data-action="favorites-filter" aria-pressed="${phraseFilter.favorites}">${icon('bookmark')}Избранное <span>${state.favorites.length}</span></button></div><div class="filter-tabs" role="group" aria-label="Категории фраз"><button class="${phraseFilter.category === 'all' ? 'active' : ''}" data-action="phrase-category" data-category="all">Все фразы</button>${categories.map(category => `<button class="${phraseFilter.category === category.id ? 'active' : ''}" data-action="phrase-category" data-category="${category.id}">${category.name}</button>`).join('')}</div><div id="phrase-results">${phraseResults()}</div><p class="small-note audio-note">${icon('audio')}Кнопка звука работает при наличии казахского голоса на устройстве. При его отсутствии приложение предложит читать без озвучивания.</p>`;
}

function phraseResults() {
  const query = phraseFilter.query.trim().toLocaleLowerCase('ru-RU').normalize('NFC');
  const found = phrases.filter(item => (phraseFilter.category === 'all' || item.category === phraseFilter.category) && (!phraseFilter.favorites || state.favorites.includes(item.id)) && `${item.kk} ${item.ru}`.toLocaleLowerCase('ru-RU').normalize('NFC').includes(query));
  if (!found.length) return `<div class="empty-state"><span class="large-icon lilac">${icon(phraseFilter.favorites ? 'bookmark' : 'search')}</span><h3>${phraseFilter.favorites ? 'Пока нет подходящих сохранённых фраз' : 'Такую фразу мы пока не нашли'}</h3><p>Попробуйте другое слово или сбросьте фильтры.</p><button class="button button-outline" data-action="phrase-reset">Показать все фразы</button></div>`;
  return `<p class="results-count" aria-live="polite">Найдено: ${found.length}</p><div class="phrase-grid">${found.map(item => `<article class="phrase-card"><div class="phrase-card-top"><span>${categories.find(category => category.id === item.category).name}</span><button class="icon-button ${state.favorites.includes(item.id) ? 'bookmarked' : ''}" data-action="favorite" data-id="${item.id}" aria-pressed="${state.favorites.includes(item.id)}" aria-label="${state.favorites.includes(item.id) ? 'Убрать из избранного' : 'Сохранить фразу'}">${icon('bookmark')}</button></div><h3 lang="kk">${item.kk}</h3><p>${item.ru}</p><div class="phrase-card-bottom"><span>${state.reviews[item.id] ? `${icon('check')} Уже повторяли` : 'Новая фраза'}</span><button class="round-button" data-action="speak" data-phrase="${item.id}" aria-label="Озвучить: ${esc(item.kk)}">${icon('audio')}</button></div></article>`).join('')}</div>`;
}

function libraryPage() {
  const displayed = libraryFilter === 'read' ? articles.filter(item => state.readArticles.includes(item.id)) : articles;
  return `${pageHeading('ЗА СЛОВАМИ — ЦЕЛЫЙ МИР', 'Язык живёт в историях.', 'Короткие материалы о языке, повседневном общении и привычке учиться.')}<div class="filter-tabs"><button data-action="library-filter" data-filter="all" class="${libraryFilter === 'all' ? 'active' : ''}">Все материалы</button><button data-action="library-filter" data-filter="read" class="${libraryFilter === 'read' ? 'active' : ''}">Прочитанное · ${state.readArticles.length}</button></div>${displayed.length ? `<div class="article-grid">${displayed.map(item => `<a class="article-card" href="#/library/${item.id}"><div class="article-cover ${item.color}">${articleArt(item.art)}<span class="article-category">${item.category}</span></div><div class="article-card-body"><span class="reading-time">${icon('clock')}${item.minutes} минуты ${state.readArticles.includes(item.id) ? '· прочитано ✓' : ''}</span><h2>${item.title}</h2><p>${item.summary}</p><span class="text-link">Читать историю${icon('arrow')}</span></div></a>`).join('')}</div>` : `<div class="empty-state"><span class="large-icon lilac">${icon('book')}</span><h3>Ваша библиотека только начинается</h3><p>Откройте материал и отметьте его прочитанным.</p><button class="button button-outline" data-action="library-filter" data-filter="all">Все материалы</button></div>`}${resourceLinks()}`;
}

function resourceLinks() {
  return `<section class="resources">${sectionHeading('Для дальнейшего путешествия', '', '')}<p class="section-description">Проверенные внешние ресурсы. Откроются в новой вкладке.</p><div class="resource-grid">${resources.map(item => `<a class="resource-card" href="${item.url}" target="_blank" rel="noopener noreferrer"><span class="resource-icon">${icon('external')}</span><div><h3>${item.title}</h3><p>${item.description}</p></div>${icon('arrow')}</a>`).join('')}</div></section>`;
}

function articlePage(id) {
  const article = articles.find(item => item.id === id);
  if (!article) return notFound();
  return `<a class="back-link" href="#/library">${icon('arrowLeft')}В библиотеку</a><article class="article-detail"><div class="article-detail-top"><div><p class="eyebrow">${article.category.toUpperCase()} · ${article.minutes} МИНУТЫ</p><h1>${article.title}</h1><p class="article-lead">${article.lead}</p></div><div class="article-detail-art ${article.color}">${articleArt(article.art)}</div></div><div class="article-prose">${article.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')}<div class="vocabulary-box"><h2>Три слова с собой</h2>${article.vocabulary.map(([kk, ru]) => `<div><strong lang="kk">${kk}</strong><span>${ru}</span></div>`).join('')}</div><button class="button ${state.readArticles.includes(id) ? 'button-outline' : 'button-primary'}" data-action="article-read" data-id="${id}">${icon('check')}${state.readArticles.includes(id) ? 'Отмечено как прочитанное' : 'Я прочитал / прочитала'}</button><p class="small-note">Авторский учебный материал Söyle Qazaq. Примеры начального уровня, без сертификации.</p></div></article>${resourceLinks()}`;
}

function achievementsPage() {
  const all = achievements(state);
  const count = all.filter(item => item.unlocked).length;
  return `${pageHeading('КАЖДЫЙ ШАГ ИМЕЕТ ЗНАЧЕНИЕ', 'Ваши маленькие победы.', 'Награды за любопытство и практику. Сравнивайте себя только с собой.', `<span class="pill">${icon('trophy')}${count} из ${all.length} открыто</span>`)}<section class="achievement-banner"><span class="banner-trophy">${icon('trophy')}</span><div><h2>${count ? 'Вам уже есть чем гордиться.' : 'У каждой истории есть первый шаг.'}</h2><p>${count ? `Вы открыли ${count} достижений. Продолжайте в своём темпе.` : 'Завершите первый урок — и здесь появится ваша первая награда.'}</p></div><a class="button button-dark" href="${lessonLink(nextLesson())}">К урокам${icon('arrow')}</a></section><div class="achievement-grid">${all.map(item => `<article class="achievement-card ${item.unlocked ? 'unlocked' : 'locked'}"><span class="achievement-medal">${icon(item.icon)}</span><span class="achievement-state">${item.unlocked ? `${icon('check')} ОТКРЫТО` : 'ВПЕРЕДИ'}</span><h2>${item.title}</h2><p>${item.description}</p><div class="unit-progress"><span style="width:${percent(item.current, item.target)}%"></span></div><span class="achievement-count">${number(Math.min(item.current, item.target))} / ${number(item.target)}</span></article>`).join('')}</div><p class="small-note">Награды рассчитываются из локального прогресса. «Три дня рядом» отражает текущую серию занятий.</p>`;
}

function profilePage() {
  const week = Array.from({ length: 7 }, (_, index) => addDays(today(), index - 6));
  return `${pageHeading('ВАШЕ УЮТНОЕ ПРОСТРАНСТВО', 'Учиться по-своему.', 'Настройте ритм, сохраните прогресс и возвращайтесь в любой момент.')}<div class="profile-layout"><div><section class="settings-card"><h2>Мой профиль</h2><p class="section-description">Имя видно только в этом браузере.</p><form id="profile-form"><label class="form-label" for="profile-name">Как к вам обращаться?</label><input class="text-input" id="profile-name" name="name" maxlength="40" autocomplete="given-name" placeholder="Ваше имя" value="${esc(state.profile.name)}"><label class="form-label" for="profile-goal">Карточек в день</label><select class="text-input" id="profile-goal" name="goal">${[5, 10, 15, 20].map(value => `<option value="${value}" ${state.profile.goal === value ? 'selected' : ''}>${value} карточек · ${value === 5 ? 'мягкий старт' : value === 10 ? 'комфортный ритм' : value === 15 ? 'уверенная практика' : 'погружение'}</option>`).join('')}</select><label class="checkbox-row"><input type="checkbox" name="reducedMotion" ${state.profile.reducedMotion ? 'checked' : ''}><span>Уменьшить анимации интерфейса</span></label><button class="button button-primary" type="submit">Сохранить настройки${icon('check')}</button></form></section><section class="settings-card"><h2>Ваш прогресс принадлежит вам</h2><p>Уроки, избранное и карточки хранятся локально. Экспортируйте файл, чтобы сохранить резервную копию или перенести данные.</p><div class="data-actions"><button class="button button-outline" data-action="export">${icon('download')}Экспорт прогресса</button><button class="button button-outline" data-action="import">${icon('upload')}Импорт</button><input type="file" id="import-file" accept="application/json,.json" hidden></div><p class="small-note">Импорт заменяет текущий прогресс после проверки файла и вашего подтверждения.</p><details class="reset-details"><summary>Сбросить прогресс</summary><p>Будут удалены уроки, карточки, настройки и избранное на этом устройстве. Сначала рекомендуем экспорт.</p><button class="button button-danger" data-action="reset">Удалить локальный прогресс</button></details></section></div><aside><section class="profile-summary"><div class="profile-big-avatar">${esc(state.profile.name ? [...state.profile.name][0].toLocaleUpperCase('ru-RU') : 'С')}</div><h2>${esc(state.profile.name || 'Любознательный ученик')}</h2><p>Уровень ${Math.floor(xpTotal(state) / 500) + 1} · ${number(xpTotal(state))} XP</p><div class="profile-summary-stats"><div><strong>${completedCount()}</strong><span>уроков</span></div><div><strong>${Object.keys(state.reviews).length}</strong><span>карточек</span></div><div><strong>${streak(state)}</strong><span>дн. подряд</span></div></div></section><section class="settings-card week-card"><h3>Последние 7 дней</h3><div class="week-dots">${week.map(day => `<div><span class="${state.activityDays.includes(day) ? 'active' : ''}" title="${dateLabel(day)}: ${state.activityDays.includes(day) ? 'была практика' : 'без практики'}">${state.activityDays.includes(day) ? icon('check') : '·'}</span><small>${new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' })}</small></div>`).join('')}</div><p class="small-note">День засчитывается после завершённого урока или повторённой карточки.</p></section><div class="privacy-note">${icon('shield')}<p><strong>Без аккаунта и трекеров.</strong> Приложение не отправляет ваши учебные данные на сервер. Озвучивание обрабатывается средствами браузера и ОС.</p></div><div class="profile-quick-links"><a class="text-link" href="#/achievements">${icon('trophy')}Мои достижения${icon('arrow')}</a><a class="text-link" href="#/library">${icon('book')}Язык и культура${icon('arrow')}</a><a class="text-link" href="#/about">${icon('compass')}О проекте и методике${icon('arrow')}</a></div></aside></div>`;
}

function aboutPage() {
  return `${pageHeading('СӨЙЛЕ · ГОВОРИ', 'Язык, который сближает.', 'Независимый открытый проект для первых шагов в казахском языке.')}<section class="about-hero"><div><h2>Меньше барьеров.<br>Больше поводов поговорить.</h2><p>Söyle Qazaq объединяет короткие уроки, практику вспоминания и фразы из повседневной жизни в одном спокойном пространстве. Здесь можно начать без регистрации и двигаться в своём темпе.</p><a class="button button-dark" href="#/learn">Сделать первый шаг${icon('arrow')}</a></div>${heroArt()}</section><div class="about-grid"><section class="settings-card"><span class="large-icon lilac">${icon('book')}</span><h2>Что уже работает</h2><p>12 уроков с объяснениями и 48 заданиями, 72 карточки, 6 материалов, избранное, награды, экспорт и импорт прогресса. Все функции доступны сразу.</p></section><section class="settings-card"><span class="large-icon mint">${icon('shield')}</span><h2>Ваши данные — рядом</h2><p>Прогресс хранится в localStorage вашего браузера. Нет общего рейтинга, серверного аккаунта или синхронизации. При очистке данных браузера прогресс удаляется; сохраните экспорт.</p></section><section class="settings-card"><span class="large-icon peach">${icon('sprout')}</span><h2>Честная учебная модель</h2><p>Зачёт урока: 3 из 4 ответов. +100 XP за первое завершение. Повторение: +5 XP за карточку один раз в день. Интервалы карточек: 1, 3, 7, 14, 30 дней. XP — мотивация, а не измерение знания языка.</p></section><section class="settings-card"><span class="large-icon yellow">${icon('heart')}</span><h2>Независимый проект</h2><p>Это портфолио-приложение с помощью ИИ при разработке. Оно не связано с Soyle.kz, Abai Institute или другими организациями. Материалы начального уровня требуют преподавательской редакции для полноценного курса и не дают сертификат.</p></section></div>${resourceLinks()}<section class="settings-card roadmap"><h2>Что дальше</h2><p>Преподавательская редактура и озвучивание носителями языка, расширение упражнений на ввод ответа, добровольная синхронизация между устройствами, полноценная проверка доступности. Эти возможности — планы, а не уже реализованные функции.</p><p class="small-note">Исходный код и руководство по запуску входят в комплект проекта.</p></section>`;
}

function notFound() {
  return `<div class="empty-state not-found"><span class="large-icon lilac">${icon('compass')}</span><p class="eyebrow">404 · НЕМНОГО СВЕРНУЛИ С МАРШРУТА</p><h1>Этой страницы здесь нет.</h1><p>Но все ваши уроки и слова по-прежнему рядом.</p><a class="button button-primary" href="#/">На главную${icon('arrow')}</a></div>`;
}

function render({ focus = false } = {}) {
  const previousRoute = route;
  try { route = decodeURIComponent(location.hash.slice(1) || '/'); } catch { route = '/404'; }
  const [section, id] = route.split('/').filter(Boolean);
  if (previousRoute && previousRoute !== route) { quiz = null; review = null; }
  let content, label;
  switch (section) {
    case undefined: content = dashboard(); label = 'Мой день'; break;
    case 'learn': content = learnPage(); label = 'Уроки'; break;
    case 'lesson': content = lessonPage(id); label = 'Уроки'; break;
    case 'practice': content = practicePage(); label = 'Карточки'; break;
    case 'phrasebook': content = phrasebookPage(); label = 'Разговорник'; break;
    case 'library': content = id ? articlePage(id) : libraryPage(); label = 'О языке и культуре'; break;
    case 'achievements': content = achievementsPage(); label = 'Достижения'; break;
    case 'profile': content = profilePage(); label = 'Мой профиль'; break;
    case 'about': content = aboutPage(); label = 'О проекте'; break;
    default: content = notFound(); label = 'Страница не найдена';
  }
  app.innerHTML = shell(content, label);
  document.title = `${label} · Söyle Qazaq`;
  document.documentElement.dataset.motion = state.profile.reducedMotion ? 'reduced' : 'normal';
  if (focus) { window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelector('#main').focus({ preventScroll: true }); }
}

function speak(text) {
  if (!('speechSynthesis' in window)) return announce('Этот браузер не поддерживает озвучивание. Прочитайте фразу вслух самостоятельно.');
  const voice = speechSynthesis.getVoices().find(item => /^kk(?:-|_|$)/i.test(item.lang));
  if (!voice) return announce('На устройстве нет казахского голоса. Текст доступен; проверенные аудиоматериалы найдёте в библиотеке.');
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'kk-KZ';
  utterance.voice = voice;
  utterance.rate = 0.85;
  utterance.onerror = () => announce('Не удалось воспроизвести аудио. Попробуйте ещё раз или прочитайте фразу самостоятельно.');
  speechSynthesis.speak(utterance);
}

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const { action, id } = button.dataset;
  switch (action) {
    case 'quiz-start': quiz = { id, stage: 'quiz', index: 0, answers: [] }; render({ focus: true }); break;
    case 'quiz-exit': quiz = null; render({ focus: true }); break;
    case 'quiz-answer': {
      if (!quiz || quiz.stage !== 'quiz' || quiz.answers[quiz.index] !== undefined) return;
      quiz.answers[quiz.index] = Number(button.dataset.index);
      render();
      document.querySelector('.quiz-next')?.focus();
      break;
    }
    case 'quiz-next': {
      if (!quiz || quiz.stage !== 'quiz' || quiz.answers[quiz.index] === undefined) return;
      const lesson = lessons.find(item => item.id === quiz.id);
      if (quiz.index < lesson.questions.length - 1) quiz.index++;
      else {
        const outcome = completeLesson(state, quiz.id, quiz.answers);
        save(outcome.state);
        quiz = { ...quiz, stage: 'result', result: outcome.result, earned: outcome.earned };
      }
      render({ focus: true });
      break;
    }
    case 'review-start': {
      const queue = reviewQueue(state);
      review = { stage: 'active', cards: queue.length ? queue : phrases.slice(0, 10), index: 0, flipped: false, earned: 0, remembered: 0 };
      render({ focus: true }); break;
    }
    case 'review-flip': if (review?.stage === 'active') { review.flipped = true; render(); document.querySelector('.review-ratings button')?.focus(); } break;
    case 'review-rate': {
      if (!review?.flipped || review.stage !== 'active') return;
      const quality = Number(button.dataset.quality);
      const outcome = reviewPhrase(state, review.cards[review.index].id, quality);
      save(outcome.state);
      review.earned += outcome.earned;
      if (quality === 2) review.remembered++;
      review.index++;
      review.flipped = false;
      if (review.index === review.cards.length) review.stage = 'done';
      render({ focus: true }); break;
    }
    case 'review-exit': review = null; render({ focus: true }); announce('Завершённые карточки уже сохранены.'); break;
    case 'review-again': review = null; render({ focus: true }); break;
    case 'speak': { const phrase = phrases.find(item => item.id === button.dataset.phrase); if (phrase) speak(phrase.kk); break; }
    case 'speak-example': { const lesson = lessons.find(item => item.id === button.dataset.lesson); const example = lesson?.examples[Number(button.dataset.index)]; if (example) speak(example.kk); break; }
    case 'favorite': {
      if (!phrases.some(item => item.id === id)) return;
      state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id];
      save(); render();
      document.querySelector(`[data-action="favorite"][data-id="${id}"]`)?.focus({ preventScroll: true });
      break;
    }
    case 'favorites-filter': phraseFilter.favorites = !phraseFilter.favorites; render(); break;
    case 'phrase-category': phraseFilter.category = button.dataset.category; render(); break;
    case 'phrase-reset': phraseFilter = { query: '', category: 'all', favorites: false }; render(); break;
    case 'library-filter': libraryFilter = button.dataset.filter; render(); break;
    case 'article-read':
      if (articles.some(item => item.id === id) && !state.readArticles.includes(id)) { state.readArticles.push(id); save(); render(); announce('Материал отмечен как прочитанный.'); }
      else announce('Этот материал уже в вашей прочитанной коллекции.');
      break;
    case 'export': {
      const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `soyle-progress-${today()}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      announce('Файл прогресса подготовлен для скачивания.'); break;
    }
    case 'import': document.querySelector('#import-file').click(); break;
    case 'reset':
      if (confirm('Удалить весь прогресс Söyle Qazaq на этом устройстве? Сначала сохраните экспорт, если хотите оставить копию.')) { save(initialState()); quiz = null; review = null; render({ focus: true }); announce('Локальный прогресс сброшен. Можно начать заново.'); }
      break;
  }
});

app.addEventListener('input', event => {
  if (event.target.id === 'phrase-search') {
    phraseFilter.query = event.target.value;
    document.querySelector('#phrase-results').innerHTML = phraseResults();
  }
});

app.addEventListener('submit', event => {
  if (event.target.id !== 'profile-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  const name = String(form.get('name')).trim().replace(/[\u0000-\u001f]/g, '').slice(0, 40);
  const goal = Number(form.get('goal'));
  if (![5, 10, 15, 20].includes(goal)) return;
  state.profile = { name, goal, reducedMotion: form.has('reducedMotion') };
  save(); render(); announce('Настройки сохранены. Жақсы!');
});

app.addEventListener('change', async event => {
  if (event.target.id !== 'import-file') return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Файл слишком большой. Максимальный размер — 2 МБ.');
    const imported = validateImport(JSON.parse(await file.text()));
    if (confirm(`Заменить текущий прогресс? В файле: ${Object.keys(imported.completedLessons).length} уроков, ${Object.keys(imported.reviews).length} карточек, ${xpTotal(imported)} XP.`)) {
      save(imported); quiz = null; review = null; render({ focus: true }); announce('Прогресс успешно восстановлен.');
    }
  } catch (error) {
    announce(error instanceof SyntaxError ? 'Не удалось прочитать JSON. Выберите файл экспорта Söyle Qazaq.' : error.message);
  } finally {
    const input = document.querySelector('#import-file');
    if (input) input.value = '';
  }
});

document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#main').focus();
});

window.addEventListener('hashchange', () => render({ focus: true }));
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  try { state = event.newValue ? validateImport(JSON.parse(event.newValue)) : initialState(); render(); announce('Прогресс обновлён из другой вкладки.'); } catch { announce('Изменения из другой вкладки не удалось прочитать.'); }
});
if ('speechSynthesis' in window) speechSynthesis.getVoices();
render();
