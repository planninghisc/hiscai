export function fillWeekends<T extends { target_date: string }>(data: T[]): T[] {
    if (data.length === 0) return []
  
    const result: T[] = []
    const map = new Map(data.map(d => [d.target_date, d]))
  
    const start = new Date(data[0].target_date + 'T00:00:00')
    const end   = new Date(data[data.length - 1].target_date + 'T00:00:00')
  
    let lastValid: T = data[0]
    const cur = new Date(start)
  
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0]
      const dayOfWeek = cur.getDay()
  
      if (map.has(dateStr)) {
        lastValid = map.get(dateStr)!
        result.push(lastValid)
      } else if (dayOfWeek === 0 || dayOfWeek === 6) {
        result.push({ ...lastValid, target_date: dateStr })
      }
  
      cur.setDate(cur.getDate() + 1)
    }
  
    return result
  }