import { buildExportHtml, exportFileName } from './exportDocument.js';
import { buildPptx, pptFileName } from './pptxExport.js';
import {
  cloneResult,
  isRewriteValue,
  normalizeEditorLines,
  readResultTarget,
  targetKey,
  updateResultTarget
} from './resultEditor.js';

const form = document.querySelector('#request-form');
const generateButton = document.querySelector('#generate-button');
const sampleButton = document.querySelector('#sample-button');
const exportButton = document.querySelector('#export-button');
const exportMenu = document.querySelector('#export-menu');
const exportFormatButtons = Array.from(document.querySelectorAll('[data-export-format]'));
const themeDialog = document.querySelector('#theme-dialog');
const themeDialogCloseButton = document.querySelector('#theme-dialog-close');
const themeButtons = Array.from(document.querySelectorAll('[data-theme-id]'));
const workspaceButton = document.querySelector('#workspace-button');
const workspaceDialog = document.querySelector('#workspace-dialog');
const workspaceDialogCloseButton = document.querySelector('#workspace-dialog-close');
const newWorkspaceButton = document.querySelector('#new-workspace-button');
const saveWorkspaceButton = document.querySelector('#save-workspace-button');
const workspaceList = document.querySelector('#workspace-list');
const workspaceCount = document.querySelector('#workspace-count');
const workspaceSearch = document.querySelector('#workspace-search');
const templatesButton = document.querySelector('#templates-button');
const templatesDialog = document.querySelector('#templates-dialog');
const templatesDialogCloseButton = document.querySelector('#templates-dialog-close');
const templateList = document.querySelector('#template-list');
const checklistButton = document.querySelector('#checklist-button');
const checklistDialog = document.querySelector('#checklist-dialog');
const checklistDialogCloseButton = document.querySelector('#checklist-dialog-close');
const checklistList = document.querySelector('#checklist-list');
const checklistProgress = document.querySelector('#checklist-progress');
const checklistProgressBar = document.querySelector('#checklist-progress-bar');
const classroomAssistantButton = document.querySelector('#classroom-assistant-button');
const classroomAssistantDialog = document.querySelector('#classroom-assistant-dialog');
const classroomAssistantCloseButton = document.querySelector('#classroom-assistant-close');
const timerDisplay = document.querySelector('#timer-display');
const timerStatus = document.querySelector('#timer-status');
const timerToggleButton = document.querySelector('#timer-toggle-button');
const timerResetButton = document.querySelector('#timer-reset-button');
const timerPresetButtons = Array.from(document.querySelectorAll('[data-timer-seconds]'));
const classroomPrompt = document.querySelector('#classroom-prompt');
const promptIndex = document.querySelector('#prompt-index');
const nextPromptButton = document.querySelector('#next-prompt-button');
const copyPromptButton = document.querySelector('#copy-prompt-button');
const reflectionButton = document.querySelector('#reflection-button');
const reflectionDialog = document.querySelector('#reflection-dialog');
const reflectionCloseButton = document.querySelector('#reflection-close');
const reflectionForm = document.querySelector('#reflection-form');
const reflectionUpdated = document.querySelector('#reflection-updated');
const reflectionStorageKey = 'campus-ai-lesson-reflections-v1';
const copyResultButton = document.querySelector('#copy-result-button');
const statusBox = document.querySelector('#status');
const resultBox = document.querySelector('#result');
const outputTitle = document.querySelector('#output-title');
const tabs = Array.from(document.querySelectorAll('.tab'));
const featureInput = document.querySelector('#feature-input');
const featurePanels = Array.from(document.querySelectorAll('[data-feature-panel]'));
const pptMenuButton = document.querySelector('[data-export-format="ppt"]');
const materialsInput = document.querySelector('#materials');
const materialSummary = document.querySelector('#material-summary');

let activeFeature = 'slides';
let currentResult = null;
let referenceMaterials = '';
let attachedFiles = [];
let materialReadPromise = Promise.resolve();
let selectedPptTheme = 'formal-blue';
let resultRevision = 0;
let editingTargetKey = '';
const pendingRewriteKeys = new Set();
let lastRewrite = null;
let activeWorkspaceId = '';
let workspaceRecords = [];
let workspaceQuery = '';
let timerSeconds = 2700;
let timerRemaining = 2700;
let timerRunning = false;
let timerInterval = null;
let promptIndexValue = 0;
const resultTabDefinitions = {
  slides: [
    { id: 'plan', label: '教案' },
    { id: 'slides', label: '课件大纲' },
    { id: 'quiz', label: '随堂测验' },
    { id: 'tieredTasks', label: '分层任务' },
    { id: 'pitch', label: '演示话术' }
  ],
  grading: [
    { id: 'overview', label: '批改总览' },
    { id: 'rubric', label: '评分细则' },
    { id: 'feedback', label: '亮点与问题' },
    { id: 'tasks', label: '改进任务' }
  ],
  analysis: [
    { id: 'misconceptions', label: '高频误区' },
    { id: 'riskGroups', label: '风险群体' },
    { id: 'interventions', label: '干预建议' },
    { id: 'dataIndicators', label: '数据指标' }
  ]
};
const activeResultTabs = {
  slides: 'plan',
  grading: 'overview',
  analysis: 'misconceptions'
};

const maxFiles = 5;
const maxPerMaterialChars = 4200;
const maxTotalMaterialChars = 12000;
const workspaceStorageKey = 'campus-ai-course-workspaces-v1';
const maxWorkspaceRecords = 20;
const maxWorkspaceVersions = 8;
const checklistStorageKey = 'campus-ai-prep-checklists-v1';
const attachmentDatabaseName = 'campus-ai-course-attachments-v1';
const attachmentStoreName = 'files';
const checklistItems = [
  { id: 'objectives', label: '确认教学目标', hint: '目标要能对应到课堂活动或测评。' },
  { id: 'materials', label: '整理课堂材料', hint: '讲义、案例、数据或演示文件已准备。' },
  { id: 'flow', label: '检查课堂流程', hint: '时间分配、师生活动和过渡语可执行。' },
  { id: 'assessment', label: '准备课堂测评', hint: '随堂题、作业或观察点已安排。' },
  { id: 'save', label: '保存课程版本', hint: '把本次修改留在课程空间，便于下次继续。' }
];

const teachingTemplates = [
  {
    id: 'new-lesson',
    label: '讲授新课',
    description: '适合首次引入一个新概念，强调目标、示例和即时检查。',
    values: {
      slides: {
        course: '数据结构',
        topic: '二叉树遍历',
        objectives: '理解三种遍历规则，能根据样例树写出遍历序列，并解释递归边界。',
        duration: '45分钟',
        outputStyle: '教师备课助手'
      },
      grading: {
        assignmentTitle: '新课概念练习',
        assignmentRequirement: '用自己的话解释核心概念，并完成一道带过程的基础题。',
        gradingRubric: '概念理解40分，过程说明40分，书写规范20分。',
        studentSubmission: '待粘贴学生提交内容'
      },
      analysis: {
        classProfile: '本节为新概念首次学习，学生基础差异较大。',
        painPoints: '学生容易只记结论，不理解概念之间的关系。'
      }
    }
  },
  {
    id: 'flipped-class',
    label: '翻转课堂',
    description: '适合课前自学、课中讨论，把课堂时间用于诊断和应用。',
    values: {
      slides: {
        course: '数据库系统',
        topic: '索引与查询优化',
        objectives: '课前理解索引的基本作用，课中能比较不同索引方案并说明取舍。',
        duration: '50分钟',
        outputStyle: '教师备课助手'
      },
      grading: {
        assignmentTitle: '课前学习单',
        assignmentRequirement: '完成材料阅读，在一个真实查询场景中写出你的索引选择和理由。',
        gradingRubric: '材料理解30分，方案合理性50分，理由表达20分。',
        studentSubmission: '待粘贴学生课前学习单'
      },
      analysis: {
        classProfile: '学生已完成课前阅读和小测，课堂需要快速定位未理解的部分。',
        painPoints: '学生能复述定义，但不会把概念迁移到真实案例。'
      }
    }
  },
  {
    id: 'project-practice',
    label: '项目制实践',
    description: '适合实验课或项目课，突出任务拆解、分工和阶段产出。',
    values: {
      slides: {
        course: '软件工程',
        topic: '需求分析工作坊',
        objectives: '小组能从用户场景提炼需求，完成一份可评审的需求清单和优先级排序。',
        duration: '90分钟',
        outputStyle: '竞标答辩演示'
      },
      grading: {
        assignmentTitle: '项目阶段成果评审',
        assignmentRequirement: '提交阶段成果、分工记录和一次复盘，说明当前风险与下一步计划。',
        gradingRubric: '成果质量40分，协作过程30分，风险判断20分，表达10分。',
        studentSubmission: '待粘贴项目阶段成果'
      },
      analysis: {
        classProfile: '项目小组进度不同，需要关注参与度、成果质量和协作风险。',
        painPoints: '部分小组任务拆解不清，成员贡献和阶段风险不容易被及时发现。'
      }
    }
  },
  {
    id: 'review-assessment',
    label: '复习与测评',
    description: '适合章节复习，快速串联知识点并形成可操作的补救任务。',
    values: {
      slides: {
        course: '计算机网络',
        topic: '期中复习：可靠传输',
        objectives: '梳理可靠传输的关键机制，能通过题目判断问题类型并选择合适的解释路径。',
        duration: '45分钟',
        outputStyle: '校方领导汇报'
      },
      grading: {
        assignmentTitle: '章节复习卷',
        assignmentRequirement: '完成综合题并标记不确定的步骤，批改后根据错因完成订正。',
        gradingRubric: '知识点准确性50分，推理过程30分，订正质量20分。',
        studentSubmission: '待粘贴学生复习卷'
      },
      analysis: {
        classProfile: '即将进行阶段性测评，已有作业和测验数据可用于定位薄弱知识点。',
        painPoints: '学生知道错题答案，但无法稳定解释错误原因并迁移到新题。'
      }
    }
  }
];

const featureTitles = {
  slides: '课件生成',
  grading: '作业批改',
  analysis: '学情分析'
};

const generateLabels = {
  slides: '生成课件',
  grading: '批改作业',
  analysis: '生成分析'
};

const workspaceSaveLabels = {
  slides: '保存课程',
  grading: '保存批改任务',
  analysis: '保存分析结果'
};

const workspaceSavedStatusLabels = {
  slides: '课程已保存',
  grading: '批改任务已保存',
  analysis: '分析结果已保存'
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

function clearGeneratedResult(message = '填写信息后生成课堂方案。') {
  currentResult = null;
  resultRevision += 1;
  editingTargetKey = '';
  lastRewrite = null;
  pendingRewriteKeys.clear();
  resetResultTab();
  setExportActionsEnabled(false);
  setResultMessage('暂无内容', message);
}

function formatTimer(seconds) {
  const minutes = Math.floor(Math.max(seconds, 0) / 60);
  const remainingSeconds = Math.max(seconds, 0) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function renderTimer() {
  if (timerDisplay) timerDisplay.textContent = formatTimer(timerRemaining);
  if (timerStatus) {
    timerStatus.textContent = timerRunning ? '进行中' : timerRemaining === 0 ? '已结束' : timerRemaining === timerSeconds ? '未开始' : '已暂停';
  }
  if (timerToggleButton) timerToggleButton.textContent = timerRunning ? '暂停' : timerRemaining === 0 ? '重新开始' : '开始';
}

function setTimerDuration(seconds) {
  timerRunning = false;
  if (timerInterval) globalThis.clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = Math.max(Number(seconds) || 0, 60);
  timerRemaining = timerSeconds;
  timerPresetButtons.forEach((button) => {
    button.classList.toggle('selected', Number(button.dataset.timerSeconds) === timerSeconds);
  });
  renderTimer();
}

function startTimer() {
  if (timerRunning) return;
  if (timerRemaining <= 0) timerRemaining = timerSeconds;
  timerRunning = true;
  timerInterval = globalThis.setInterval(() => {
    timerRemaining = Math.max(timerRemaining - 1, 0);
    if (timerRemaining === 0) {
      timerRunning = false;
      globalThis.clearInterval(timerInterval);
      timerInterval = null;
      setStatus('课堂计时结束', 'success');
    }
    renderTimer();
  }, 1000);
  renderTimer();
}

function pauseTimer() {
  timerRunning = false;
  if (timerInterval) globalThis.clearInterval(timerInterval);
  timerInterval = null;
  renderTimer();
}

function resetTimer() {
  pauseTimer();
  timerRemaining = timerSeconds;
  renderTimer();
}

function classroomPromptItems() {
  const quizItems = Array.isArray(currentResult?.quiz) ? currentResult.quiz : [];
  const resultPrompts = quizItems.map((item) => String(item?.question || '').trim()).filter(Boolean);
  return resultPrompts.length
    ? resultPrompts
    : [
      '先让学生说出这一步的判断依据，再请另一位同学补充一个反例。',
      '如果把这个条件改掉，结果会发生什么变化？请先独立思考，再和同桌核对。',
      '请用一句话解释这个结论，再举一个你认为不满足它的例子。',
      '哪一个步骤最容易出错？请指出原因，并给出一个检查方法。'
    ];
}

function renderClassroomPrompt() {
  const prompts = classroomPromptItems();
  promptIndexValue = ((promptIndexValue % prompts.length) + prompts.length) % prompts.length;
  if (classroomPrompt) classroomPrompt.textContent = prompts[promptIndexValue];
  if (promptIndex) promptIndex.textContent = `${promptIndexValue + 1} / ${prompts.length}`;
}

function nextClassroomPrompt() {
  promptIndexValue += 1;
  renderClassroomPrompt();
}

function setClassroomAssistantOpen(open) {
  if (!classroomAssistantDialog) return;
  classroomAssistantDialog.hidden = !open;
  if (open) {
    renderTimer();
    renderClassroomPrompt();
    classroomAssistantCloseButton?.focus?.();
  }
}

function reflectionStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function reflectionKey() {
  return `${activeWorkspaceId || 'draft'}:${activeFeature}`;
}

function readReflectionRecords() {
  const storage = reflectionStorage();
  if (!storage) return {};
  try {
    const parsed = JSON.parse(storage.getItem(reflectionStorageKey) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function renderReflection() {
  if (!reflectionForm) return;
  const record = readReflectionRecords()[reflectionKey()] || {};
  reflectionForm.elements.lessonReflection.value = record.lessonReflection || '';
  reflectionForm.elements.studentFeedback.value = record.studentFeedback || '';
  reflectionForm.elements.nextAdjustment.value = record.nextAdjustment || '';
  if (reflectionUpdated) reflectionUpdated.textContent = record.updatedAt ? `上次保存 ${formatWorkspaceTime(record.updatedAt)}` : '尚未保存';
}

function setReflectionDialogOpen(open) {
  if (!reflectionDialog) return;
  reflectionDialog.hidden = !open;
  if (open) {
    renderReflection();
    reflectionCloseButton?.focus?.();
  }
}

function saveReflection() {
  if (!reflectionForm) return;
  const storage = reflectionStorage();
  if (!storage) {
    setStatus('当前浏览器不支持复盘保存。', 'error');
    return;
  }

  const records = readReflectionRecords();
  const values = Object.fromEntries(new FormData(reflectionForm).entries());
  records[reflectionKey()] = { ...values, updatedAt: new Date().toISOString() };
  try {
    storage.setItem(reflectionStorageKey, JSON.stringify(records));
    renderReflection();
    setStatus('课后复盘已保存', 'success');
  } catch {
    setStatus('复盘保存失败，浏览器存储空间可能已满。', 'error');
  }
}

async function copyText(value, successMessage = '已复制') {
  const text = String(value || '').trim();
  if (!text) {
    setStatus('当前没有可复制内容。', 'error');
    return false;
  }

  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setStatus(successMessage, 'success');
    return true;
  } catch {
    setStatus('复制失败，请手动选择内容。', 'error');
    return false;
  }
}

function copyCurrentResult() {
  copyText(resultBox?.innerText || '', '当前结果页已复制');
}

function setExportActionsEnabled(enabled) {
  if (exportButton) exportButton.disabled = !enabled;
  if (copyResultButton) copyResultButton.disabled = !enabled;
  if (!enabled) {
    setExportMenuOpen(false);
    setThemeDialogOpen(false);
  }
}

function updateFeatureUi() {
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.feature === activeFeature));
  featurePanels.forEach((panel) => {
    panel.hidden = panel.dataset.featurePanel !== activeFeature;
  });
  if (featureInput) featureInput.value = activeFeature;
  if (outputTitle) outputTitle.textContent = featureTitles[activeFeature] || '生成结果';
  if (generateButton?.lastChild) generateButton.lastChild.textContent = generateLabels[activeFeature] || '生成';
  if (saveWorkspaceButton) saveWorkspaceButton.textContent = workspaceSaveLabels[activeFeature] || '保存到课程空间';
  if (pptMenuButton) pptMenuButton.hidden = activeFeature !== 'slides';
}

function setActiveFeature(feature) {
  activeFeature = featureTitles[feature] ? feature : 'slides';
  updateFeatureUi();
  setExportMenuOpen(false);
  setThemeDialogOpen(false);
  if (currentResult) {
    renderResult();
  } else {
    setResultMessage('暂无内容', `填写信息后${generateLabels[activeFeature]}。`);
  }
}

function formPayload() {
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.feature = activeFeature;
  delete payload.materials;
  if (referenceMaterials) payload.referenceMaterials = referenceMaterials;
  return payload;
}

function workspaceStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function attachmentDatabase() {
  if (!globalThis.indexedDB) return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = globalThis.indexedDB.open(attachmentDatabaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(attachmentStoreName)) {
        request.result.createObjectStore(attachmentStoreName, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function attachmentKey(workspaceId, versionId, index) {
  return `${workspaceId}:${versionId}:${index}`;
}

function describeAttachments(files = attachedFiles) {
  return Array.from(files || []).map((file) => ({
    name: String(file?.name || '未命名附件'),
    type: String(file?.type || 'application/octet-stream'),
    size: Number(file?.size || 0),
    lastModified: Number(file?.lastModified || 0)
  }));
}

async function persistAttachmentBundle(workspaceId, versionId, files = attachedFiles) {
  const db = await attachmentDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    const transaction = db.transaction(attachmentStoreName, 'readwrite');
    const store = transaction.objectStore(attachmentStoreName);
    Array.from(files || []).forEach((file, index) => {
      store.put({
        key: attachmentKey(workspaceId, versionId, index),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        blob: file
      });
    });
    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

async function restoreAttachmentBundle(workspaceId, versionId, metadata = []) {
  if (!metadata.length) return [];
  const db = await attachmentDatabase();
  if (!db) return [];

  const records = await new Promise((resolve) => {
    const transaction = db.transaction(attachmentStoreName, 'readonly');
    const store = transaction.objectStore(attachmentStoreName);
    const values = [];
    let remaining = metadata.length;
    if (!remaining) {
      resolve(values);
      return;
    }

    metadata.forEach((item, index) => {
      const request = store.get(attachmentKey(workspaceId, versionId, index));
      request.onsuccess = () => {
        if (request.result) values[index] = request.result;
        remaining -= 1;
        if (!remaining) resolve(values);
      };
      request.onerror = () => {
        remaining -= 1;
        if (!remaining) resolve(values);
      };
    });
    transaction.onabort = () => resolve(values);
  });
  db.close();

  if (!globalThis.File) return [];
  return records.filter(Boolean).map((record) => new globalThis.File([record.blob], record.name, {
    type: record.type,
    lastModified: record.lastModified
  }));
}

async function copyAttachmentBundle(sourceWorkspaceId, sourceVersionId, targetWorkspaceId, targetVersionId, metadata = []) {
  const files = await restoreAttachmentBundle(sourceWorkspaceId, sourceVersionId, metadata);
  if (!files.length) return !metadata.length;
  return persistAttachmentBundle(targetWorkspaceId, targetVersionId, files);
}

function setMaterialsFiles(files = []) {
  attachedFiles = Array.from(files || []).slice(0, maxFiles);
  if (!materialsInput || !globalThis.DataTransfer) return false;

  try {
    const transfer = new globalThis.DataTransfer();
    attachedFiles.forEach((file) => transfer.items.add(file));
    materialsInput.files = transfer.files;
    return true;
  } catch {
    return false;
  }
}

function createWorkspaceId(prefix = 'workspace') {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatWorkspaceTime(value) {
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '刚刚更新';
  }
}

function readWorkspaceRecords() {
  const storage = workspaceStorage();
  if (!storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(workspaceStorageKey) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((record) => record && record.id && record.payload).slice(0, maxWorkspaceRecords)
      : [];
  } catch {
    return [];
  }
}

function persistWorkspaceRecords() {
  const storage = workspaceStorage();
  if (!storage) return false;

  try {
    storage.setItem(workspaceStorageKey, JSON.stringify(workspaceRecords.slice(0, maxWorkspaceRecords)));
    return true;
  } catch {
    setStatus('课程保存失败，浏览器存储空间可能已满。', 'error');
    return false;
  }
}

function checklistStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readChecklistRecords() {
  const storage = checklistStorage();
  if (!storage) return {};

  try {
    const parsed = JSON.parse(storage.getItem(checklistStorageKey) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeChecklistRecords(records) {
  const storage = checklistStorage();
  if (!storage) return false;

  try {
    storage.setItem(checklistStorageKey, JSON.stringify(records));
    return true;
  } catch {
    setStatus('清单保存失败，浏览器存储空间可能已满。', 'error');
    return false;
  }
}

function currentChecklistKey() {
  return activeWorkspaceId || 'draft';
}

function checklistStateFor(key = currentChecklistKey()) {
  const records = readChecklistRecords();
  const value = records[key];
  return value && typeof value === 'object' ? value : {};
}

function moveChecklistState(fromKey, toKey) {
  if (!fromKey || fromKey === toKey) return;
  const records = readChecklistRecords();
  if (!records[fromKey] || records[toKey]) return;
  records[toKey] = records[fromKey];
  delete records[fromKey];
  writeChecklistRecords(records);
}

function renderChecklist() {
  if (!checklistList || !checklistProgress || !checklistProgressBar) return;
  const state = checklistStateFor();
  const completed = checklistItems.filter((item) => state[item.id]).length;
  const percent = Math.round((completed / checklistItems.length) * 100);
  checklistProgress.textContent = `${completed} / ${checklistItems.length}`;
  checklistProgressBar.style.width = `${percent}%`;
  checklistList.innerHTML = checklistItems.map((item) => `
    <label class="checklist-item${state[item.id] ? ' completed' : ''}">
      <input type="checkbox" data-checklist-id="${escapeHtml(item.id)}"${state[item.id] ? ' checked' : ''}>
      <span class="checklist-mark" aria-hidden="true"></span>
      <span class="checklist-item-copy">
        <strong>${escapeHtml(item.label)}</strong>
        <small>${escapeHtml(item.hint)}</small>
      </span>
    </label>
  `).join('');
}

function setChecklistDialogOpen(open) {
  if (!checklistDialog) return;
  checklistDialog.hidden = !open;
  if (open) {
    renderChecklist();
    checklistDialogCloseButton?.focus?.();
  }
}

function handleChecklistChange(event) {
  const checkbox = event.target.closest?.('[data-checklist-id]');
  if (!checkbox || !checklistList?.contains?.(checkbox)) return;
  const records = readChecklistRecords();
  const key = currentChecklistKey();
  records[key] = { ...checklistStateFor(key), [checkbox.dataset.checklistId]: checkbox.checked };
  writeChecklistRecords(records);
  renderChecklist();
}

function renderTemplateList() {
  if (!templateList) return;
  templateList.innerHTML = teachingTemplates.map((template) => `
    <article class="template-item">
      <div class="template-item-copy">
        <strong>${escapeHtml(template.label)}</strong>
        <p>${escapeHtml(template.description)}</p>
      </div>
      <button type="button" class="secondary-button" data-template-id="${escapeHtml(template.id)}">套用</button>
    </article>
  `).join('');
}

function setTemplatesDialogOpen(open) {
  if (!templatesDialog) return;
  templatesDialog.hidden = !open;
  if (open) {
    renderTemplateList();
    templatesDialogCloseButton?.focus?.();
  }
}

function applyInputValues(values = {}) {
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (!field || field.type === 'file' || typeof field.value === 'undefined') return;
    field.value = String(value ?? '');
  });
}

function applyTemplate(templateId) {
  const template = teachingTemplates.find((item) => item.id === templateId);
  const values = template?.values?.[activeFeature];
  if (!template || !values) return;

  applyInputValues(values);
  referenceMaterials = '';
  attachedFiles = [];
  materialReadPromise = Promise.resolve();
  setMaterialsFiles([]);
  if (materialSummary) materialSummary.textContent = '暂未加入材料';
  clearGeneratedResult('模板已套用，可以继续修改后生成课堂方案。');
  setTemplatesDialogOpen(false);
  setStatus(`已套用“${template.label}”模板`, 'success');
}

function workspacePayload() {
  return {
    ...formPayload(),
    referenceMaterials
  };
}

function createWorkspaceSnapshot(payload) {
  return {
    id: createWorkspaceId('version'),
    createdAt: new Date().toISOString(),
    label: currentResult ? `${featureTitles[activeFeature]}结果` : '输入草稿',
    feature: activeFeature,
    payload,
    attachments: describeAttachments(),
    result: currentResult ? cloneResult(currentResult) : null
  };
}

function cloneWorkspaceValue(value) {
  if (value === null || typeof value === 'undefined') return value;
  return JSON.parse(JSON.stringify(value));
}

async function duplicateWorkspaceRecord(workspaceId) {
  const source = workspaceRecords.find((item) => item.id === workspaceId);
  if (!source) return;

  const sourceVersions = Array.isArray(source.versions) ? source.versions : [];
  const copiedVersionPairs = [];
  const copy = {
    ...cloneWorkspaceValue(source),
    id: createWorkspaceId(),
    name: `${source.name}（副本）`,
    updatedAt: new Date().toISOString(),
    versions: sourceVersions.map((version) => {
      const copiedVersion = {
        ...cloneWorkspaceValue(version),
        id: createWorkspaceId('version')
      };
      copiedVersionPairs.push([version, copiedVersion]);
      return copiedVersion;
    })
  };
  workspaceRecords = [copy, ...workspaceRecords].slice(0, maxWorkspaceRecords);
  persistWorkspaceRecords();
  for (const [sourceVersion, copiedVersion] of copiedVersionPairs) {
    await copyAttachmentBundle(source.id, sourceVersion.id, copy.id, copiedVersion.id, sourceVersion.attachments || []);
  }
  activeWorkspaceId = copy.id;
  renderWorkspaceList();
  await loadWorkspaceRecord(copy.id);
}

function workspaceRecordMeta(payload, feature = activeFeature) {
  if (feature === 'grading') {
    return {
      name: String(payload.assignmentTitle || '未命名批改任务').trim() || '未命名批改任务',
      topic: '作业批改'
    };
  }

  if (feature === 'analysis') {
    return {
      name: '学情分析',
      topic: String(payload.classProfile || '班级画像').replace(/\s+/g, ' ').trim().slice(0, 42) || '班级画像'
    };
  }

  return {
    name: String(payload.course || '未命名课程').trim() || '未命名课程',
    topic: String(payload.topic || '').trim()
  };
}

async function saveWorkspace() {
  setStatus('保存中...', '');
  await materialReadPromise;
  const payload = workspacePayload();
  const now = new Date().toISOString();
  const snapshot = createWorkspaceSnapshot(payload);
  const meta = workspaceRecordMeta(payload);
  const previousWorkspaceId = activeWorkspaceId || 'draft';
  const existingIndex = workspaceRecords.findIndex((record) => record.id === activeWorkspaceId);
  const existing = existingIndex >= 0 ? workspaceRecords[existingIndex] : null;
  const record = {
    id: existing?.id || createWorkspaceId(),
    name: meta.name,
    topic: meta.topic,
    updatedAt: now,
    feature: activeFeature,
    payload,
    attachments: snapshot.attachments,
    result: snapshot.result,
    versions: [snapshot, ...(existing?.versions || [])].slice(0, maxWorkspaceVersions)
  };

  activeWorkspaceId = record.id;
  moveChecklistState(previousWorkspaceId, activeWorkspaceId);
  workspaceRecords = [record, ...workspaceRecords.filter((item) => item.id !== record.id)].slice(0, maxWorkspaceRecords);
  if (!persistWorkspaceRecords()) return;
  const attachmentsSaved = await persistAttachmentBundle(record.id, snapshot.id, attachedFiles);
  renderWorkspaceList();
  setStatus(
    attachmentsSaved || !attachedFiles.length
      ? workspaceSavedStatusLabels[activeFeature] || '方案已保存'
      : '方案已保存，但附件暂未能持久化',
    attachmentsSaved || !attachedFiles.length ? 'success' : 'error'
  );
}

function renderWorkspaceList() {
  if (!workspaceList || !workspaceCount) return;
  const normalizedQuery = workspaceQuery.trim().toLowerCase();
  const visibleRecords = normalizedQuery
    ? workspaceRecords.filter((record) => `${record.name} ${record.topic}`.toLowerCase().includes(normalizedQuery))
    : workspaceRecords;
  workspaceCount.textContent = normalizedQuery
    ? `显示 ${visibleRecords.length} / ${workspaceRecords.length} 门课程`
    : workspaceRecords.length ? `已保存 ${workspaceRecords.length} 门课程` : '暂无保存课程';

  if (!visibleRecords.length) {
    workspaceList.innerHTML = `
      <div class="workspace-empty">
        <strong>${normalizedQuery ? '没有匹配课程' : '还没有课程'}</strong>
        <p>${normalizedQuery ? '换一个课程名称或主题关键词试试。' : '保存当前课程后，可以继续编辑并恢复历史版本。'}</p>
      </div>
    `;
    return;
  }

  workspaceList.innerHTML = visibleRecords.map((record) => {
    const versions = Array.isArray(record.versions) ? record.versions : [];
    const attachmentCount = Array.isArray(record.attachments) ? record.attachments.length : 0;
    return `
      <article class="workspace-item">
        <div class="workspace-item-main">
          <strong>${escapeHtml(record.name)}</strong>
          <span class="workspace-item-kind">${escapeHtml(featureTitles[record.feature] || '课堂方案')}</span>
          <span>${escapeHtml(record.topic || '未填写主题')}</span>
          <small>${attachmentCount ? `附件 ${attachmentCount} · ` : ''}${escapeHtml(formatWorkspaceTime(record.updatedAt))}</small>
        </div>
        <div class="workspace-item-actions">
          <button type="button" data-workspace-action="load" data-workspace-id="${escapeHtml(record.id)}">打开</button>
          ${record.feature === 'slides' ? '' : `<button type="button" data-workspace-action="slides" data-workspace-id="${escapeHtml(record.id)}">用于课件生成</button>`}
          <button type="button" data-workspace-action="duplicate" data-workspace-id="${escapeHtml(record.id)}">复制</button>
          <button type="button" data-workspace-action="delete" data-workspace-id="${escapeHtml(record.id)}">删除</button>
        </div>
        <details class="workspace-history">
          <summary>历史版本（${versions.length || 1}）</summary>
          <div class="workspace-version-list">
            ${versions.length
              ? versions.map((version) => `
                <button type="button" data-workspace-action="restore" data-workspace-id="${escapeHtml(record.id)}" data-workspace-version-id="${escapeHtml(version.id)}">
                  <span>${escapeHtml(version.label || '课程版本')}</span>
                  <small>${escapeHtml(formatWorkspaceTime(version.createdAt))}</small>
                </button>
              `).join('')
              : '<span class="workspace-version-empty">暂无版本记录</span>'}
          </div>
        </details>
      </article>
    `;
  }).join('');
}

function setWorkspaceDialogOpen(open) {
  if (!workspaceDialog) return;
  workspaceDialog.hidden = !open;
  if (open) {
    renderWorkspaceList();
    workspaceDialogCloseButton?.focus?.();
  }
}

function applyWorkspacePayload(payload = {}, restoredFiles = [], attachmentMetadata = []) {
  applyInputValues(Object.fromEntries(Object.entries(payload).filter(([name]) => name !== 'feature' && name !== 'referenceMaterials')));

  referenceMaterials = String(payload.referenceMaterials || '');
  const restored = setMaterialsFiles(restoredFiles);
  if (restoredFiles.length && restored) {
    renderMaterialSummary(restoredFiles, referenceMaterials);
    materialReadPromise = refreshMaterials();
  } else if (attachmentMetadata.length) {
    attachedFiles = [];
    materialReadPromise = Promise.resolve();
    if (materialSummary) materialSummary.textContent = `已保存 ${attachmentMetadata.length} 份附件，请重新选择文件以继续使用。`;
  } else if (materialSummary) {
    materialReadPromise = Promise.resolve();
    materialSummary.textContent = referenceMaterials ? '已恢复课程材料摘要' : '暂未加入材料';
  }
}

async function loadWorkspaceRecord(workspaceId, versionId = '', targetFeature = '') {
  const record = workspaceRecords.find((item) => item.id === workspaceId);
  if (!record) return;

  const versions = Array.isArray(record.versions) ? record.versions : [];
  const snapshot = versionId
    ? versions.find((version) => version.id === versionId)
    : versions[0] || record;
  if (!snapshot?.payload) return;

  activeWorkspaceId = record.id;
  activeFeature = targetFeature || snapshot.feature || record.feature || 'slides';
  const attachmentMetadata = snapshot.attachments || record.attachments || [];
  setWorkspaceDialogOpen(false);
  setStatus('正在恢复课程...', '');
  const restoredFiles = await restoreAttachmentBundle(record.id, snapshot.id || record.id, attachmentMetadata);
  applyWorkspacePayload(snapshot.payload, restoredFiles, attachmentMetadata);
  const canRestoreResult = !targetFeature || targetFeature === snapshot.feature;
  currentResult = canRestoreResult && snapshot.result ? cloneResult(snapshot.result) : null;
  resultRevision += 1;
  editingTargetKey = '';
  lastRewrite = null;
  pendingRewriteKeys.clear();
  resetResultTab();
  updateFeatureUi();
  setExportActionsEnabled(Boolean(currentResult));
  if (currentResult) renderResult();
  else setResultMessage('暂无内容', `填写信息后${generateLabels[activeFeature]}。`);
  const status = targetFeature === 'slides' && snapshot.feature !== 'slides'
    ? '课程已载入课件生成'
    : versionId ? '已恢复历史版本' : '课程已打开';
  setStatus(status, 'success');
}

function deleteWorkspaceRecord(workspaceId) {
  const record = workspaceRecords.find((item) => item.id === workspaceId);
  if (!record) return;
  if (globalThis.confirm && !globalThis.confirm(`确定删除“${record.name}”吗？`)) return;

  workspaceRecords = workspaceRecords.filter((item) => item.id !== workspaceId);
  if (activeWorkspaceId === workspaceId) activeWorkspaceId = '';
  persistWorkspaceRecords();
  renderWorkspaceList();
  setStatus('课程已删除', 'success');
}

function startNewWorkspace() {
  activeWorkspaceId = '';
  activeFeature = 'slides';
  form.reset();
  referenceMaterials = '';
  attachedFiles = [];
  materialReadPromise = Promise.resolve();
  currentResult = null;
  resultRevision += 1;
  editingTargetKey = '';
  lastRewrite = null;
  pendingRewriteKeys.clear();
  if (materialSummary) materialSummary.textContent = '暂未加入材料';
  setMaterialsFiles([]);
  resetResultTab();
  updateFeatureUi();
  setExportActionsEnabled(false);
  setResultMessage('暂无内容', '填写信息后生成课堂方案。');
  setWorkspaceDialogOpen(false);
  setStatus('已新建课程', 'success');
}

function handleWorkspaceClick(event) {
  const actionElement = event.target.closest?.('[data-workspace-action]');
  if (!actionElement || !workspaceList?.contains?.(actionElement)) return;
  const workspaceId = actionElement.dataset.workspaceId;
  const action = actionElement.dataset.workspaceAction;
  if (action === 'load') loadWorkspaceRecord(workspaceId);
  if (action === 'restore') loadWorkspaceRecord(workspaceId, actionElement.dataset.workspaceVersionId);
  if (action === 'slides') loadWorkspaceRecord(workspaceId, '', 'slides');
  if (action === 'duplicate') duplicateWorkspaceRecord(workspaceId);
  if (action === 'delete') deleteWorkspaceRecord(workspaceId);
}

function isReadableMaterial(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  return type.startsWith('text/') || ['.txt', '.md', '.csv', '.json', '.log'].some((suffix) => name.endsWith(suffix));
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function trimWithNote(text, limit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n（后续内容较长，已保留前面部分。）`;
}

async function readMaterial(file, index) {
  const title = `资料${index + 1}《${file?.name || '未命名材料'}》`;
  if (!isReadableMaterial(file) || typeof file?.text !== 'function') {
    return `${title}：已加入材料名称，正文请在左侧说明中补充重点。`;
  }

  try {
    const content = trimWithNote(compactText(await file.text()), maxPerMaterialChars);
    return content ? `${title}：${content}` : `${title}：材料内容为空。`;
  } catch {
    return `${title}：暂时无法读取正文，已加入材料名称。`;
  }
}

function renderMaterialSummary(files, text) {
  if (!materialSummary) return;
  const selected = Array.from(files || []).slice(0, maxFiles);
  if (!selected.length) {
    materialSummary.textContent = '暂未加入材料';
    return;
  }

  const names = selected.map((file) => file.name).join('、');
  materialSummary.textContent = text
    ? `已加入 ${selected.length} 份材料：${names}`
    : `已记录 ${selected.length} 份材料：${names}`;
}

async function refreshMaterials() {
  const files = Array.from(materialsInput?.files || []).slice(0, maxFiles);
  attachedFiles = files;
  if (!files.length) {
    referenceMaterials = '';
    renderMaterialSummary(files, referenceMaterials);
    return;
  }

  if (materialSummary) materialSummary.textContent = '正在整理材料...';
  const entries = await Promise.all(files.map(readMaterial));
  referenceMaterials = trimWithNote(entries.join('\n'), maxTotalMaterialChars);
  renderMaterialSummary(files, referenceMaterials);
}

const rewriteInstructions = ['更简洁', '更适合课堂互动', '降低难度', '提高难度', '重新生成'];

function targetData(target, valueType) {
  return escapeHtml(JSON.stringify({ ...target, valueType }));
}

function renderRewriteActions(target, valueType) {
  const key = targetKey(target);
  const encodedTarget = targetData(target, valueType);
  if (pendingRewriteKeys.has(key)) {
    return '<span class="rewrite-status">调整中...</span>';
  }

  const actions = rewriteInstructions.map((instruction) => `
    <button type="button" data-result-action="rewrite" data-rewrite-instruction="${escapeHtml(instruction)}" data-result-target="${encodedTarget}">${escapeHtml(instruction)}</button>
  `).join('');
  const canUndo = lastRewrite?.key === key && lastRewrite.revision === resultRevision;

  return `
    <details class="rewrite-menu">
      <summary>调整</summary>
      <div class="rewrite-options">${actions}</div>
    </details>
    ${canUndo ? `<button class="undo-rewrite" type="button" data-result-action="undo" data-result-target="${encodedTarget}">撤销</button>` : ''}
  `;
}

function renderEditor({ label, value, target, valueType }) {
  const lines = valueType === 'lines';
  const editorValue = lines ? (Array.isArray(value) ? value.join('\n') : '') : String(value ?? '');
  return `
    <form class="result-editor" data-result-action="save" data-result-target="${targetData(target, valueType)}" data-value-type="${valueType}">
      <label>
        <span>${escapeHtml(label)}</span>
        ${lines
          ? `<textarea name="value" rows="4">${escapeHtml(editorValue)}</textarea>`
          : `<input name="value" value="${escapeHtml(editorValue)}" autocomplete="off">`}
      </label>
      <div class="result-editor-actions">
        <button class="primary-button" type="submit">保存</button>
        <button class="secondary-button" type="button" data-result-action="cancel">取消</button>
      </div>
    </form>
  `;
}

function renderEditableText({ label, value, target }) {
  const valueType = 'text';
  const key = targetKey(target);
  if (editingTargetKey === key) return renderEditor({ label, value, target, valueType });

  return `
    <div class="result-editable" data-result-key="${escapeHtml(key)}">
      <div class="editable-heading">
        <strong>${escapeHtml(label)}</strong>
        <div class="result-actions">
          <button type="button" data-result-action="edit" data-result-target="${targetData(target, valueType)}">编辑</button>
          ${renderRewriteActions(target, valueType)}
        </div>
      </div>
      <p class="editable-value raw-text">${escapeHtml(value || '暂无内容')}</p>
    </div>
  `;
}

function renderEditableLines({ label, value, target }) {
  const valueType = 'lines';
  const key = targetKey(target);
  const lines = Array.isArray(value) ? value : [];
  if (editingTargetKey === key) return renderEditor({ label, value: lines, target, valueType });

  return `
    <div class="result-editable" data-result-key="${escapeHtml(key)}">
      <div class="editable-heading">
        <strong>${escapeHtml(label)}</strong>
        <div class="result-actions">
          <button type="button" data-result-action="edit" data-result-target="${targetData(target, valueType)}">编辑</button>
          ${renderRewriteActions(target, valueType)}
        </div>
      </div>
      ${lines.length
        ? `<ul class="pill-list editable-list">${lines.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
        : '<p class="editable-value">暂无内容</p>'}
    </div>
  `;
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
      <section class="content-section">${renderEditableLines({ label: '教学目标', value: plan.objectives, target: { section: 'teachingPlan', field: 'objectives' } })}</section>
      <section class="content-section">${renderEditableLines({ label: '重点难点', value: plan.keyPoints, target: { section: 'teachingPlan', field: 'keyPoints' } })}</section>
      <section class="content-section">
        <h3>课堂流程</h3>
        <ul class="timeline">
          ${flow.map((item, index) => `
            <li>
              <strong>${escapeHtml(item.stage)} · ${escapeHtml(item.minutes)}分钟</strong>
              ${renderEditableText({ label: '课堂活动', value: item.activity, target: { section: 'teachingPlan', field: 'classFlow.activity', index } })}
            </li>
          `).join('')}
        </ul>
      </section>
      <section class="content-section">
        <h3>师生活动与评估</h3>
        ${renderEditableLines({ label: '教师动作', value: plan.teacherActions, target: { section: 'teachingPlan', field: 'teacherActions' } })}
        ${renderEditableLines({ label: '学生动作', value: plan.studentActions, target: { section: 'teachingPlan', field: 'studentActions' } })}
        ${renderEditableText({ label: '评估方式', value: plan.assessment || '根据课堂练习与测验结果评估。', target: { section: 'teachingPlan', field: 'assessment' } })}
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
          <li>
            <strong>第${index + 1}页</strong>
            ${renderEditableText({ label: '标题', value: slide.title, target: { section: 'slideOutline', field: 'title', index } })}
            ${renderEditableText({ label: '讲稿', value: slide.speakerNotes, target: { section: 'slideOutline', field: 'speakerNotes', index } })}
          </li>
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
            <strong>${index + 1}. [${escapeHtml(item.type)}]</strong>
            ${renderEditableText({ label: '题目', value: item.question, target: { section: 'quiz', field: 'question', index } })}
            ${renderEditableText({ label: '答案', value: item.answer, target: { section: 'quiz', field: 'answer', index } })}
            ${renderEditableText({ label: '解析', value: item.explanation, target: { section: 'quiz', field: 'explanation', index } })}
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderTieredTasks(tasks = {}) {
  return `
    <section class="content-section tiered-tasks">
      <h3>课后分层任务</h3>
      ${renderEditableLines({ label: '基础巩固', value: tasks.basic, target: { section: 'tieredTasks', field: 'basic' } })}
      ${renderEditableLines({ label: '能力提升', value: tasks.advanced, target: { section: 'tieredTasks', field: 'advanced' } })}
      ${renderEditableLines({ label: '挑战拓展', value: tasks.challenge, target: { section: 'tieredTasks', field: 'challenge' } })}
    </section>
  `;
}

function renderPitch(script = '') {
  return `
    <section class="content-section">
      ${renderEditableText({ label: '现场演示话术', value: script, target: { section: 'pitchScript', field: '' } })}
    </section>
  `;
}

function renderAssignmentSummary(review = {}) {
  const rubric = Array.isArray(review.rubric) ? review.rubric : [];
  return `
    <div class="section-grid">
      <div class="metric-row">
        <div class="metric">${renderEditableText({ label: '综合得分', value: review.score || '待评定', target: { section: 'assignmentReview', field: 'score' } })}</div>
        <div class="metric">${renderEditableText({ label: '等级', value: review.level || '待评定', target: { section: 'assignmentReview', field: 'level' } })}</div>
        <div class="metric"><span>评分项</span><strong>${rubric.length || 3}</strong></div>
        <div class="metric"><span>改进任务</span><strong>${Array.isArray(review.improvementTasks) ? review.improvementTasks.length : 0}</strong></div>
      </div>
      <section class="content-section">${renderEditableText({ label: '批改结论', value: review.feedback || '暂无内容', target: { section: 'assignmentReview', field: 'feedback' } })}</section>
    </div>
  `;
}

function renderAssignmentRubric(review = {}) {
  const rubric = Array.isArray(review.rubric) ? review.rubric : [];
  return `
    <section class="content-section">
      <h3>评分细则</h3>
      <ul class="rubric-list">
        ${rubric.length ? rubric.map((item, index) => `
          <li>
            ${renderEditableText({ label: '评分项', value: item.criterion, target: { section: 'assignmentReview', field: 'rubric.criterion', index } })}
            ${renderEditableText({ label: '分值', value: item.score, target: { section: 'assignmentReview', field: 'rubric.score', index } })}
            ${renderEditableText({ label: '说明', value: item.comment, target: { section: 'assignmentReview', field: 'rubric.comment', index } })}
          </li>
        `).join('') : '<li>暂无内容</li>'}
      </ul>
    </section>
  `;
}

function renderAssignmentFeedback(review = {}) {
  return `
    <div class="section-grid">
      <section class="content-section">${renderEditableLines({ label: '亮点', value: review.strengths, target: { section: 'assignmentReview', field: 'strengths' } })}</section>
      <section class="content-section">${renderEditableLines({ label: '待改进', value: review.issues, target: { section: 'assignmentReview', field: 'issues' } })}</section>
      <section class="content-section">${renderEditableText({ label: '评语', value: review.feedback || '暂无内容', target: { section: 'assignmentReview', field: 'feedback' } })}</section>
    </div>
  `;
}

function renderAssignmentTasks(review = {}) {
  return `
    <section class="content-section">
      ${renderEditableLines({ label: '改进任务', value: review.improvementTasks, target: { section: 'assignmentReview', field: 'improvementTasks' } })}
    </section>
  `;
}

function renderAssignmentReview(review = {}) {
  const renderers = {
    overview: renderAssignmentSummary,
    rubric: renderAssignmentRubric,
    feedback: renderAssignmentFeedback,
    tasks: renderAssignmentTasks
  };
  return renderers[activeResultTabs.grading]?.(review) || renderAssignmentSummary(review);
}

function renderAnalysis(analysis = {}) {
  const sections = {
    misconceptions: ['高频误区', analysis.misconceptions],
    riskGroups: ['风险群体', analysis.riskGroups],
    interventions: ['干预建议', analysis.interventions],
    dataIndicators: ['数据指标', analysis.dataIndicators]
  };
  const [label, value] = sections[activeResultTabs.analysis] || sections.misconceptions;
  return `<section class="content-section">${renderEditableLines({ label, value, target: { section: 'learningAnalysis', field: activeResultTabs.analysis || 'misconceptions' } })}</section>`;
}

function renderSlidesFeature(result = {}) {
  const renderers = {
    plan: () => renderTeachingPlan(result.teachingPlan),
    slides: () => renderSlides(result.slideOutline),
    quiz: () => renderQuiz(result.quiz),
    tieredTasks: () => renderTieredTasks(result.tieredTasks),
    pitch: () => renderPitch(result.pitchScript)
  };
  return renderers[activeResultTabs.slides]?.() || renderTeachingPlan(result.teachingPlan);
}

function renderResultTabs() {
  const tabsForFeature = resultTabDefinitions[activeFeature] || [];
  return `
    <nav class="result-tabs" aria-label="结果分类" role="tablist">
      ${tabsForFeature.map((tab) => `
        <button
          class="result-tab${activeResultTabs[activeFeature] === tab.id ? ' active' : ''}"
          type="button"
          role="tab"
          aria-selected="${activeResultTabs[activeFeature] === tab.id}"
          data-result-tab="${escapeHtml(tab.id)}"
        >${escapeHtml(tab.label)}</button>
      `).join('')}
    </nav>
  `;
}

function resetResultTab(feature = activeFeature) {
  activeResultTabs[feature] = resultTabDefinitions[feature]?.[0]?.id || '';
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
    slides: () => renderSlidesFeature(currentResult),
    grading: () => renderAssignmentReview(currentResult.assignmentReview),
    analysis: () => renderAnalysis(currentResult.learningAnalysis)
  };

  resultBox.innerHTML = `${renderResultTabs()}${renderers[activeFeature]?.() || `<p>暂无${escapeHtml(featureTitles[activeFeature])}内容</p>`}`;
}

function parseTarget(element) {
  try {
    return JSON.parse(element?.dataset?.resultTarget || 'null');
  } catch {
    return null;
  }
}

function editorValue(editor, target) {
  const rawValue = editor.elements.value?.value || '';
  return target.valueType === 'lines' ? normalizeEditorLines(rawValue) : rawValue.trim();
}

function saveEditor(editor) {
  if (!currentResult) return;
  const target = parseTarget(editor);
  if (!target || !isRewriteValue(editorValue(editor, target), target.valueType)) {
    setStatus('请填写有效内容', 'error');
    return;
  }

  try {
    currentResult = updateResultTarget(currentResult, target, editorValue(editor, target));
    resultRevision += 1;
    editingTargetKey = '';
    lastRewrite = null;
    setStatus('已保存修改', 'success');
    renderResult();
  } catch {
    setStatus('内容保存失败，请重试。', 'error');
  }
}

async function requestRewrite(target, instruction) {
  if (!currentResult) return;
  const key = targetKey(target);
  if (pendingRewriteKeys.has(key)) return;

  const requestRevision = resultRevision;
  const currentValue = readResultTarget(currentResult, target);
  pendingRewriteKeys.add(key);
  setStatus('正在调整...', '');
  renderResult();

  try {
    const response = await fetch('/api/rewrite-section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feature: activeFeature,
        target,
        currentValue,
        instruction,
        inputContext: {
          course: formPayload().course,
          topic: formPayload().topic,
          classProfile: formPayload().classProfile
        }
      })
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || '内容重写暂时不可用，请稍后重试。');

    if (!pendingRewriteKeys.has(key) || requestRevision !== resultRevision || !currentResult) {
      setStatus('内容已变化，本次重写未应用。', 'error');
      return;
    }
    if (!isRewriteValue(payload.value, target.valueType)) {
      throw new Error('返回内容格式不正确，本次重写未应用。');
    }

    const previous = Array.isArray(currentValue) ? [...currentValue] : currentValue;
    currentResult = updateResultTarget(currentResult, target, payload.value);
    resultRevision += 1;
    lastRewrite = { key, target, previous, revision: resultRevision };
    setStatus('已完成调整', 'success');
  } catch (error) {
    setStatus(error.message || '内容重写暂时不可用，请稍后重试。', 'error');
  } finally {
    pendingRewriteKeys.delete(key);
    if (currentResult) renderResult();
  }
}

function handleResultClick(event) {
  const resultTabElement = event.target.closest?.('[data-result-tab]');
  if (resultTabElement && resultBox.contains?.(resultTabElement)) {
    const nextTab = resultTabElement.dataset.resultTab;
    if (resultTabDefinitions[activeFeature]?.some((tab) => tab.id === nextTab)) {
      activeResultTabs[activeFeature] = nextTab;
      editingTargetKey = '';
      renderResult();
    }
    return;
  }

  const actionElement = event.target.closest?.('[data-result-action]');
  if (!actionElement || !resultBox.contains?.(actionElement)) return;

  const action = actionElement.dataset.resultAction;
  const target = parseTarget(actionElement);
  if (action === 'edit' && target) {
    editingTargetKey = targetKey(target);
    renderResult();
    return;
  }
  if (action === 'cancel') {
    editingTargetKey = '';
    renderResult();
    return;
  }
  if (action === 'rewrite' && target) {
    requestRewrite(target, actionElement.dataset.rewriteInstruction || '重新生成');
    return;
  }
  if (action === 'undo' && target && lastRewrite?.key === targetKey(target) && lastRewrite.revision === resultRevision) {
    currentResult = updateResultTarget(currentResult, target, lastRewrite.previous);
    resultRevision += 1;
    lastRewrite = null;
    setStatus('已撤销调整', 'success');
    renderResult();
  }
}

function handleResultSubmit(event) {
  const editor = event.target.closest?.('.result-editor');
  if (!editor) return;
  event.preventDefault();
  saveEditor(editor);
}

function exportInput() {
  return formPayload();
}

function exportHtml() {
  return buildExportHtml({ result: currentResult, input: exportInput(), feature: activeFeature });
}

function downloadDocument({ html, filename, type }) {
  const blob = new Blob(['\ufeff', html], { type });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setExportMenuOpen(open) {
  if (!exportMenu || !exportButton) return;
  exportMenu.hidden = !open;
  exportButton.setAttribute('aria-expanded', String(open));
}

function toggleExportMenu() {
  if (!currentResult || exportButton?.disabled) return;
  setExportMenuOpen(Boolean(exportMenu?.hidden));
}

function updateThemeSelection(themeId) {
  selectedPptTheme = themeId || selectedPptTheme;
  themeButtons.forEach((button) => {
    const selected = button.dataset.themeId === selectedPptTheme;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setThemeDialogOpen(open) {
  if (!themeDialog) return;
  themeDialog.hidden = !open;
  if (open) {
    updateThemeSelection(selectedPptTheme);
    const selectedButton = themeButtons.find((button) => button.dataset.themeId === selectedPptTheme) || themeButtons[0];
    selectedButton?.focus?.();
  }
}

function openThemeDialog() {
  if (!currentResult || activeFeature !== 'slides') return;
  setExportMenuOpen(false);
  setThemeDialogOpen(true);
}

function closeAllExportSurfaces() {
  setExportMenuOpen(false);
  setThemeDialogOpen(false);
  setWorkspaceDialogOpen(false);
  setTemplatesDialogOpen(false);
  setChecklistDialogOpen(false);
  setClassroomAssistantOpen(false);
  setReflectionDialogOpen(false);
}

function exportWord() {
  if (!currentResult) return;
  downloadDocument({
    html: exportHtml(),
    filename: exportFileName(exportInput(), 'doc'),
    type: 'application/msword;charset=utf-8'
  });
  setStatus('已导出 Word', 'success');
}

function exportPdf() {
  if (!currentResult) return;
  const preview = window.open('', '_blank');
  if (!preview) {
    setStatus('请允许弹出窗口', 'error');
    return;
  }

  preview.document.open();
  preview.document.write(exportHtml());
  preview.document.close();
  preview.focus();
  setTimeout(() => preview.print(), 250);
  setStatus('已打开 PDF', 'success');
}

function exportPpt(themeId = selectedPptTheme) {
  if (!currentResult || activeFeature !== 'slides') return;
  updateThemeSelection(themeId);
  const input = exportInput();
  const bytes = buildPptx({
    result: currentResult,
    input,
    themeId: selectedPptTheme
  });
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  downloadBlob(blob, pptFileName(input));
  setStatus('已导出 PPT', 'success');
}

function exportByFormat(format) {
  if (format === 'word') exportWord();
  if (format === 'pdf') exportPdf();
  if (format === 'ppt' && activeFeature === 'slides') openThemeDialog();
  if (format !== 'ppt') setExportMenuOpen(false);
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
  resetResultTab();
  resultRevision += 1;
  editingTargetKey = '';
  lastRewrite = null;
  pendingRewriteKeys.clear();
  setExportActionsEnabled(false);
  setStatus('生成中...', '');
  setResultMessage('正在生成', '请稍候。');

  try {
    await materialReadPromise;
    currentResult = await requestJson('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload())
    });
    resultRevision += 1;
    setStatus('已生成', 'success');
    setExportActionsEnabled(true);
    renderResult();
  } catch (error) {
    currentResult = null;
    setExportActionsEnabled(false);
    setStatus(error.message, 'error');
    setResultMessage('暂时无法生成', error.message, 'error-state');
  } finally {
    generateButton.disabled = false;
  }
}

async function loadSample() {
  setStatus('载入样例...', '');
  try {
    currentResult = await requestJson('/api/sample');
    resetResultTab();
    resultRevision += 1;
    editingTargetKey = '';
    lastRewrite = null;
    pendingRewriteKeys.clear();
    setStatus('样例已载入', 'success');
    setExportActionsEnabled(true);
    renderResult();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  generate();
});

resultBox?.addEventListener?.('click', handleResultClick);
resultBox?.addEventListener?.('submit', handleResultSubmit);
workspaceButton?.addEventListener('click', () => setWorkspaceDialogOpen(true));
workspaceDialogCloseButton?.addEventListener('click', () => setWorkspaceDialogOpen(false));
newWorkspaceButton?.addEventListener('click', startNewWorkspace);
saveWorkspaceButton?.addEventListener('click', saveWorkspace);
workspaceList?.addEventListener('click', handleWorkspaceClick);
workspaceDialog?.addEventListener('click', (event) => {
  if (event.target === workspaceDialog) setWorkspaceDialogOpen(false);
});
workspaceSearch?.addEventListener('input', (event) => {
  workspaceQuery = event.target.value || '';
  renderWorkspaceList();
});
templatesButton?.addEventListener('click', () => setTemplatesDialogOpen(true));
templatesDialogCloseButton?.addEventListener('click', () => setTemplatesDialogOpen(false));
templatesDialog?.addEventListener('click', (event) => {
  if (event.target === templatesDialog) setTemplatesDialogOpen(false);
});
templateList?.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-template-id]');
  if (button) applyTemplate(button.dataset.templateId);
});
checklistButton?.addEventListener('click', () => setChecklistDialogOpen(true));
checklistDialogCloseButton?.addEventListener('click', () => setChecklistDialogOpen(false));
checklistDialog?.addEventListener('click', (event) => {
  if (event.target === checklistDialog) setChecklistDialogOpen(false);
});
checklistList?.addEventListener('change', handleChecklistChange);
classroomAssistantButton?.addEventListener('click', () => setClassroomAssistantOpen(true));
classroomAssistantCloseButton?.addEventListener('click', () => setClassroomAssistantOpen(false));
classroomAssistantDialog?.addEventListener('click', (event) => {
  if (event.target === classroomAssistantDialog) setClassroomAssistantOpen(false);
});
timerPresetButtons.forEach((button) => {
  button.addEventListener('click', () => setTimerDuration(button.dataset.timerSeconds));
});
timerToggleButton?.addEventListener('click', () => {
  if (timerRunning) pauseTimer();
  else startTimer();
});
timerResetButton?.addEventListener('click', resetTimer);
nextPromptButton?.addEventListener('click', nextClassroomPrompt);
copyPromptButton?.addEventListener('click', () => copyText(classroomPrompt?.textContent || '', '课堂问题已复制'));
reflectionButton?.addEventListener('click', () => setReflectionDialogOpen(true));
reflectionCloseButton?.addEventListener('click', () => setReflectionDialogOpen(false));
reflectionDialog?.addEventListener('click', (event) => {
  if (event.target === reflectionDialog) setReflectionDialogOpen(false);
});
reflectionForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveReflection();
});

sampleButton.addEventListener('click', loadSample);
exportButton?.addEventListener('click', toggleExportMenu);
copyResultButton?.addEventListener('click', copyCurrentResult);
exportFormatButtons.forEach((button) => {
  button.addEventListener('click', () => exportByFormat(button.dataset.exportFormat));
});
themeDialogCloseButton?.addEventListener('click', closeAllExportSurfaces);
themeDialog?.addEventListener('click', (event) => {
  if (event.target === themeDialog) closeAllExportSurfaces();
});
themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    exportPpt(button.dataset.themeId);
    closeAllExportSurfaces();
  });
});
document.addEventListener?.('click', (event) => {
  const target = event.target;
  if (!exportMenu || exportMenu.hidden) return;
  if (exportButton?.contains?.(target) || exportMenu.contains?.(target)) return;
  setExportMenuOpen(false);
});
document.addEventListener?.('keydown', (event) => {
  if (event.key === 'Escape') closeAllExportSurfaces();
});
renderTimer();
setExportActionsEnabled(false);

if (materialsInput) {
  materialsInput.addEventListener('change', () => {
    materialReadPromise = refreshMaterials();
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setActiveFeature(tab.dataset.feature || 'slides');
  });
});

workspaceRecords = readWorkspaceRecords();
renderWorkspaceList();
updateFeatureUi();
