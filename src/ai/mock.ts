// AI Mock 数据 - v1 阶段全量 mock，v2 接真接口

export interface ExampleBundle {
  examples: Array<{ en: string; zh: string }>
  grammarPoints: Array<{ point: string; explanation: string }>
  extendedWords: Array<{ word: string; relation: 'synonym' | 'antonym' | 'root' }>
}

// 按单词生成 mock 例句和语法点
const mockData: Record<string, ExampleBundle> = {
  abandon: {
    examples: [
      {
        en: 'They abandoned the project due to lack of funding.',
        zh: '由于缺乏资金，他们放弃了这个项目。',
      },
      {
        en: 'Do not abandon hope in difficult times.',
        zh: '在困难时期不要放弃希望。',
      },
    ],
    grammarPoints: [
      { point: '过去式: abandoned', explanation: '动词 abandon 的过去式和过去分词' },
      { point: '及物动词', explanation: '后面直接跟宾语，无需介词' },
    ],
    extendedWords: [
      { word: 'abandonment', relation: 'root' },
      { word: 'give up', relation: 'synonym' },
      { word: 'keep', relation: 'antonym' },
    ],
  },
  ability: {
    examples: [
      { en: 'She has the ability to speak five languages.', zh: '她有讲五种语言的能力。' },
      { en: 'His ability in mathematics is remarkable.', zh: '他的数学能力很出众。' },
    ],
    grammarPoints: [
      { point: '名词短语: have the ability to do', explanation: '表示有做某事的能力' },
      { point: '可数名词', explanation: '可以用 a/an，复数形式 abilities' },
    ],
    extendedWords: [
      { word: 'capable', relation: 'synonym' },
      { word: 'skill', relation: 'synonym' },
      { word: 'inability', relation: 'antonym' },
    ],
  },
  accept: {
    examples: [
      { en: 'I accept your invitation to the party.', zh: '我接受你的派对邀请。' },
      { en: 'The company accepted our proposal.', zh: '公司接受了我们的提案。' },
    ],
    grammarPoints: [
      { point: '及物动词', explanation: '必须跟宾语' },
      { point: '搭配: accept sth / accept an invitation', explanation: '常见搭配方式' },
    ],
    extendedWords: [
      { word: 'acceptance', relation: 'root' },
      { word: 'agree', relation: 'synonym' },
      { word: 'reject', relation: 'antonym' },
    ],
  },
}

export async function fetchExamples(word: string): Promise<ExampleBundle> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 300))

  return (
    mockData[word.toLowerCase()] || {
      examples: [
        { en: `Example sentence with ${word}.`, zh: '包含该词的例句。' },
      ],
      grammarPoints: [{ point: '词性', explanation: '根据上下文灵活使用' }],
      extendedWords: [{ word: 'related', relation: 'synonym' }],
    }
  )
}
