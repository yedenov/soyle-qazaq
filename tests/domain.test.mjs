import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, phrases, articles } from '../dist/js/data.mjs';
import { initialState, scoreQuiz, completeLesson, reviewPhrase, reviewQueue, scheduleReview, streak, validateImport, xpTotal, addDays, achievements } from '../dist/js/domain.mjs';

const perfect = lesson => lesson.questions.map(question => question.correct);

test('the published curriculum is complete and has unambiguous multiple-choice answers', () => {
  assert.equal(lessons.length, 12);
  assert.equal(phrases.length, 72);
  assert.equal(articles.length, 6);
  assert.equal(new Set(phrases.map(phrase => phrase.id)).size, phrases.length);
  for (const lesson of lessons) {
    assert.equal(lesson.questions.length, 4);
    assert.equal(lesson.examples.length, 3);
    assert.ok(lesson.goal && lesson.rule);
    for (const q of lesson.questions) {
      assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
      assert.equal(new Set(q.options).size, q.options.length);
      assert.ok(q.explanation.length > 10);
    }
  }
});

test('lesson scoring requires every valid answer and passes at 75%', () => {
  const lesson = lessons[0];
  const answers = perfect(lesson);
  assert.deepEqual(scoreQuiz(lesson.questions, answers), { correct: 4, total: 4, percent: 100, passed: true });
  answers[0] = (answers[0] + 1) % 3;
  assert.equal(scoreQuiz(lesson.questions, answers).passed, true);
  answers[1] = (answers[1] + 1) % 3;
  assert.equal(scoreQuiz(lesson.questions, answers).passed, false);
  assert.throws(() => scoreQuiz(lesson.questions, []));
  assert.throws(() => scoreQuiz(lesson.questions, [99, 1, 2, 0]));
  assert.throws(() => scoreQuiz([], []));
});

test('lesson XP is idempotent and best score survives lower retry results', () => {
  const original = initialState();
  const lesson = lessons[0];
  const answers = perfect(lesson);
  answers[0] = 1;
  const first = completeLesson(original, lesson.id, answers, '2026-10-13');
  assert.equal(first.earned, 100);
  assert.equal(first.state.completedLessons[lesson.id].score, 75);
  assert.equal(xpTotal(original), 0, 'input state must not mutate');
  const second = completeLesson(first.state, lesson.id, perfect(lesson), '2026-10-14');
  assert.equal(second.earned, 0);
  assert.equal(second.state.completedLessons[lesson.id].score, 100);
  assert.equal(second.state.completedLessons[lesson.id].completedAt, '2026-10-13');
  const third = completeLesson(second.state, lesson.id, [2, 2, 0, 1], '2026-10-15');
  assert.equal(third.result.passed, false);
  assert.equal(third.state.completedLessons[lesson.id].score, 100);
  assert.equal(xpTotal(third.state), 100);
});

test('incorrect attempts neither award XP nor count as a completed activity day', () => {
  const lesson = lessons[0];
  const incorrect = lesson.questions.map(q => (q.correct + 1) % q.options.length);
  const outcome = completeLesson(initialState(), lesson.id, incorrect, '2026-10-13');
  assert.equal(outcome.earned, 0);
  assert.deepEqual(outcome.state.completedLessons, {});
  assert.deepEqual(outcome.state.activityDays, []);
  assert.throws(() => completeLesson(initialState(), 'unknown', incorrect));
});

test('review scheduling progresses across days and resets after a difficult answer', () => {
  let review = scheduleReview(undefined, 2, '2026-10-13');
  assert.deepEqual(review, { stage: 0, due: '2026-10-14', lastReviewed: '2026-10-13', repetitions: 1 });
  review = scheduleReview(review, 2, '2026-10-14');
  assert.equal(review.stage, 1);
  assert.equal(review.due, '2026-10-17');
  review = scheduleReview(review, 2, '2026-10-17');
  assert.equal(review.due, '2026-10-24');
  review = scheduleReview(review, 0, '2026-10-24');
  assert.equal(review.stage, 0);
  assert.equal(review.due, '2026-10-25');
  assert.throws(() => scheduleReview(undefined, 4));
});

test('same-day free practice cannot inflate interval or XP', () => {
  let state = initialState();
  for (let index = 0; index < 10; index++) {
    state = reviewPhrase(state, phrases[0].id, 2, '2026-10-13').state;
  }
  assert.equal(xpTotal(state), 5);
  assert.equal(state.reviews[phrases[0].id].stage, 0);
  assert.equal(state.reviews[phrases[0].id].due, '2026-10-14');
  state = reviewPhrase(state, phrases[0].id, 2, '2026-10-14').state;
  assert.equal(xpTotal(state), 10);
  assert.equal(state.reviews[phrases[0].id].stage, 1);
  assert.throws(() => reviewPhrase(state, 'unknown', 2));
});

test('queue prioritizes due cards, includes unseen cards, and excludes future cards', () => {
  let state = reviewPhrase(initialState(), phrases[8].id, 2, '2026-10-12').state;
  state = reviewPhrase(state, phrases[9].id, 2, '2026-10-13').state;
  const queue = reviewQueue(state, '2026-10-13', 10);
  assert.equal(queue.length, 10);
  assert.equal(queue[0].id, phrases[8].id);
  assert.ok(!queue.some(item => item.id === phrases[9].id));
  assert.equal(new Set(queue.map(item => item.id)).size, queue.length);
});

test('streak allows an unfinished current day but breaks after a missed day', () => {
  const state = initialState();
  state.activityDays = ['2026-10-10', '2026-10-11', '2026-10-12'];
  assert.equal(streak(state, '2026-10-13'), 3);
  assert.equal(streak(state, '2026-10-12'), 3);
  assert.equal(streak(state, '2026-10-14'), 0);
});

test('date arithmetic handles leap days and year boundaries without UTC date shifting', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2027-01-01', -1), '2026-12-31');
});

test('export/import roundtrip restores actual progress and reconstructs an allowlisted schema', () => {
  let state = completeLesson(initialState(), lessons[0].id, perfect(lessons[0]), '2026-10-13').state;
  state = reviewPhrase(state, phrases[0].id, 2, '2026-10-13').state;
  state.profile.name = 'Дана';
  state.favorites = [phrases[1].id];
  state.readArticles = [articles[0].id];
  const restored = validateImport(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored, state);
  assert.equal(xpTotal(restored), 105);
  assert.notEqual(restored, state);
  assert.equal(achievements(restored).find(item => item.id === 'hello').unlocked, true);
  const extra = { ...state, injected: '<script>alert(1)</script>' };
  assert.equal(Object.hasOwn(validateImport(extra), 'injected'), false);
});

test('import rejects unsupported versions, impossible dates, duplicate ids and unknown content', () => {
  const invalid = [
    null,
    { ...initialState(), version: 99 },
    { ...initialState(), profile: { name: 'x', goal: 999, reducedMotion: false } },
    { ...initialState(), favorites: ['missing'] },
    { ...initialState(), favorites: [phrases[0].id, phrases[0].id] },
    { ...initialState(), activityDays: ['2026-02-31'] },
    { ...initialState(), reviewRewards: ['2026-10-13:unknown'] },
    { ...initialState(), completedLessons: { [lessons[0].id]: { score: 200, completedAt: '2026-10-13' } } },
    { ...initialState(), reviews: { [phrases[0].id]: { stage: -1, due: '2026-10-14', lastReviewed: '2026-10-13', repetitions: 1 } } },
    { ...initialState(), profile: { name: 'x'.repeat(41), goal: 10, reducedMotion: false } },
  ];
  for (const value of invalid) assert.throws(() => validateImport(value));
  const pollution = JSON.parse(JSON.stringify(initialState()));
  pollution.completedLessons = JSON.parse('{"__proto__":{"score":100,"completedAt":"2026-10-13"}}');
  assert.throws(() => validateImport(pollution));
  assert.equal({}.score, undefined);
});
