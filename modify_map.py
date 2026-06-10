import os

filepath = r"c:\Users\jojun\Downloads\영상\관리프로젝트\app\map\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

helpers = """  const getElapsedMonths = (contractDate?: string) => {
    if (!contractDate) return -1
    const start = new Date(contractDate)
    const end = new Date()
    if (isNaN(start.getTime())) return -1
    let diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    if (end.getDate() < start.getDate()) diff--
    return Math.max(0, diff)
  }

  const getModelTypeBadge = (modelName?: string) => {
    if (!modelName) return null
    const lower = modelName.toLowerCase()
    let text = ''
    let typeClass = ''
    if (lower.startsWith('cp')) {
      text = '정수기'
      typeClass = 'purifier'
    } else if (lower.startsWith('ac')) {
      text = '공기청정기'
      typeClass = 'air-cleaner'
    } else if (lower.startsWith('cbt')) {
      text = '비데'
      typeClass = 'bidet'
    } else {
      return null
    }

    return (
      <span className={`model-badge ${typeClass}`}>
        {text}
      </span>
    )
  }

  const getElapsedMonthsBadge = (contractDate?: string) => {
    const months = getElapsedMonths(contractDate)
    if (months === -1) return null

    return (
      <span className="model-badge elapsed-months">
        {months}개월
      </span>
    )
  }

  const moveToCurrentLocation = () => {"""

# Normalise newlines
content = content.replace('\r\n', '\n')

content = content.replace("  const moveToCurrentLocation = () => {", helpers)

jsx_target = """                  <div className="row-info">
                    <div className="row-badge" style={{ background: getMarkerColor(customer.status) }}>{customer.status || '미분류'}</div>
                    <div className="row-name">{customer.고객명_상호}</div>
                    <div className="row-addr">{formatShortAddress(customer.설치주소 || customer.주소 || '')}</div>
                  </div>"""

jsx_replacement = """                  <div className="row-info">
                    <div className="row-name-container">
                      <div className="row-name">{customer.고객명_상호}</div>
                      <div className="row-badge" style={{ background: getMarkerColor(customer.status) }}>{customer.status || '미분류'}</div>
                      {getModelTypeBadge(customer.모델명)}
                      {getElapsedMonthsBadge(customer.계약일자)}
                    </div>
                    <div className="row-addr">{(customer.전화번호 || customer.핸드폰번호 || customer.설치전화번호 || '').replace(/-/g, '') + ' | ' + formatShortAddress(customer.설치주소 || customer.주소 || '')}</div>
                  </div>"""

content = content.replace(jsx_target, jsx_replacement)

css_target1 = """.row-name { font-size: 0.95rem; font-weight: 700; color: #1a1a1a; }"""
css_replacement1 = """.row-name-container { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
        .row-name { font-size: 0.95rem; font-weight: 800; color: #1a1a1a; }
        .model-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap; display: inline-flex; align-items: center; }
        .model-badge.purifier { background: #eff6ff; color: #3b82f6; }
        .model-badge.air-cleaner { background: #ecfdf5; color: #10b981; }
        .model-badge.bidet { background: #fff7ed; color: #ea580c; }
        .model-badge.elapsed-months { background: #f1f5f9; color: #475569; }"""

content = content.replace(css_target1, css_replacement1)

css_target2 = """.row-badge { display: inline-block; font-size: 0.6rem; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-bottom: 4px; }"""
css_replacement2 = """.row-badge { display: inline-block; font-size: 0.65rem; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: 700; }"""

content = content.replace(css_target2, css_replacement2)

if "row-name-container" in content:
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS")
else:
    print("FAILED")
