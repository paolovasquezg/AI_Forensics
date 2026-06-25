export default function Tooltip({ x, y, children }) {
  if (!children) return null
  const style = {
    left: x + 14,
    top:  y - 10,
    transform: x > window.innerWidth - 320 ? 'translateX(-110%)' : undefined
  }
  return (
    <div className="viz-tooltip" style={style}>
      {children}
    </div>
  )
}
