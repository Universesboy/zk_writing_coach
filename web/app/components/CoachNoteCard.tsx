export function CoachNoteCard({ note }: { note: string }) {
  return (
    <section className="reportSection">
      <div className="coachHeader">
        <div>
          <p className="eyebrow">Coach Note</p>
          <h2>教练备注</h2>
        </div>
      </div>
      <div className="coachNoteBox">
        <p>{note}</p>
      </div>
    </section>
  )
}
