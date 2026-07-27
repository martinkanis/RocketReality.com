import type { DailyCount } from './stats'

const CHART_WIDTH = 640
const CHART_HEIGHT = 200
const PADDING_LEFT = 36
const PADDING_BOTTOM = 20
const PADDING_TOP = 16
const BAR_MAX_WIDTH = 24
const BAR_GAP = 2
const BAR_CORNER_RADIUS = 4
const Y_TICK_COUNT = 4
const X_LABEL_EVERY = 5

/** Zaokrouhlí krok osy na „hezkou" hodnotu (1/2/5 × 10^k). */
function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rawStep, 1)))
  const normalized = rawStep / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

/** Sloupec se zaoblenou horní hranou a rovnou základnou. */
function barPath(x: number, top: number, width: number, bottom: number): string {
  const radius = Math.min(BAR_CORNER_RADIUS, width / 2, bottom - top)
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${top + radius}`,
    `Q ${x} ${top} ${x + radius} ${top}`,
    `L ${x + width - radius} ${top}`,
    `Q ${x + width} ${top} ${x + width} ${top + radius}`,
    `L ${x + width} ${bottom}`,
    'Z',
  ].join(' ')
}

interface ColumnChartProps {
  points: DailyCount[]
  valueUnit: string
  ariaLabel: string
}

/** Denní sloupcový graf — server-rendered SVG, tooltipy přes nativní <title>. */
export function ColumnChart({ points, valueUnit, ariaLabel }: ColumnChartProps) {
  const maxValue = Math.max(...points.map((point) => point.value), 0)
  const step = niceStep(Math.max(maxValue, 1) / Y_TICK_COUNT)
  const axisMax = Math.max(step * Y_TICK_COUNT, step)
  const ticks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, index) => index * step)

  const plotWidth = CHART_WIDTH - PADDING_LEFT
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const baseline = PADDING_TOP + plotHeight
  const slotWidth = plotWidth / points.length
  const barWidth = Math.min(BAR_MAX_WIDTH, slotWidth - BAR_GAP)
  const maxIndex = points.findIndex((point) => point.value === maxValue)

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      className="w-full"
    >
      <g className="stroke-border" strokeWidth={1}>
        {ticks.map((tick) => {
          const y = baseline - (tick / axisMax) * plotHeight
          return <line key={tick} x1={PADDING_LEFT} y1={y} x2={CHART_WIDTH} y2={y} />
        })}
      </g>
      <g className="fill-current text-[10px] text-muted-foreground">
        {ticks.map((tick) => (
          <text
            key={tick}
            x={PADDING_LEFT - 6}
            y={baseline - (tick / axisMax) * plotHeight + 3}
            textAnchor="end"
          >
            {tick}
          </text>
        ))}
        {points.map((point, index) =>
          index % X_LABEL_EVERY === 0 ? (
            <text
              key={point.day}
              x={PADDING_LEFT + index * slotWidth + slotWidth / 2}
              y={CHART_HEIGHT - 6}
              textAnchor="middle"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </g>
      <g className="fill-brand-500">
        {points.map((point, index) => {
          if (point.value === 0) return null
          const barHeight = (point.value / axisMax) * plotHeight
          const x = PADDING_LEFT + index * slotWidth + (slotWidth - barWidth) / 2
          return (
            <path key={point.day} d={barPath(x, baseline - barHeight, barWidth, baseline)}>
              <title>{`${point.label} — ${point.value} ${valueUnit}`}</title>
            </path>
          )
        })}
      </g>
      {maxValue > 0 && maxIndex >= 0 ? (
        <text
          x={PADDING_LEFT + maxIndex * slotWidth + slotWidth / 2}
          y={baseline - (maxValue / axisMax) * plotHeight - 5}
          textAnchor="middle"
          className="fill-current text-[11px] font-medium text-heading"
        >
          {maxValue}
        </text>
      ) : null}
    </svg>
  )
}
