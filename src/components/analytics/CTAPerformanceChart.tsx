import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface CTAPerformanceChartProps {
  data: any[];
}

const chartConfig = {
  demo_clicks: {
    label: 'Demo CTA',
    color: 'hsl(var(--primary))',
  },
  signup_clicks: {
    label: 'Sign Up CTA',
    color: 'hsl(var(--accent))',
  },
};

export const CTAPerformanceChart = ({ data }: CTAPerformanceChartProps) => {
  // Aggregate data by date
  const aggregatedData = data.reduce((acc: any[], item: any) => {
    const existingDate = acc.find((d) => d.date === item.date);
    if (existingDate) {
      if (item.event_name === 'demo_cta_clicked') {
        existingDate.demo_clicks = (existingDate.demo_clicks || 0) + item.total_clicks;
      } else if (item.event_name === 'signup_cta_clicked') {
        existingDate.signup_clicks = (existingDate.signup_clicks || 0) + item.total_clicks;
      }
    } else {
      acc.push({
        date: item.date,
        demo_clicks: item.event_name === 'demo_cta_clicked' ? item.total_clicks : 0,
        signup_clicks: item.event_name === 'signup_cta_clicked' ? item.total_clicks : 0,
      });
    }
    return acc;
  }, []);

  return (
    <ChartContainer config={chartConfig} className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={aggregatedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line 
            type="monotone" 
            dataKey="demo_clicks" 
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Demo CTA"
          />
          <Line 
            type="monotone" 
            dataKey="signup_clicks" 
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            name="Sign Up CTA"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
