import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    fillOpacity?: number;
    className?: string;
    showDots?: boolean;
    animate?: boolean;
}

export const SparklineChart = ({
    data,
    width = 100,
    height = 32,
    color = "currentColor",
    fillOpacity = 0.2,
    className,
    showDots = false,
    animate = true,
}: SparklineChartProps) => {
    const { path, fillPath, points, min, max } = useMemo(() => {
        if (!data || data.length === 0) {
            return { path: "", fillPath: "", points: [], min: 0, max: 0 };
        }

        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);
        const range = maxVal - minVal || 1;

        const padding = 2;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const pointsList = data.map((value, index) => {
            const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - ((value - minVal) / range) * chartHeight;
            return { x, y, value };
        });

        const pathPoints = pointsList.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');

        const fillPathPoints = `${pathPoints} L ${pointsList[pointsList.length - 1]?.x || 0} ${height} L ${padding} ${height} Z`;

        return {
            path: pathPoints,
            fillPath: fillPathPoints,
            points: pointsList,
            min: minVal,
            max: maxVal
        };
    }, [data, width, height]);

    if (!data || data.length === 0) {
        return (
            <div
                className={cn("flex items-center justify-center text-muted-foreground text-xs", className)}
                style={{ width, height }}
            >
                No data
            </div>
        );
    }

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn("overflow-visible", className)}
        >
            {/* Gradient fill */}
            <defs>
                <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>

            {/* Fill area */}
            <path
                d={fillPath}
                fill={`url(#sparkline-gradient-${color})`}
                className={animate ? "animate-in fade-in duration-700" : ""}
            />

            {/* Line */}
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={animate ? "animate-in fade-in slide-in-from-left duration-500" : ""}
            />

            {/* Dots */}
            {showDots && points.map((point, index) => (
                <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={2}
                    fill={color}
                    className={animate ? "animate-in zoom-in duration-300" : ""}
                    style={{ animationDelay: `${index * 50}ms` }}
                />
            ))}

            {/* Last point highlight */}
            {points.length > 0 && (
                <circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r={3}
                    fill={color}
                    className={animate ? "animate-pulse" : ""}
                />
            )}
        </svg>
    );
};

// Mini bar chart variant
interface MiniBarChartProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    className?: string;
}

export const MiniBarChart = ({
    data,
    width = 100,
    height = 32,
    color = "currentColor",
    className,
}: MiniBarChartProps) => {
    const bars = useMemo(() => {
        if (!data || data.length === 0) return [];

        const max = Math.max(...data) || 1;
        const barWidth = (width - (data.length - 1) * 2) / data.length;

        return data.map((value, index) => ({
            x: index * (barWidth + 2),
            height: (value / max) * height,
            value,
        }));
    }, [data, width, height]);

    if (!data || data.length === 0) {
        return (
            <div
                className={cn("flex items-center justify-center text-muted-foreground text-xs", className)}
                style={{ width, height }}
            >
                No data
            </div>
        );
    }

    const barWidth = (width - (data.length - 1) * 2) / data.length;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={className}
        >
            {bars.map((bar, index) => (
                <rect
                    key={index}
                    x={bar.x}
                    y={height - bar.height}
                    width={barWidth}
                    height={bar.height}
                    fill={color}
                    opacity={0.3 + (index / bars.length) * 0.7}
                    rx={1}
                    className="animate-in slide-in-from-bottom duration-300"
                    style={{ animationDelay: `${index * 30}ms` }}
                />
            ))}
        </svg>
    );
};

// Trend indicator
interface TrendIndicatorProps {
    value: number;
    previousValue: number;
    className?: string;
}

export const TrendIndicator = ({ value, previousValue, className }: TrendIndicatorProps) => {
    const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
    const isPositive = change >= 0;

    return (
        <span className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium",
            "text-muted-foreground",
            className
        )}>
            <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className={isPositive ? "" : "rotate-180"}
            >
                <path d="M5 2 L8 6 L2 6 Z" fill="currentColor" />
            </svg>
            {Math.abs(change).toFixed(1)}%
        </span>
    );
};

export default SparklineChart;
