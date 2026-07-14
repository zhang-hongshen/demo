export function buildTeachingMessages(input) {
  const referenceMaterials = String(input.referenceMaterials || '').trim().slice(0, 12000);
  const featureLabels = {
    slides: '课件生成',
    grading: '作业批改',
    analysis: '学情分析'
  };
  const featureGuidance = {
    slides: '只需要重点返回课件生成结果，包括教案、课件大纲、随堂测验和演示话术；其他字段可以保持简洁。',
    grading: '只需要重点返回作业批改结果，包括得分、等级、评分细则、亮点、问题、评语和改进任务；其他字段可以保持简洁。',
    analysis: '只需要重点返回学情分析结果，包括高频误区、风险群体、干预建议和数据指标；其他字段可以保持简洁。'
  };
  const feature = featureLabels[input.feature] ? input.feature : 'slides';
  const normalized = {
    feature,
    course: input.course || '人工智能导论',
    topic: input.topic || '生成式AI在校园中的应用',
    classProfile: input.classProfile || '本科二年级，45人',
    painPoints: input.painPoints || '基础差异大，课堂互动不足',
    objectives: input.objectives || '理解核心概念并完成课堂练习',
    assignmentTitle: input.assignmentTitle || '二叉树遍历练习',
    assignmentRequirement: input.assignmentRequirement || '写出给定二叉树的前序、中序、后序遍历序列，并说明递归边界。',
    gradingRubric: input.gradingRubric || '遍历序列60分，递归过程解释30分，书写规范10分。',
    studentSubmission: input.studentSubmission || '前序：A B D E C；中序：D B E A C；后序：D E B C A。递归结束条件为空节点。',
    duration: input.duration || '45分钟',
    outputStyle: input.outputStyle || '校方领导现场演示',
    referenceMaterials
  };

  return [
    {
      role: 'system',
      content: [
        '你是面向高校客户的AI教学方案专家，正在使用DeepSeek Flash生成演示内容。',
        '请围绕高校真实教学、信息化建设和校企合作场景生成可直接演示的中文内容。',
        '只输出JSON，不要使用Markdown代码块。JSON必须可被JSON.parse解析。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        '请根据以下需求生成“智教方案生成台”的演示结果。',
        `当前功能：${featureLabels[normalized.feature]}`,
        featureGuidance[normalized.feature],
        `课程名称：${normalized.course}`,
        `本节主题：${normalized.topic}`,
        `班级画像：${normalized.classProfile}`,
        `学生痛点：${normalized.painPoints}`,
        `教学目标：${normalized.objectives}`,
        '作业批改：',
        `作业名称：${normalized.assignmentTitle}`,
        `作业要求：${normalized.assignmentRequirement}`,
        `评分标准：${normalized.gradingRubric}`,
        `学生提交：${normalized.studentSubmission}`,
        `课堂时长：${normalized.duration}`,
        `输出风格：${normalized.outputStyle}`,
        normalized.referenceMaterials
          ? `补充材料：\n${normalized.referenceMaterials}\n请优先结合补充材料中的课程内容、学生反馈和课堂证据。`
          : '补充材料：未提供',
        '返回JSON字段必须包含：',
        '示例JSON结构：{"teachingPlan":{"objectives":["目标"]},"slideOutline":[{"title":"标题","speakerNotes":"讲稿"}],"quiz":[{"type":"单选","question":"题目","answer":"答案","explanation":"解析"}],"learningAnalysis":{"misconceptions":["误区"],"riskGroups":["风险群体"],"interventions":["干预"],"dataIndicators":["指标"]},"assignmentReview":{"score":"86","level":"良好","strengths":["优点"],"issues":["问题"],"rubric":[{"criterion":"评分项","score":"分值","comment":"说明"}],"feedback":"评语","improvementTasks":["改进任务"]},"pitchScript":"话术"}',
        'teachingPlan: { objectives, keyPoints, classFlow, teacherActions, studentActions, assessment }',
        'slideOutline: [{ title, speakerNotes }]',
        'quiz: [{ type, question, answer, explanation }]',
        'learningAnalysis: { misconceptions, riskGroups, interventions, dataIndicators }',
        'assignmentReview: { score, level, strengths, issues, rubric, feedback, improvementTasks }',
        'pitchScript: string'
      ].join('\n')
    }
  ];
}
