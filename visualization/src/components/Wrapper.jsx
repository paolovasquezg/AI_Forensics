export default function SectionWrapper({ id, title, subtitle, children, className = '' }) {
  return (
    <section id={id} className={`py-12 px-8 ${className}`}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-1">{title}</h2>
        {subtitle && <p className="text-slate-400 text-sm max-w-2xl">{subtitle}</p>}
        <div className="mt-3 h-px bg-gradient-to-r from-red-600/60 via-slate-700 to-transparent" />
      </div>
      {children}
    </section>
  )
}
