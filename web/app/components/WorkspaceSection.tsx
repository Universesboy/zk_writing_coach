import { ReactNode } from 'react'

type Props = {
  title: string
  description: string
  children: ReactNode
}

export function WorkspaceSection({ title, description, children }: Props) {
  return (
    <section className="workspaceSection">
      <header className="sectionHeader">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>{title}</h2>
        </div>
        <p className="sectionDescription">{description}</p>
      </header>
      {children}
    </section>
  )
}
