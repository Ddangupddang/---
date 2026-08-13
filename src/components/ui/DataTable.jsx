// src/components/ui/DataTable.jsx
// 표 껍데기. 헤더 스타일·행 구분선·경고 행 세로선을 한곳에서 정해
// 화면마다 표 생김새가 달라지지 않게 한다. 내용은 renderCell이 정한다.

export default function DataTable({
  columns, rows, rowKey, renderCell, isAlert, onRowClick, empty,
}) {
  if (rows.length === 0) {
    return <p className="text-center text-ink-faint py-12">{empty}</p>
  }

  return (
    <div className="border border-line rounded overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}
                className={`bg-surface-alt text-ink-soft font-bold text-[11.5px] tracking-wider
                  px-3.5 py-3 border-b border-line whitespace-nowrap
                  ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const alert = Boolean(isAlert?.(row))
            return (
              <tr key={rowKey(row)}
                data-testid={`row-${rowKey(row)}`}
                data-alert={alert}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-line-soft last:border-0
                  ${onRowClick ? 'cursor-pointer hover:bg-surface-alt' : ''}`}>
                {columns.map((c, i) => (
                  <td key={c.key}
                    data-testid={`cell-${rowKey(row)}-${c.key}`}
                    className={`px-3.5 py-4 text-base
                      ${c.align === 'right' ? 'text-right' : 'text-left'}
                      ${i === 0 && alert ? 'shadow-[inset_3px_0_0_var(--color-danger)]' : ''}`}>
                    {renderCell(row, c)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
