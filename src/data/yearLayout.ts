import { DIGITS, DIGIT_WIDTH, countFilledCells, type DigitBitmap } from './pixelFont'

export interface DayCell {
  dayIndex: number   // 0-based day of year (0 = Jan 1)
  row: number        // row in the full grid
  col: number        // col in the full grid
  digitIndex: number // which digit of the year (0,1,2,3)
}

export interface YearLayout {
  cells: DayCell[]
  gridCols: number
  gridRows: number
  totalDays: number
}

const DIGIT_GAP = 1   // empty columns between digits
const PADDING_ROWS = 4 // empty rows above and below the year number

/**
 * Build the pixel layout for a given year.
 *
 * The year number (e.g. "2026") is rendered as pixel art where
 * each filled cell = one day. The digit bitmaps are scaled vertically
 * so the total filled cells across all 4 digits equals the number
 * of days in the year (365 or 366).
 *
 * Strategy:
 * 1. Count filled cells per digit at base scale (7 rows)
 * 2. Scale each digit's height proportionally so total = daysInYear
 * 3. Map cells to day indices in reading order (left→right, top→bottom)
 */
export function buildYearLayout(year: number): YearLayout {
  const daysInYear = isLeapYear(year) ? 366 : 365
  const digits = String(year).split('')
  const bitmaps = digits.map(d => DIGITS[d])

  const scaledHeight = findBestHeight(bitmaps, daysInYear)
  const scaledBitmaps = bitmaps.map(b => scaleBitmap(b, scaledHeight))

  // Build the grid
  // Each digit occupies DIGIT_WIDTH cols, separated by DIGIT_GAP empty cols
  const totalCols = digits.length * DIGIT_WIDTH + (digits.length - 1) * DIGIT_GAP
  const totalRows = scaledHeight

  // Collect all filled positions per digit in reading order
  const allCells: DayCell[] = []
  let colOffset = 0

  for (let di = 0; di < digits.length; di++) {
    const bitmap = scaledBitmaps[di]
    for (let row = 0; row < bitmap.length; row++) {
      for (let col = 0; col < bitmap[row].length; col++) {
        if (bitmap[row][col] === 1) {
          allCells.push({
            dayIndex: -1, // assigned below
            row: row + PADDING_ROWS,
            col: colOffset + col,
            digitIndex: di,
          })
        }
      }
    }
    colOffset += DIGIT_WIDTH + DIGIT_GAP
  }

  // Assign day indices 0..daysInYear-1 in reading order
  // If scaledTotal > daysInYear, drop the last few cells
  // If scaledTotal < daysInYear, this shouldn't happen with our algorithm
  const usedCells = allCells.slice(0, daysInYear)
  usedCells.forEach((cell, i) => { cell.dayIndex = i })

  return {
    cells: usedCells,
    gridCols: totalCols,
    gridRows: totalRows + PADDING_ROWS * 2,
    totalDays: daysInYear,
  }
}

/** Find the digit height where total filled cells is closest to target */
function findBestHeight(bitmaps: DigitBitmap[], target: number): number {
  let best = 7
  let bestDiff = Infinity

  for (let h = 7; h <= 60; h++) {
    const scaled = bitmaps.map(b => scaleBitmap(b, h))
    const total = scaled.reduce((sum, b) => sum + countFilledCells(b), 0)
    const diff = Math.abs(total - target)
    if (diff < bestDiff) {
      bestDiff = diff
      best = h
    }
    // Stop searching once we're past the target by a safe margin
    if (total > target + 20) break
  }
  return best
}

/**
 * Scale a 5×7 bitmap to 5×targetHeight using nearest-neighbor.
 * Each output row samples from the original 7 rows proportionally.
 */
function scaleBitmap(bitmap: DigitBitmap, targetHeight: number): DigitBitmap {
  const srcHeight = bitmap.length
  const result: DigitBitmap = []

  for (let row = 0; row < targetHeight; row++) {
    const srcRow = Math.floor((row / targetHeight) * srcHeight)
    result.push([...bitmap[srcRow]] as (0 | 1)[])
  }
  return result
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Get the day-of-year index (0-based) for a given date */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay) - 1
}
