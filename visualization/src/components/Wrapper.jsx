export default function SectionWrapper({ id, title, subtitle, children, className = '' }) {
  return (
    <section id={id} className={`py-12 px-5 ${className}`}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-100 mb-1">{title}</h2>
        {subtitle && <p className="text-slate-400 text-md max-w-screen">{subtitle}</p>}
        <div className="mt-3 h-px bg-red-700" />
      </div>
      {children}
    </section>
  )
}
