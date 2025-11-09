import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface ConversionFunnelChartProps {
  data: any[];
}

const chartConfig = {
  homepage_views: {
    label: 'Homepage Views',
    color: 'hsl(var(--primary))',
  },
  demo_clicks: {
    label: 'Demo Clicks',
    color: 'hsl(var(--accent))',
  },
  signup_clicks: {
    label: 'Sign Up Clicks',
    color: 'hsl(var(--secondary))',
  },
  completed_onboarding: {
    label: 'Completed Onboarding',
    color: 'hsl(var(--muted))',
  },
};

export const ConversionFunnelChart = ({ data }: ConversionFunnelChartProps) => {
  // Calculate totals
  const totals = data.reduce(
    (acc, item) => ({
      homepage_views: acc.homepage_views + (item.homepage_views || 0),
      demo_clicks: acc.demo_clicks + (item.demo_clicks || 0),
      signup_clicks: acc.signup_clicks + (item.signup_clicks || 0),
      completed_onboarding: acc.completed_onboarding + (item.completed_onboarding || 0),
      first_analysis: acc.first_analysis + (item.first_analysis || 0),
    }),
    { homepage_views: 0, demo_clicks: 0, signup_clicks: 0, completed_onboarding: 0, first_analysis: 0 }
  );

  const funnelData = [
    { stage: 'Homepage Views', users: totals.homepage_views },
    { stage: 'Demo Clicks', users: totals.demo_clicks },
    { stage: 'Sign Up Clicks', users: totals.signup_clicks },
    { stage: 'Completed Onboarding', users: totals.completed_onboarding },
    { stage: 'First Analysis', users: totals.first_analysis },
  ];

  return (
    <ChartContainer config={chartConfig} className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={funnelData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" className="text-xs" />
          <YAxis dataKey="stage" type="category" width={150} className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="users" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};
