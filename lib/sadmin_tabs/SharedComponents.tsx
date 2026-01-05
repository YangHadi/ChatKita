import React, { memo, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, G, Path, Defs, LinearGradient, Stop, Line, Rect, Text as SvgText } from "react-native-svg";
import { styles } from "./styles";
import { PieItem, SvgLineChartProps, controlPoint, BarChartDataPoint } from "./common";

export const PanelCard: React.FC<{
  title: string;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  headerRight?: React.ReactNode;
}> = memo(({ title, children, onPress, style, headerRight }) => (
  <TouchableOpacity activeOpacity={onPress ? 0.8 : 1} onPress={onPress} disabled={!onPress}>
    <View style={[styles.panelCard, style]}>
      {headerRight ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={[styles.panelTitle, { marginBottom: 0 }]}>{title}</Text>
          {headerRight}
        </View>
      ) : (
        <Text style={styles.panelTitle}>{title}</Text>
      )}
      {children}
    </View>
  </TouchableOpacity>
));

export const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  textColor?: string;
  onPress?: () => void;
  badgeVisible?: boolean;
  style?: ViewStyle;
  showArrow?: boolean;
}> = memo(({ title, value, icon, color = "#fff", textColor = "#333", onPress, badgeVisible, style, showArrow = true }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!badgeVisible) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, [badgeVisible]);

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
      style={[{
        backgroundColor: color,
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 3,
        shadowColor: color === "#fff" ? "#000" : color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        minHeight: 70,
      }, style]}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: textColor === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <Ionicons name={icon} size={20} color={textColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, lineHeight: 24 }} numberOfLines={1}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
        <Text style={{ fontSize: 11, color: textColor, opacity: 0.8, fontWeight: '600', marginTop: 0, textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>{title}</Text>
      </View>
      {onPress && showArrow && <Ionicons name="chevron-forward" size={16} color={textColor} style={{ opacity: 0.6 }} />}
      
      {badgeVisible && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#E74C3C",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
              borderWidth: 1.5,
              borderColor: '#fff'
            },
            animatedBadgeStyle,
          ]}
        />
      )}
    </TouchableOpacity>
  );
});

export const SvgPieChart: React.FC<{
  data: PieItem[];
  radius: number;
  innerRadius?: number;
}> = memo(({ data, radius, innerRadius = 0 }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let startAngle = 0;

  const polarToCartesian = (cx: number, cy: number, r: number, a: number) => ({
    x: cx + r * Math.cos(a),
    y: cy + r * Math.sin(a),
  });

  if (total === 0) {
    return (
      <Svg width={radius * 2} height={radius * 2}>
        <G transform={`translate(${radius}, ${radius})`}>
          <Circle cx={0} cy={0} r={radius} fill="#E0E0E0" />
          {innerRadius > 0 && <Circle cx={0} cy={0} r={innerRadius} fill="#fff" />}
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={radius * 2} height={radius * 2}>
      <G transform={`translate(${radius}, ${radius})`}>
        {data.map((slice, i) => {
          const sliceAngle = (slice.value / total) * Math.PI * 2;
          const endAngle = startAngle + sliceAngle;
          const start = polarToCartesian(0, 0, radius, startAngle);
          const end = polarToCartesian(0, 0, radius, endAngle);
          const innerStart = polarToCartesian(0, 0, innerRadius, startAngle);
          const innerEnd = polarToCartesian(0, 0, innerRadius, endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          const path = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
          startAngle = endAngle;
          return <Path key={i} d={path} fill={slice.color} />;
        })}

        {innerRadius > 0 && <Circle cx={0} cy={0} r={innerRadius} fill="#fff" />}
      </G>
    </Svg>
  );
});

export const SvgLineChart: React.FC<SvgLineChartProps> = memo(({ data, width, height, color = "#4A90E2", labels = [] }) => {
  if (!data || data.length === 0) return <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}><Text>No data</Text></View>;
  const padding = { top: 30, bottom: 30, left: 35, right: 35 };
  const max = Math.max(...data, 1);
  const points = data.map((value, i) => {
    const x = padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const y = height - padding.bottom - (value / max) * (height - padding.top - padding.bottom);
    return { x, y, value };
  });
  const linePath = useMemo(() => {
    if (points.length < 2) return "";
    return points.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point);
      const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
      return `${acc} C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point.x},${point.y}`;
    }, "");
  }, [points]);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - padding.bottom} L ${points[0].x},${height - padding.bottom} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs><LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color} stopOpacity="0.2" /><Stop offset="1" stopColor={color} stopOpacity="0" /></LinearGradient></Defs>
      <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#eee" />
      <Line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#eee" />
      {[0, 0.25, 0.5, 0.75, 1].map(tick => {
        const y = height - padding.bottom - tick * (height - padding.top - padding.bottom);
        const label = Math.round(tick * max);
        return (<G key={tick}><SvgText x={padding.left - 12} y={y + 4} fill="#888" fontSize="10" textAnchor="end">{label}</SvgText>{tick > 0 && (<Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeDasharray="2,2" />)}</G>);
      })}
      {labels.map((label, i) => {
        if (data.length <= 1) return null;
        let x = padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
        let textAnchor: "start" | "middle" | "end" = "middle";
        if (i === 0) textAnchor = "start";
        else if (i === labels.length - 1) textAnchor = "end";
        return (<SvgText key={i} x={x} y={height - padding.bottom + 15} fill="#555" fontSize="12" textAnchor={textAnchor}>{label}</SvgText>);
      })}
      <Path d={areaPath} fill="url(#grad)" />
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />
      {points.map((p, i) => (
        <G key={i}>
          <Circle cx={p.x} cy={p.y} r={6} fill={color} fillOpacity={0.2} />
          <Circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke={color} strokeWidth={1.5} />
          <SvgText x={p.x} y={p.y - 12} fill="transparent" fontSize="12" fontWeight="bold" textAnchor="middle" stroke="#fff" strokeWidth={3} strokeLinejoin="round">{p.value}</SvgText>
          <SvgText x={p.x} y={p.y - 12} fill="#333" fontSize="12" fontWeight="bold" textAnchor="middle">{p.value}</SvgText>
        </G>
      ))}
    </Svg>
  );
});

export const SvgBarChart: React.FC<{ data: BarChartDataPoint[]; width: number; height: number; color?: string; stackColors?: Record<string, string>; labels?: string[]; }> = memo(({ data, width, height, color = "#E74C3C", labels = [], stackColors }) => {
  const padding = { top: 30, bottom: 30, left: 35, right: 20 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const barWidth = chartWidth / data.length;
  const totals = data.map(d => typeof d === 'number' ? d : Object.values(d).reduce((s, v) => s + v, 0));
  const max = Math.max(...totals, 1);

  return (
    <Svg width={width} height={height}>
      {[0, 0.25, 0.5, 0.75, 1].map(tick => {
        const y = height - padding.bottom - tick * chartHeight;
        const label = Math.round(tick * max);
        return (<G key={tick}><SvgText x={padding.left - 8} y={y + 4} fill="#888" fontSize="10" textAnchor="end">{label}</SvgText>{tick > 0 && (<Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f0f0f0" strokeDasharray="2,2" />)}</G>);
      })}
      {data.map((v, i) => {
        const totalValue = totals[i];
        const totalHeight = (totalValue / max) * chartHeight;
        const x = padding.left + i * barWidth;
        const renderBar = () => {
          if (typeof v === 'number') return <Rect x={x} y={height - padding.bottom - totalHeight} width={barWidth - 6} height={totalHeight} fill={color} rx={4} />;
          if (stackColors) {
            let currentHeight = 0;
            return (
              <G>
                {Object.entries(v).map(([key, value]) => {
                  const segmentHeight = (value / max) * chartHeight;
                  const rect = (<Rect key={key} x={x} y={height - padding.bottom - currentHeight - segmentHeight} width={barWidth - 6} height={segmentHeight} fill={stackColors[key] || color} />);
                  currentHeight += segmentHeight;
                  return rect;
                })}
                <Rect x={x} y={height - padding.bottom - totalHeight} width={barWidth - 6} height={totalHeight} fill="transparent" stroke="#fff" strokeWidth={0.5} rx={4} />
              </G>
            );
          }
          return null;
        };
        return (
          <G key={i}>
            {renderBar()}
            <SvgText x={x + (barWidth - 6) / 2} y={height - padding.bottom - totalHeight - 5} fill="#333" fontSize="12" textAnchor="middle">{totalValue}</SvgText>
            {labels[i] && (<SvgText x={x + (barWidth - 6) / 2} y={height - padding.bottom + 15} fill="#555" fontSize="12" textAnchor="middle">{labels[i]}</SvgText>)}
          </G>
        );
      })}
    </Svg>
  );
});

// The default export has been removed to prevent Expo Router from treating this file as a route, which can cause module resolution issues.