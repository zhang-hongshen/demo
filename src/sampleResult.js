export const sampleResult = {
  teachingPlan: {
    objectives: [
      '理解二叉树前序、中序、后序遍历的执行顺序',
      '能够根据遍历序列还原核心思路',
      '完成一次小组协作的课堂练习'
    ],
    keyPoints: ['递归边界', '访问根节点时机', '遍历序列与树结构关系'],
    classFlow: [
      { stage: '导入', minutes: 5, activity: '用校园组织架构图引出树结构' },
      { stage: '讲解', minutes: 15, activity: '对比三种遍历顺序并动态演示' },
      { stage: '练习', minutes: 15, activity: '学生分组完成遍历序列推导' },
      { stage: '反馈', minutes: 10, activity: '汇总高频错误并给出补救练习' }
    ],
    teacherActions: ['展示样例树', '追问递归出口', '点评小组答案'],
    studentActions: ['标注访问顺序', '提交随堂答案', '互评推导过程'],
    assessment: '以5题随堂测验和小组讲解准确率判断掌握情况。'
  },
  slideOutline: [
    { title: '课堂目标与真实问题', speakerNotes: '把抽象结构转为学生熟悉的校园层级。' },
    { title: '二叉树遍历规则', speakerNotes: '突出根节点访问时机差异。' },
    { title: '递归执行过程', speakerNotes: '用颜色标记调用栈变化。' },
    { title: '课堂练习任务', speakerNotes: '分组完成一棵树的三类遍历。' },
    { title: '学情分析看板', speakerNotes: '展示错误分布和补救建议。' },
    { title: '课后巩固路径', speakerNotes: '输出分层练习和答疑安排。' }
  ],
  quiz: [
    { type: '单选', question: '前序遍历最先访问哪个节点？', answer: '根节点', explanation: '前序遍历顺序为根、左、右。' },
    { type: '判断', question: '中序遍历一定先访问根节点。', answer: '错误', explanation: '中序遍历先访问左子树。' },
    { type: '简答', question: '后序遍历适合表达哪类处理？', answer: '先处理子节点再汇总父节点', explanation: '后序顺序为左、右、根。' },
    { type: '单选', question: '递归遍历必须明确什么？', answer: '递归边界', explanation: '没有边界会导致无限递归。' },
    { type: '应用', question: '请写出给定三节点树的中序遍历。', answer: '左、根、右', explanation: '按中序规则依次访问。' }
  ],
  learningAnalysis: {
    misconceptions: ['把前序和层序混淆', '忽略空子树递归边界', '只背顺序不理解调用过程'],
    riskGroups: ['程序基础薄弱学生', '缺课学生', '课堂练习提交过慢学生'],
    interventions: ['推送递归动画微课', '安排助教小组答疑', '为风险学生生成3道补救题'],
    dataIndicators: ['随堂测验正确率', '练习提交耗时', '错误类型分布', '课后复习完成率']
  },
  pitchScript: '老师输入课程主题和班级画像后，平台即可产出教案、课件大纲、测验和学情分析，帮助高校把备课、授课、评测、补救串成完整闭环。'
};
