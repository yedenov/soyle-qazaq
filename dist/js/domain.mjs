import { lessons, phrases, articles } from './data.mjs';

export const STORAGE_KEY = 'soyle-qazaq-v1';
const lessonIds = new Set(lessons.map(item => item.id));
const phraseIds = new Set(phrases.map(item => item.id));
const articleIds = new Set(articles.map(item => item.id));
const intervals = [1, 3, 7, 14, 30];

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(day, count) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}

export function initialState() {
  return {
    version: 1,
    profile: { name: '', goal: 10, reducedMotion: false },
    completedLessons: {}, reviews: {}, favorites: [], readArticles: [], activityDays: [], reviewRewards: [],
  };
}

export function scoreQuiz(questions, answers) {
  if (!questions.length || answers.length !== questions.length || questions.some((q, index) => !Number.isInteger(answers[index]) || answers[index] < 0 || answers[index] >= q.options.length)) {
    throw new Error('Ответьте на все вопросы перед завершением урока.');
  }
  const correct = questions.filter((item, index) => item.correct === answers[index]).length;
  const percent = Math.round(correct / questions.length * 100);
  return { correct, total: questions.length, percent, passed: percent >= 75 };
}

function markDay(state, day) {
  if (!state.activityDays.includes(day)) state.activityDays.push(day);
  state.activityDays = state.activityDays.sort().slice(-5000);
}

export function completeLesson(state, id, answers, day = dateKey()) {
  const lesson = lessons.find(item => item.id === id);
  if (!lesson) throw new Error('Урок не найден.');
  const result = scoreQuiz(lesson.questions, answers);
  const next = structuredClone(state);
  const previous = next.completedLessons[id];
  const earned = result.passed && !previous ? 100 : 0;
  if (result.passed) {
    next.completedLessons[id] = { score: Math.max(previous?.score || 0, result.percent), completedAt: previous?.completedAt || day };
    markDay(next, day);
  }
  return { state: next, result, earned };
}

export function scheduleReview(previous, quality, day = dateKey()) {
  if (![0, 1, 2].includes(quality)) throw new Error('Неизвестная оценка карточки.');
  const oldStage = previous?.stage ?? -1;
  const advance = quality === 2 && previous?.lastReviewed !== day ? 1 : 0;
  const stage = quality === 0 ? 0 : Math.min(intervals.length - 1, Math.max(0, oldStage + advance));
  return { stage, due: addDays(day, intervals[stage]), lastReviewed: day, repetitions: Math.min(100000, (previous?.repetitions || 0) + 1) };
}

export function reviewPhrase(state, id, quality, day = dateKey()) {
  if (!phraseIds.has(id)) throw new Error('Карточка не найдена.');
  const next = structuredClone(state);
  next.reviews[id] = scheduleReview(next.reviews[id], quality, day);
  const rewardId = `${day}:${id}`;
  const earned = next.reviewRewards.includes(rewardId) ? 0 : 5;
  if (earned) next.reviewRewards.push(rewardId);
  markDay(next, day);
  return { state: next, earned, review: next.reviews[id] };
}

export function reviewQueue(state, day = dateKey(), limit = 10) {
  const due = phrases.filter(item => state.reviews[item.id] && state.reviews[item.id].due <= day)
    .sort((a, b) => state.reviews[a.id].due.localeCompare(state.reviews[b.id].due));
  const unseen = phrases.filter(item => !state.reviews[item.id]);
  return [...due, ...unseen].slice(0, limit);
}

export function dueCount(state, day = dateKey()) {
  return phrases.filter(item => state.reviews[item.id] && state.reviews[item.id].due <= day).length;
}

export function xpTotal(state) {
  return Object.keys(state.completedLessons).length * 100 + state.reviewRewards.length * 5;
}

export function streak(state, day = dateKey()) {
  const days = new Set(state.activityDays);
  let cursor = days.has(day) ? day : addDays(day, -1);
  let count = 0;
  while (days.has(cursor) && count <= 5000) { count++; cursor = addDays(cursor, -1); }
  return count;
}

export function achievements(state, day = dateKey()) {
  const completed = Object.keys(state.completedLessons).length;
  return [
    { id: 'hello', icon: 'hand', title: 'Первое сәлем', description: 'Завершить первый урок', current: completed, target: 1 },
    { id: 'foundation', icon: 'sprout', title: 'Крепкие корни', description: 'Завершить 4 урока', current: completed, target: 4 },
    { id: 'all', icon: 'crown', title: 'Начало положено', description: 'Завершить все 12 уроков', current: completed, target: 12 },
    { id: 'cards', icon: 'cards', title: 'В копилку слов', description: 'Повторить 20 разных карточек', current: Object.keys(state.reviews).length, target: 20 },
    { id: 'week', icon: 'flame', title: 'Три дня рядом', description: 'Заниматься 3 дня подряд', current: streak(state, day), target: 3 },
    { id: 'reader', icon: 'book', title: 'Любопытный читатель', description: 'Прочитать 3 материала', current: state.readArticles.length, target: 3 },
    { id: 'keeper', icon: 'bookmark', title: 'Свои слова', description: 'Сохранить 10 фраз', current: state.favorites.length, target: 10 },
    { id: 'thousand', icon: 'spark', title: 'Тысяча маленьких шагов', description: 'Заработать 1 000 XP', current: xpTotal(state), target: 1000 },
  ].map(item => ({ ...item, unlocked: item.current >= item.target }));
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && dateKey(parsed) === value && value >= '2020-01-01' && value <= '2100-12-31';
};
const validList = (value, allowed, max) => Array.isArray(value) && value.length <= max && new Set(value).size === value.length && value.every(item => typeof item === 'string' && allowed(item));

/** Reconstruct a strict safe schema instead of merging untrusted objects into application state. */
export function validateImport(raw) {
  if (!object(raw) || raw.version !== 1 || !object(raw.profile)) throw new Error('Нужен файл экспорта Söyle Qazaq версии 1.');
  const { name, goal, reducedMotion } = raw.profile;
  if (typeof name !== 'string' || name.length > 40 || /[\u0000-\u001f]/.test(name) || ![5, 10, 15, 20].includes(goal) || typeof reducedMotion !== 'boolean') throw new Error('В файле некорректные настройки профиля.');
  if (!object(raw.completedLessons) || !object(raw.reviews)) throw new Error('Некорректный формат прогресса.');
  if (!validList(raw.favorites, id => phraseIds.has(id), phrases.length) || !validList(raw.readArticles, id => articleIds.has(id), articles.length) || !validList(raw.activityDays, isDate, 5000)) throw new Error('В файле есть неизвестные или повторяющиеся записи.');
  if (!validList(raw.reviewRewards, value => {
    const [day, id, extra] = value.split(':');
    return extra === undefined && isDate(day) && phraseIds.has(id);
  }, 50000)) throw new Error('Некорректные записи о повторении.');
  const result = initialState();
  result.profile = { name: name.trim(), goal, reducedMotion };
  for (const [id, value] of Object.entries(raw.completedLessons)) {
    if (!lessonIds.has(id) || !object(value) || ![75, 100].includes(value.score) || !isDate(value.completedAt)) throw new Error('Некорректный результат урока.');
    result.completedLessons[id] = { score: value.score, completedAt: value.completedAt };
  }
  for (const [id, value] of Object.entries(raw.reviews)) {
    if (!phraseIds.has(id) || !object(value) || !Number.isInteger(value.stage) || value.stage < 0 || value.stage > 4 || !Number.isInteger(value.repetitions) || value.repetitions < 1 || value.repetitions > 100000 || !isDate(value.due) || !isDate(value.lastReviewed) || value.due <= value.lastReviewed) throw new Error('Некорректное расписание карточек.');
    result.reviews[id] = { stage: value.stage, due: value.due, lastReviewed: value.lastReviewed, repetitions: value.repetitions };
  }
  result.favorites = [...raw.favorites];
  result.readArticles = [...raw.readArticles];
  result.activityDays = [...raw.activityDays].sort();
  result.reviewRewards = [...raw.reviewRewards];
  return result;
}
