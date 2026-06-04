export default function ScrollZoomFocus({ children, className = '', origin = 'center' }) {
  return (
    <div className={`scroll-zoom-focus ${className}`.trim()} data-origin={origin}>
      {children}
    </div>
  )
}
