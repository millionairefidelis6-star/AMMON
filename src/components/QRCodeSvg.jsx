const QRCodeSvg = ({
  value,
  size = 120,
  fgColor = "#176B37",
  bgColor = "#FFFFFF",
  className = ""
}) => {
  const hash = Array.from(value).reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
  const matrixSize = 21;
  const grid = Array(matrixSize).fill(false).map(() => Array(matrixSize).fill(false));
  const addFinderPattern = (r, c) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || i >= 2 && i <= 4 && j >= 2 && j <= 4) {
          grid[r + i][c + j] = true;
        } else {
          grid[r + i][c + j] = false;
        }
      }
    }
  };
  addFinderPattern(0, 0);
  addFinderPattern(0, matrixSize - 7);
  addFinderPattern(matrixSize - 7, 0);
  for (let i = 8; i < matrixSize - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }
  let seed = hash;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inTopLeftFinder = r < 8 && c < 8;
      const inTopRightFinder = r < 8 && c >= matrixSize - 8;
      const inBottomLeftFinder = r >= matrixSize - 8 && c < 8;
      const inTiming = r === 6 || c === 6;
      if (!inTopLeftFinder && !inTopRightFinder && !inBottomLeftFinder && !inTiming) {
        seed = (seed * 9301 + 49297) % 233280;
        grid[r][c] = seed / 233280 > 0.52;
      }
    }
  }
  const cellSize = size / matrixSize;
  return <svg
    width={size}
    height={size}
    viewBox={`0 0 ${size} ${size}`}
    className={`rounded-sm select-none ${className}`}
    style={{ backgroundColor: bgColor }}
    xmlns="http://www.w3.org/2000/svg"
  >
      <rect width={size} height={size} fill={bgColor} />
      {grid.map(
    (row, r) => row.map(
      (active, c) => active ? <rect
        key={`${r}-${c}`}
        x={c * cellSize}
        y={r * cellSize}
        width={cellSize + 0.1}
        height={cellSize + 0.1}
        fill={fgColor}
      /> : null
    )
  )}
    </svg>;
};
export {
  QRCodeSvg
};
