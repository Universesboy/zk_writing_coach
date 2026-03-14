export function LoadingSkeleton() {
  return (
    <div className="skeletonStack" aria-hidden="true">
      <div className="skeletonLine skeletonWide" />
      <div className="skeletonLine" />
      <div className="skeletonLine" />
      <div className="skeletonCard" />
      <div className="skeletonCard" />
    </div>
  )
}
