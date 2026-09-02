import type { Lang } from './i18n';

const SUGGESTIONS: Record<Lang, Record<string, string[]>> = {
  'zh-TW': {
    general: ['我目前最需要留意的事情是什麼？', '未來三個月的整體走向如何？', '這件事下一步該怎麼做？', '我現在該先等待、準備，還是行動？', '眼前最容易忽略的關鍵是什麼？'],
    marriage: ['我與對方的關係接下來會如何發展？', '現在適合主動溝通嗎？', '這段關係最需要改善的是什麼？', '我應該表達心意，還是先觀察？', '這段關係的界線該怎麼掌握？'],
    relationship: ['我和這個人目前的相處模式需要調整什麼？', '這次溝通適合談清楚哪一件事？', '我該主動靠近，還是保留空間？', '這段關係下一步最值得經營的是什麼？'],
    reconciliation: ['現在適合重新聯絡對方嗎？', '若想修復關係，我該先做什麼？', '這段關係還有重新理解彼此的空間嗎？', '我應該放下，還是再給彼此一次機會？'],
    career: ['目前的工作發展是否適合我？', '我該把重心放在哪個工作目標？', '近期是否適合轉換工作或職位？', '現在最該累積的職場能力是什麼？', '我在工作上應進取還是穩守？'],
    jobSearch: ['這次面試最該展現哪一項優勢？', '這份工作機會是否值得我投入？', '我該繼續等待理想職缺，還是先接受現有機會？', '求職過程中最需要補強的是什麼？'],
    promotion: ['現在適合爭取升遷或調職嗎？', '轉到新工作是否比留在原位更有利？', '我該如何為下一步職涯布局？', '這個工作變動最大的風險與機會是什麼？'],
    workplace: ['我該如何處理與同事或主管的磨合？', '這次合作最需要先講清楚什麼？', '我在職場中應該堅持還是退一步？', '眼前的職場壓力該怎麼化解？'],
    business: ['這個合作案是否值得推進？', '創業計畫現在最需要補足什麼條件？', '我和合作夥伴的分工該怎麼調整？', '這個提案該現在啟動，還是再準備一段時間？'],
    wealth: ['近期的財運與收支狀況如何？', '這項投資或消費決定是否合適？', '我該如何改善目前的財務狀況？', '目前應優先保守累積，還是擴大收入來源？', '我最需要留意哪一筆支出或風險？'],
    cashflow: ['未來三個月的收支壓力該如何安排？', '這筆大額支出現在適合做嗎？', '我該先還款、儲蓄，還是投入提升自己的計畫？', '目前的資金安排最需要防範什麼？'],
    health: ['我近期的身心狀態需要注意什麼？', '現在最適合的調整與休養方向是什麼？', '我應優先改善哪個生活習慣？', '我該如何安排工作與休息的節奏？', '最近感到疲勞時，我最該先照顧什麼？'],
    wellbeing: ['我現在的壓力最需要從哪裡開始整理？', '我該暫停、求助，還是調整步調？', '這段低潮期最值得維持的日常是什麼？', '我該如何把注意力拉回真正重要的事？'],
    study: ['我目前的學習方向是否合適？', '我該如何突破目前的學習瓶頸？', '近期的考試或申請準備得如何？', '我現在最該補強基礎、方法，還是實戰？', '我該如何安排接下來的學習節奏？'],
    exam: ['這次考試準備的重點該放在哪裡？', '申請這個學校或計畫的機會如何？', '我現在適合加強準備，還是先補足弱項？', '考前最該避免哪一種分心或失誤？'],
    travel: ['這次出行是否適合成行？', '旅途中最需要注意什麼？', '現在是否適合規劃這趟旅行？', '這趟行程該保守安排還是彈性探索？', '我該先確認哪個風險或備案？'],
    relocation: ['現在適合搬家或換城市嗎？', '這個居住地選擇是否符合我現階段需要？', '搬遷前最該先處理哪個現實條件？', '我該先安定下來，還是再保留選擇空間？'],
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
    lang === 'en' ? `What risk or condition should I check before deciding about ${label}?` : lang === 'ja' ? `${label}について決める前に、どの条件やリスクを確認すべきですか？` : `關於「${label}」，做決定前我該先確認什麼條件或風險？`,
    lang === 'en' ? `Should I act now, prepare more, or wait with ${label}?` : lang === 'ja' ? `${label}について、今は動く・準備する・待つのどれがよいですか？` : `關於「${label}」，我現在該行動、準備，還是等待？`,
  ];
}
