const form = document.querySelector('#request-form');
const generateButton = document.querySelector('#generate-button');
const sampleButton = document.querySelector('#sample-button');
const statusBox = document.querySelector('#status');
const resultBox = document.querySelector('#result');
const tabs = Array.from(document.querySelectorAll('.tab'));

let activeTab = 'teachingPlan';
let currentResult = null;

const tabTitles = {
  teachingPlan: '教案',
  slideOutline: '课件大纲',
  quiz: '随堂测验',
  learningAnalysis: '学情分析',
  pitchScript: '演示话术'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStatus(message, type = '') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`.trim();
}

function setResultMessage(title, message, tone = '') {
  resultBox.innerHTML = `
    <div class="empty-state ${tone}">
      <div class="empty-visual" aria-hidden="true"></div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function formPayload() {
  return Object.fromEntries(new FormData(form).entries());
}

function list(items) {
  if (!Array.isArray(items)) return '<p>暂无内容</p>';
  return `<ul class="pill-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderTeachingPlan(plan = {}) {
  const flow = Array.isArray(plan.classFlow) ? plan.classFlow : [];
  return `
    <div class="section-grid">
      <div class="metric-row">
        <div class="metric"><span>课堂时长</span><strong>${escapeHtml(formPayload().duration || '45分钟')}</strong></div>
        <div class="metric"><span>流程节点</span><strong>${flow.length || 4}</strong></div>
        <div class="metric"><span>测评方式</span><strong>随堂闭环</strong></div>
        <div class="metric"><span>适配场景</span><strong>高校课堂</strong></div>
      </div>
      <section class="content-section">
        <h3>教学目标</h3>
        ${list(plan.objectives)}
      </section>
      <section class="content-section">
        <h3>重点难点</h3>
        ${list(plan.keyPoints)}
      </section>
      <section class="content-section">
        <h3>课堂流程</h3>
        <ul class="timeline">
          ${flow.map((item) => `
            <li><strong>${escapeHtml(item.stage)} · ${escapeHtml(item.minutes)}分钟</strong><br>${escapeHtml(item.activity)}</li>
          `).join('')}
        </ul>
      </section>
      <section class="content-section">
        <h3>师生活动与评估</h3>
        <p><strong>教师动作：</strong>${escapeHtml((plan.teacherActions || []).join('、'))}</p>
        <p><strong>学生动作：</strong>${escapeHtml((plan.studentActions || []).join('、'))}</p>
        <p><strong>评估方式：</strong>${escapeHtml(plan.assessment || '根据课堂练习与测验结果评估。')}</p>
      </section>
    </div>
  `;
}

function renderSlides(slides = []) {
  return `
    <section class="content-section">
      <h3>课件大纲</h3>
      <ul class="slide-list">
        ${slides.map((slide, index) => `
          <li><strong>${index + 1}. ${escapeHtml(slide.title)}</strong><br>${escapeHtml(slide.speakerNotes)}</li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderQuiz(quiz = []) {
  return `
    <section class="content-section">
      <h3>随堂测验</h3>
      <ul class="quiz-list">
        ${quiz.map((item, index) => `
          <li>
            <strong>${index + 1}. [${escapeHtml(item.type)}] ${escapeHtml(item.question)}</strong><br>
            答案：${escapeHtml(item.answer)}<br>
            解析：${escapeHtml(item.explanation)}
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderAnalysis(analysis = {}) {
  return `
    <div class="section-grid">
      <section class="content-section">
        <h3>高频误区</h3>
        ${list(analysis.misconceptions)}
      </section>
      <section class="content-section">
        <h3>风险群体</h3>
        ${list(analysis.riskGroups)}
      </section>
      <section class="content-section">
        <h3>干预建议</h3>
        ${list(analysis.interventions)}
      </section>
      <section class="content-section">
        <h3>数据指标</h3>
        ${list(analysis.dataIndicators)}
      </section>
    </div>
  `;
}

function renderPitch(script = '') {
  return `
    <section class="content-section">
      <h3>现场演示话术</h3>
      <p class="raw-text">${escapeHtml(script)}</p>
    </section>
  `;
}

function renderResult() {
  if (!currentResult) return;

  if (currentResult.rawText) {
    resultBox.innerHTML = `
      <section class="content-section">
        <h3>原始输出</h3>
        <p class="raw-text">${escapeHtml(currentResult.rawText)}</p>
      </section>
    `;
    return;
  }

  const renderers = {
    teachingPlan: () => renderTeachingPlan(currentResult.teachingPlan),
    slideOutline: () => renderSlides(currentResult.slideOutline),
    quiz: () => renderQuiz(currentResult.quiz),
    learningAnalysis: () => renderAnalysis(currentResult.learningAnalysis),
    pitchScript: () => renderPitch(currentResult.pitchScript)
  };

  resultBox.innerHTML = renderers[activeTab]?.() || `<p>暂无${escapeHtml(tabTitles[activeTab])}内容</p>`;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || '方案生成未完成，请稍后重试。');
  return payload.result;
}

async function generate() {
  generateButton.disabled = true;
  currentResult = null;
  setStatus('方案生成中...', '');
  setResultMessage('正在整理课堂方案', '完整方案通常需要30到60秒，请稍候。');

  try {
    currentResult = await requestJson('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload())
    });
    setStatus('课堂方案已生成', 'success');
    renderResult();
  } catch (error) {
    currentResult = null;
    setStatus(error.message, 'error');
    setResultMessage('暂时无法生成', error.message, 'error-state');
  } finally {
    generateButton.disabled = false;
  }
}

async function loadSample() {
  setStatus('正在载入样例...', '');
  try {
    currentResult = await requestJson('/api/sample');
    setStatus('样例已载入', 'success');
    renderResult();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  generate();
});

sampleButton.addEventListener('click', loadSample);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((candidate) => candidate.classList.toggle('active', candidate === tab));
    activeTab = tab.dataset.tab;
    renderResult();
  });
});
