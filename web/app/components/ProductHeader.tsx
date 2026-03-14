type Props = {
  apiBase: string
  latestEngine?: string | null
  historyCount: number
}

export function ProductHeader({ apiBase, latestEngine, historyCount }: Props) {
  return (
    <section className="heroShell">
      <div className="heroCopy">
        <p className="eyebrow">ZK WRITING COACH</p>
        <h1>英语作文教练</h1>
        <p className="subtitle">
          为中考/高考英语写作训练设计的批改工作台：提交作文、即时评分、句子优化、润色参考、历史回看，一条链路完整闭环。
        </p>
      </div>

      <div className="heroMetaGrid">
        <article className="statusCard featureCard primaryCard">
          <span>当前批改引擎</span>
          <strong>{latestEngine === 'ai' ? 'GPT-5.4 实时批改' : '规则兜底模式'}</strong>
          <p>真实 AI 优先，异常时自动回退，避免服务中断。</p>
        </article>

        <article className="statusCard featureCard">
          <span>最近记录</span>
          <strong>{historyCount}</strong>
          <p>已保存到本地 SQLite，可回看、载入、继续优化。</p>
        </article>

        <article className="statusCard featureCard wideCard">
          <span>后端地址</span>
          <strong>{apiBase}</strong>
          <p>前端通过这个 API 与 FastAPI 服务联通。</p>
          <p style={{ marginTop: '12px' }}>
            <a href="/admin" style={{ color: 'var(--accent)', textDecoration: 'underline', fontSize: '13px', fontWeight: 'bold' }}>
              ⚙️ 进入真题库录入中心
            </a>
          </p>
        
        </article>
      </div>
    </section>
  )
}
