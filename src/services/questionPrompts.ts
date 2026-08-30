import type { Lang } from './i18n';

const SUGGESTIONS: Record<Lang, Record<string, string[]>> = {
  'zh-TW': {
    general: ['我目前最需要留意的事情是什麼？', '未來三個月的整體走向如何？', '這件事下一步該怎麼做？'],
    marriage: ['我與對方的關係接下來會如何發展？', '現在適合主動溝通嗎？', '這段關係最需要改善的是什麼？'],
    career: ['目前的工作發展是否適合我？', '我該把重心放在哪個工作目標？', '近期是否適合轉換工作或職位？'],
    wealth: ['近期的財運與收支狀況如何？', '這項投資或消費決定是否合適？', '我該如何改善目前的財務狀況？'],
    health: ['我近期的身心狀態需要注意什麼？', '現在最適合的調整與休養方向是什麼？', '我應優先改善哪個生活習慣？'],
    study: ['我目前的學習方向是否合適？', '我該如何突破目前的學習瓶頸？', '近期的考試或申請準備得如何？'],
    travel: ['這次出行是否適合成行？', '旅途中最需要注意什麼？', '現在是否適合規劃這趟旅行？'],
  },
  en: {
    general: ['What should I pay most attention to right now?', 'What is the overall direction for the next three months?', 'What should my next step be in this situation?'],
    marriage: ['How will this relationship develop from here?', 'Is this a good time to start a conversation?', 'What does this relationship need most?'],
    career: ['Is my current work direction right for me?', 'Which work goal deserves my focus?', 'Is it a good time to change jobs or roles?'],
    wealth: ['How are my finances likely to develop soon?', 'Is this investment or purchase a good decision?', 'How can I improve my financial situation?'],
    health: ['What should I watch in my physical and mental wellbeing?', 'What adjustment or rest would help me most?', 'Which habit should I improve first?'],
    study: ['Is my current learning direction suitable?', 'How can I overcome my learning bottleneck?', 'How is my preparation for the upcoming exam or application?'],
    travel: ['Is this trip suitable to take?', 'What should I pay attention to during the trip?', 'Is this a good time to plan this journey?'],
  },
  ja: {
    general: ['今、最も注意すべきことは何ですか？', '今後3か月の全体的な流れはどうですか？', 'この件で次に何をすべきですか？'],
    marriage: ['この関係はこれからどう発展しますか？', '今は話し合いを始めるよい時期ですか？', 'この関係で最も改善すべきことは何ですか？'],
    career: ['今の仕事の方向性は自分に合っていますか？', 'どの仕事目標に集中すべきですか？', '転職や異動に適した時期ですか？'],
    wealth: ['近いうちの金運や収支はどうですか？', 'この投資や買い物は適切ですか？', '今の財務状況をどう改善できますか？'],
    health: ['心身の状態で何に注意すべきですか？', '今最も必要な休養や調整は何ですか？', '最初に改善すべき生活習慣は何ですか？'],
    study: ['今の学習の方向性は適していますか？', '学習の壁をどう乗り越えられますか？', '試験や申請の準備はどうですか？'],
    travel: ['この旅行は実行に適していますか？', '旅行中に何へ注意すべきですか？', '今はこの旅を計画するよい時期ですか？'],
  },
};

export function questionPrompts(category: string, label: string, lang: Lang): string[] {
  return SUGGESTIONS[lang][category] ?? [
    lang === 'en' ? `What should I know about ${label}?` : lang === 'ja' ? `${label}について、今知るべきことは何ですか？` : `關於「${label}」，我現在最需要知道什麼？`,
    lang === 'en' ? `How will ${label} develop next?` : lang === 'ja' ? `${label}は今後どう進みますか？` : `「${label}」接下來會如何發展？`,
    lang === 'en' ? `What is the best next step for ${label}?` : lang === 'ja' ? `${label}に関して次に何をすべきですか？` : `關於「${label}」，下一步該怎麼做？`,
  ];
}
