export default function BrandMark({ compact = false }) {
  return (
    <img
      src="/pondo.ico"
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-contain ${compact ? 'size-8' : 'size-10'}`}
    />
  )
}
