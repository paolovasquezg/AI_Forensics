export default function SectionWrapper({ id, title, subtitle, children, tag }) {
  return (
    <section id={id} className="section-panel">
      <div className="section-eyebrow">
        <span className="section-tag">{tag || id.replace('section-', 'SEC-').replace('executive-summary', 'OVERVIEW')}</span>
        <div className="section-line" />
      </div>
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
      {children}
    </section>
  )
}
