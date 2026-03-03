import styles from './TopBar.module.css'

interface Props {
  today: Date
  daysLeft: number
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December']

export function TopBar({ today, daysLeft }: Props) {
  const dateStr = `${WEEKDAYS[today.getDay()]} ${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.label}>Today is :</span>
        <span className={styles.date}>{dateStr}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.accent}>{daysLeft}</span>
        <span className={styles.label}>days left before the end of the year</span>
      </div>
    </header>
  )
}
