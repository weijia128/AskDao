export function applyHistoryRecordPatch(records, recordId, patch) {
  return records.map((record) => {
    if (record.id !== recordId) {
      return record
    }

    return {
      ...record,
      ...patch,
    }
  })
}

function pad(value) {
  return `${value}`.padStart(2, '0')
}

export function formatHistoryCreatedAt(createdAt = '') {
  const value = `${createdAt}`
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value.slice(0, 16)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16)
  }

  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return `${beijingDate.getUTCFullYear()}年${beijingDate.getUTCMonth() + 1}月${beijingDate.getUTCDate()}日 ${pad(beijingDate.getUTCHours())}:${pad(beijingDate.getUTCMinutes())}`
}

export function removeHistoryRecord(records, recordId) {
  return records.filter((record) => record.id !== recordId)
}
