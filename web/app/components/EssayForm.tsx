'use client'

import { useMemo } from 'react'

const RANDOM_PROMPTS = [
  "你最喜欢的一位老师 (Your favorite teacher)",
  "一次难忘的旅行 (An unforgettable trip)",
  "如何保护环境 (How to protect the environment)",
  "我的业余爱好 (My hobby)",
  "介绍你的家乡 (Introduce your hometown)",
  "我的梦想职业 (My dream job)",
  "如何保持健康 (How to keep healthy)",
  "一次有意义的志愿活动 (A meaningful volunteer activity)",
  "网络的好与坏 (The advantages and disadvantages of the Internet)",
  "怎样学好英语 (How to learn English well)"
]

type Props = {
  prompt: string
  setPrompt: (value: string) => void
  studentName: string
  setStudentName: (value: string) => void
  essay: string
  setEssay: (value: string) => void
  loading: boolean
  error: string
  onSubmit: () => void
}

export function EssayForm(props: Props) {
  const wordCount = useMemo(() => {
    return props.essay.trim() ? props.essay.trim().split(/\s+/).length : 0
  }, [props.essay])

  const handleRandomPrompt = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_PROMPTS.length)
    props.setPrompt(RANDOM_PROMPTS[randomIndex])
    // 可选：清空当前的作文内容，让学生重新开始写
    props.setEssay('') 
  }

  return (
    <div className="panel formPanel premiumPanel">
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>作文题目</span>
          <button 
            type="button" 
            onClick={handleRandomPrompt}
            className="secondaryBtn"
            style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px' }}
          >
            🎲 随机真题
          </button>
        </div>
        <input value={props.prompt} onChange={(e) => props.setPrompt(e.target.value)} placeholder="输入作文题目或点击随机真题..." />
      </div>

      <label className="field">
        <span>学生姓名 <span style={{color: "var(--danger)"}}>*</span></span>
        <input value={props.studentName} onChange={(e) => props.setStudentName(e.target.value)} placeholder="例如 Colin" />
      </label>

      <label className="field">
        <span>作文内容</span>
        <textarea value={props.essay} onChange={(e) => props.setEssay(e.target.value)} rows={14} placeholder="在此输入你的英文作文..." />
      </label>

      <div className="toolbar">
        <div className="meta">
          <span>字数统计</span>
          <strong>{wordCount}</strong>
        </div>
        <button onClick={props.onSubmit} disabled={props.loading || !props.essay.trim() || !props.studentName.trim()}>
          {props.loading ? '批改中...' : '提交批改'}
        </button>
      </div>

      {props.loading ? <div className="inlineStatus">正在调用 GPT-5.4 进行批改，请稍候…</div> : null}
      {props.error ? <p className="error">{props.error}</p> : null}
    </div>
  )
}
