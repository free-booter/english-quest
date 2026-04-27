import { Word } from '../../types'

export interface ScenarioStep {
  id: string
  prompt: string
  context: string
  options: string[]
  correctOption: string
  successFeedback: string
  failFeedback: string
}

export interface StageScenarioConfig {
  stageId: string
  intro: string
  successOutro: string
  failHint: string
  steps: ScenarioStep[]
}

const stageScenarios: Record<string, StageScenarioConfig> = {
  'drama-ch1-st1': {
    stageId: 'drama-ch1-st1',
    intro: '你刚到片场派对，需要用自然英语跟新朋友快速破冰。',
    successOutro: '你成功和大家聊起来了，社交氛围拉满。',
    failHint: '口语场景先选最自然的寒暄短语，不要太书面。',
    steps: [
      {
        id: 'd1',
        prompt: '有人朝你挥手，你最自然的开场是？',
        context: '场景：第一次见面，语气轻松',
        options: ['hey', "what's up", 'long time no see', 'nice to meet you'],
        correctOption: 'hey',
        successFeedback: '开场很自然，像母语者日常打招呼。',
        failFeedback: '这里需要日常寒暄，不是学术词。',
      },
      {
        id: 'd2',
        prompt: '对方问你近况，你接这句最合适：',
        context: '场景：继续寒暄，表达友好',
        options: ["how's it going", 'see you', 'good to see you', 'catch you later'],
        correctOption: "how's it going",
        successFeedback: '很顺畅，对话自然推进。',
        failFeedback: '此处是聊天语境，优先口语化表达。',
      },
      {
        id: 'd3',
        prompt: '你准备先离开，礼貌结束对话该说：',
        context: '场景：告别，不生硬',
        options: ['take care', 'have a good one', 'see you', 'catch you later'],
        correctOption: 'take care',
        successFeedback: '结束得体，留下好印象。',
        failFeedback: '离场告别一般用祝福式短语。',
      },
    ],
  },
  'drama-ch2-st1': {
    stageId: 'drama-ch2-st1',
    intro: '你和朋友刚看完一集神反转，需要快速表达情绪和观点。',
    successOutro: '你把情绪表达得很地道，朋友都听懂了你的“追剧语气”。',
    failHint: '表达情绪时优先选“口语化形容词”，不是场景名词。',
    steps: [
      {
        id: 'd2-1',
        prompt: '看到超炸裂剧情时，你最自然会说：',
        context: '场景：兴奋感叹',
        options: ['amazing', 'awesome', 'excited', 'relieved'],
        correctOption: 'amazing',
        successFeedback: '情绪表达到位，像在真实追剧群聊。',
        failFeedback: '这里要表达”惊喜兴奋”，选形容词更自然。',
      },
      {
        id: 'd2-2',
        prompt: '朋友吐槽剧情离谱，你可以接：',
        context: '场景：轻松吐槽',
        options: ['weird', 'awkward', 'terrible', 'annoying'],
        correctOption: 'weird',
        successFeedback: '语气很贴近日常口语，吐槽成功。',
        failFeedback: '这是剧情评价语境，不是出行/学术语境。',
      },
      {
        id: 'd2-3',
        prompt: '最后你笑到停不下来，可以说剧情很：',
        context: '场景：情绪收尾',
        options: ['hilarious', 'amazing', 'awesome', 'nervous'],
        correctOption: 'hilarious',
        successFeedback: '这句很地道，情绪传达非常清晰。',
        failFeedback: '”笑疯了”的语境通常用情绪形容词。',
      },
    ],
  },
  'travel-ch1-st1': {
    stageId: 'travel-ch1-st1',
    intro: '明早就要出发，你在深夜整理行李，必须把关键物品带齐。',
    successOutro: '你的行李清单准备完成，出发前焦虑值明显下降。',
    failHint: '旅行准备优先选“必需物品词”，避免选流程类词汇。',
    steps: [
      {
        id: 't1-1',
        prompt: '办理国际行程时，最不能忘的证件是：',
        context: '场景：证件核对',
        options: ['passport', 'visa', 'ticket', 'itinerary'],
        correctOption: 'passport',
        successFeedback: '证件意识很强，这一步非常关键。',
        failFeedback: '国际出行证件优先级最高。',
      },
      {
        id: 't1-2',
        prompt: '你确认航班后，需要检查电子和纸质：',
        context: '场景：出发前确认',
        options: ['ticket', 'luggage', 'charger', 'adapter'],
        correctOption: 'ticket',
        successFeedback: '很好，登机信息确认完整。',
        failFeedback: '这里是行程文件，不是关系或学术词。',
      },
      {
        id: 't1-3',
        prompt: '你把衣物和洗漱用品都装进了：',
        context: '场景：打包动作',
        options: ['suitcase', 'backpack', 'luggage', 'charger'],
        correctOption: 'suitcase',
        successFeedback: '打包流程正确，准备状态在线。',
        failFeedback: '这是打包语境，应该是具体容器词。',
      },
    ],
  },
  'exam-ch1-st1': {
    stageId: 'exam-ch1-st1',
    intro: '你在备考写作课上，需要把常见高频动词用在正确语境。',
    successOutro: '你的动词使用更精准，作文表达层次明显提升。',
    failHint: '应试语境先判断“动作逻辑”，再选对应动词。',
    steps: [
      {
        id: 'e1-1',
        prompt: '”我们要___新知识”，更合适的动词是：',
        context: '场景：学术写作基础句',
        options: ['acquire', 'abandon', 'accept', 'advance'],
        correctOption: 'acquire',
        successFeedback: '动词搭配准确，语义清晰。',
        failFeedback: '这里需要”获得知识”的动作词。',
      },
      {
        id: 'e1-2',
        prompt: '”研究结果表明，我们应___策略”，应选：',
        context: '场景：论证句',
        options: ['adapt', 'achieve', 'adjust', 'analyze'],
        correctOption: 'adapt',
        successFeedback: '这句很符合考试写作风格。',
        failFeedback: '应试写作里常见”调整策略”表达。',
      },
      {
        id: 'e1-3',
        prompt: '”团队最终___目标”，最匹配的是：',
        context: '场景：结果描述',
        options: ['achieve', 'acquire', 'advance', 'arrange'],
        correctOption: 'achieve',
        successFeedback: '结果型表达准确且高频。',
        failFeedback: '这里描述”达成目标”，不是场景名词。',
      },
    ],
  },
}

function buildDistractors(words: Word[], correctWord: string): string[] {
  const pool = words
    .map((word) => word.word)
    .filter((word) => word !== correctWord)

  // 随机打乱后取前 3 个，避免总是用同样的干扰项顺序
  const shuffled = pool.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, 3)

  // 如果词汇不足 3 个，用占位符补充
  const fallbackPool = ['option A', 'option B', 'option C']
  const padded = [...selected, ...fallbackPool].slice(0, 3)
  return padded
}

export function buildFallbackScenario(stageId: string, title: string, words: Word[]): StageScenarioConfig {
  const fallbackWords = words.slice(0, Math.min(5, words.length))
  const contexts = [
    '你需要快速做出语言选择',
    '对话正在继续，不能冷场',
    '你在任务中遇到关键判断',
    '你想让表达更地道',
    '收尾阶段需要一个准确用词',
  ]
  const steps: ScenarioStep[] = fallbackWords.map((word, index) => {
    const options = [word.word, ...buildDistractors(words, word.word)].sort(() => Math.random() - 0.5)
    return {
      id: `${stageId}-fallback-${index + 1}`,
      prompt: `第 ${index + 1} 轮：中文释义「${word.meaning}」对应哪个英文词？`,
      context: contexts[index % contexts.length],
      options,
      correctOption: word.word,
      successFeedback: `你选对了，${word.word} 在这个语境更自然。`,
      failFeedback: `更合适的是 ${word.word}（${word.meaning}）。`,
    }
  })

  return {
    stageId,
    intro: `你进入「${title}」任务场景，接下来需要连续做出语言决策。`,
    successOutro: '你完成了这段互动剧情，用词判断越来越稳。',
    failHint: '先看语境，再判断词义与语气是否匹配。',
    steps,
  }
}

export function getStageScenario(stageId: string): StageScenarioConfig | undefined {
  return stageScenarios[stageId]
}
