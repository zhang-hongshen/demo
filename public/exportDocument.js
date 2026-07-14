function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function arrayItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '<p>暂无内容</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function section(title, content) {
  return `<section><h2>${escapeHtml(title)}</h2>${content}</section>`;
}

function renderTeachingPlan(plan = {}, input = {}) {
  const flow = Array.isArray(plan.classFlow) ? plan.classFlow : [];
  return section('教案', [
    `<p><strong>课堂时长：</strong>${escapeHtml(input.duration || '45分钟')}</p>`,
    '<h3>教学目标</h3>',
    arrayItems(plan.objectives),
    '<h3>重点难点</h3>',
    arrayItems(plan.keyPoints),
    '<h3>课堂流程</h3>',
    flow.length
      ? `<ol>${flow.map((item) => `<li><strong>${escapeHtml(item.stage)} · ${escapeHtml(item.minutes)}分钟</strong><br>${escapeHtml(item.activity)}</li>`).join('')}</ol>`
      : '<p>暂无内容</p>',
    '<h3>师生活动与评估</h3>',
    `<p><strong>教师动作：</strong>${escapeHtml((plan.teacherActions || []).join('、'))}</p>`,
    `<p><strong>学生动作：</strong>${escapeHtml((plan.studentActions || []).join('、'))}</p>`,
    `<p><strong>评估方式：</strong>${escapeHtml(plan.assessment || '根据课堂练习与测验结果评估。')}</p>`
  ].join(''));
}

function renderSlides(slides = []) {
  return section(
    '课件大纲',
    Array.isArray(slides) && slides.length
      ? `<ol>${slides.map((slide) => `<li><strong>${escapeHtml(slide.title)}</strong><br>${escapeHtml(slide.speakerNotes)}</li>`).join('')}</ol>`
      : '<p>暂无内容</p>'
  );
}

function renderQuiz(quiz = []) {
  return section(
    '随堂测验',
    Array.isArray(quiz) && quiz.length
      ? `<ol>${quiz.map((item) => `
        <li>
          <strong>[${escapeHtml(item.type)}] ${escapeHtml(item.question)}</strong><br>
          答案：${escapeHtml(item.answer)}<br>
          解析：${escapeHtml(item.explanation)}
        </li>
      `).join('')}</ol>`
      : '<p>暂无内容</p>'
  );
}

function renderAnalysis(analysis = {}) {
  return section('学情分析', [
    '<h3>高频误区</h3>',
    arrayItems(analysis.misconceptions),
    '<h3>风险群体</h3>',
    arrayItems(analysis.riskGroups),
    '<h3>干预建议</h3>',
    arrayItems(analysis.interventions),
    '<h3>数据指标</h3>',
    arrayItems(analysis.dataIndicators)
  ].join(''));
}

function renderAssignmentReview(review = {}) {
  const rubric = Array.isArray(review.rubric) ? review.rubric : [];
  return section('作业批改', [
    `<p><strong>综合得分：</strong>${escapeHtml(review.score || '待评定')}</p>`,
    `<p><strong>等级：</strong>${escapeHtml(review.level || '待评定')}</p>`,
    '<h3>评分细则</h3>',
    rubric.length
      ? `<ol>${rubric.map((item) => `<li><strong>${escapeHtml(item.criterion)} ${escapeHtml(item.score)}</strong><br>${escapeHtml(item.comment)}</li>`).join('')}</ol>`
      : '<p>暂无内容</p>',
    '<h3>亮点</h3>',
    arrayItems(review.strengths),
    '<h3>待改进</h3>',
    arrayItems(review.issues),
    '<h3>评语</h3>',
    `<p>${escapeHtml(review.feedback || '暂无内容')}</p>`,
    '<h3>改进任务</h3>',
    arrayItems(review.improvementTasks)
  ].join(''));
}

function renderPitch(script = '') {
  return section('演示稿', `<p>${escapeHtml(script || '暂无内容')}</p>`);
}

export function buildExportHtml({ result = {}, input = {}, feature = 'all' } = {}) {
  const course = input.course || '课堂方案';
  const topic = input.topic || '';
  const title = topic ? `${course} · ${topic}` : course;
  const featureSections = {
    slides: () => [
      renderTeachingPlan(result.teachingPlan, input),
      renderSlides(result.slideOutline),
      renderQuiz(result.quiz),
      renderPitch(result.pitchScript)
    ].join(''),
    grading: () => renderAssignmentReview(result.assignmentReview),
    analysis: () => renderAnalysis(result.learningAnalysis)
  };
  const body = result.rawText
    ? section('原始输出', `<p>${escapeHtml(result.rawText)}</p>`)
    : featureSections[feature]
      ? featureSections[feature]()
      : [
        renderTeachingPlan(result.teachingPlan, input),
        renderSlides(result.slideOutline),
        renderQuiz(result.quiz),
        renderAnalysis(result.learningAnalysis),
        renderAssignmentReview(result.assignmentReview),
        renderPitch(result.pitchScript)
      ].join('');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)} - 课堂方案</title>
    <style>
      body { color: #1d1d1f; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", Arial, sans-serif; line-height: 1.65; margin: 36px; }
      h1 { font-size: 24px; margin: 0 0 8px; }
      h2 { border-bottom: 1px solid #d2d2d7; font-size: 18px; margin-top: 28px; padding-bottom: 8px; }
      h3 { font-size: 15px; margin-bottom: 6px; }
      p { margin: 6px 0 12px; }
      li { margin: 6px 0; }
      .meta { color: #6e6e73; margin-bottom: 24px; }
      @media print { body { margin: 24mm; } }
    </style>
  </head>
  <body>
    <h1>课堂方案</h1>
    <div class="meta">${escapeHtml(title)}</div>
    ${body}
  </body>
</html>`;
}

function safePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function exportFileName(input = {}, extension = 'doc') {
  const parts = [safePart(input.course), safePart(input.topic)].filter(Boolean);
  return `课堂方案${parts.length ? `-${parts.join('-')}` : ''}.${safePart(extension) || 'doc'}`;
}
