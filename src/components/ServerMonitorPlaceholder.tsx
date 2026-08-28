export function ServerMonitorPlaceholder({ withHeaderLines = false }: { withHeaderLines?: boolean }) {
  return (
    <div className="server-monitor__placeholder">
      {withHeaderLines ? (
        <>
          <div className="server-monitor__placeholder-line server-monitor__placeholder-line--w60" />
          <div className="server-monitor__placeholder-line server-monitor__placeholder-line--w40" />
        </>
      ) : null}
      <div className="server-monitor__placeholder-chart" />
    </div>
  )
}
