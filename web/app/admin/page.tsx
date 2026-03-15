'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const API_BASE = 'https://zk-writing-coach.onrender.com' // Using production API or proxy if local

export default function AdminPage() {
  const [examName, setExamName] = useState('')
  const [qText, setQText] = useState('')
  const [qImage, setQImage] = useState<File | null>(null)
  const [aText, setAText] = useState('')
  const [aImage, setAImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const qInputRef = useRef<HTMLInputElement>(null)
  const aInputRef = useRef<HTMLInputElement>(null)

  const handleIngest = async () => {
    if (!examName || (!qImage && !qText) || (!aImage && !aText)) {
      setError('请填写真题名称，并提供题目和答案（文字或图片均可）。')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('exam_name', examName)
      formData.append('question_text', qText)
      formData.append('answer_text', aText)
      if (qImage) formData.append('question_img', qImage)
      if (aImage) formData.append('answer_img', aImage)

      const res = await fetch(`${API_BASE}/knowledge/ingest`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('解析失败，请检查网络或图片质量。')
      
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="reportPage" style={{ maxWidth: '800px' }}>
      <div className="reportActionsBar noPrint">
        <Link href="/" className="reportNavLink">← 返回主工作台</Link>
      </div>

      <section className="reportHero">
        <p className="eyebrow">Database Flywheel</p>
        <h1>真题数据录入中心</h1>
        <p className="subtitle">通过拍照上传各地中考/高考的真实试卷题目和标准答案，AI 将自动结构化提取并入库，持续优化评分引擎。</p>
      </section>

      <section className="panel formPanel premiumPanel" style={{ marginBottom: '24px' }}>
        <label className="field">
          <span>真题标识 / 年份地区</span>
          <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="例如：2024年北京中考英语真题" />
        </label>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>试卷【题目】区</span>
              <div>
                <input type="file" accept="image/*" ref={qInputRef} style={{ display: 'none' }} onChange={e => setQImage(e.target.files?.[0] || null)} />
                <button type="button" className="secondaryBtn" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => qInputRef.current?.click()}>
                  {qImage ? '✅ 图片已附' : '📸 附加参考图片'}
                </button>
              </div>
            </div>
            <textarea 
              value={qText} 
              onChange={e => setQText(e.target.value)} 
              rows={8} 
              placeholder="请粘贴题目原文字，若有图表可点击右上方按钮附加试卷照片..." 
            />
          </div>

          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span>官方【标准范文】区</span>
              <div>
                <input type="file" accept="image/*" ref={aInputRef} style={{ display: 'none' }} onChange={e => setAImage(e.target.files?.[0] || null)} />
                <button type="button" className="secondaryBtn" style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px' }} onClick={() => aInputRef.current?.click()}>
                  {aImage ? '✅ 图片已附' : '📸 附加参考图片'}
                </button>
              </div>
            </div>
            <textarea 
              value={aText} 
              onChange={e => setAText(e.target.value)} 
              rows={8} 
              placeholder="请直接粘贴官方给出的满分范文或评分细则，或直接附图..." 
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          {error && <span className="error" style={{ margin: 0 }}>{error}</span>}
          <button onClick={handleIngest} disabled={loading}>
            {loading ? 'AI 深度解析入库中...' : '开始提取并入库'}
          </button>
        </div>
      </section>

      {result && (
        <section className="reportSection">
          <div className="coachHeader">
            <div><p className="eyebrow">Success</p><h2>入库成功</h2></div>
          </div>
          <div className="detailMetaGrid">
            <article className="detailMetaCard"><span>真题来源</span><strong>{result.exam_name}</strong></article>
          </div>
          <div className="detailSection">
            <h3>提取题目要求</h3>
            <div className="detailBox">{result.prompt_text}</div>
          </div>
          <div className="detailSection">
            <h3>标准范文提取</h3>
            <div className="detailBox detailEssay">{result.standard_essay}</div>
          </div>
        </section>
      )}
    </main>
  )
}
