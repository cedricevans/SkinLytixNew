import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, MousePointerClick, Target, Activity, ArrowLeft } from 'lucide-react';
import { useCTAPerformance, useConversionFunnel, useUserJourney, useEngagementMetrics } from '@/hooks/useAnalytics';
import { MetricCard } from '@/components/analytics/MetricCard';
import { CTAPerformanceChart } from '@/components/analytics/CTAPerformanceChart';
import { ConversionFunnelChart } from '@/components/analytics/ConversionFunnelChart';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Analytics = () => {
  const navigate = useNavigate();
  const { data: ctaData, isLoading: ctaLoading } = useCTAPerformance();
  const { data: funnelData, isLoading: funnelLoading } = useConversionFunnel();
  const { data: journeyData, isLoading: journeyLoading } = useUserJourney();
  const { data: engagementData, isLoading: engagementLoading } = useEngagementMetrics();

  // Calculate overview metrics
  const totalDemoClicks = ctaData?.filter(d => d.event_name === 'demo_cta_clicked').reduce((sum, d) => sum + d.total_clicks, 0) || 0;
  const totalSignupClicks = ctaData?.filter(d => d.event_name === 'signup_cta_clicked').reduce((sum, d) => sum + d.total_clicks, 0) || 0;
  const totalHomepageViews = funnelData?.reduce((sum, d) => sum + d.homepage_views, 0) || 0;
  const avgDemoCTR = totalHomepageViews > 0 ? ((totalDemoClicks / totalHomepageViews) * 100).toFixed(2) : '0';
  const avgSignupCTR = totalHomepageViews > 0 ? ((totalSignupClicks / totalHomepageViews) * 100).toFixed(2) : '0';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">CTA performance and user journey insights</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cta">CTA Performance</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="journey">User Journey</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard 
                title="Homepage Views" 
                value={totalHomepageViews}
                icon={Users}
              />
              <MetricCard 
                title="Demo CTR" 
                value={`${avgDemoCTR}%`}
                icon={MousePointerClick}
              />
              <MetricCard 
                title="Signup CTR" 
                value={`${avgSignupCTR}%`}
                icon={Target}
              />
              <MetricCard 
                title="Total Users" 
                value={journeyData?.total_users || 0}
                icon={Activity}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Last 30 days performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Demo Clicks</span>
                    <span className="font-semibold">{totalDemoClicks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sign Up Clicks</span>
                    <span className="font-semibold">{totalSignupClicks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed Onboarding</span>
                    <span className="font-semibold">{journeyData?.completed_onboarding || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">First Analysis</span>
                    <span className="font-semibold">{journeyData?.completed_first_analysis || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rates</CardTitle>
                  <CardDescription>User journey conversion metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Homepage → Demo</span>
                    <span className="font-semibold">{journeyData?.homepage_to_demo_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Homepage → Signup</span>
                    <span className="font-semibold">{journeyData?.homepage_to_signup_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Signup → Onboarding</span>
                    <span className="font-semibold">{journeyData?.signup_to_onboarding_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Onboarding → Analysis</span>
                    <span className="font-semibold">{journeyData?.onboarding_to_analysis_rate || 0}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CTA Click Trends</CardTitle>
                <CardDescription>Demo vs Sign Up CTA performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                {ctaLoading ? (
                  <div className="h-[350px] flex items-center justify-center">Loading...</div>
                ) : ctaData && ctaData.length > 0 ? (
                  <CTAPerformanceChart data={ctaData} />
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    No CTA data available yet. Data will appear as users interact with CTAs.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>User drop-off at each stage</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelLoading ? (
                  <div className="h-[400px] flex items-center justify-center">Loading...</div>
                ) : funnelData && funnelData.length > 0 ? (
                  <ConversionFunnelChart data={funnelData} />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    No funnel data available yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="journey" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Journey Analysis</CardTitle>
                <CardDescription>Average time and conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                {journeyLoading ? (
                  <div>Loading...</div>
                ) : journeyData ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{journeyData.avg_minutes_to_demo || 0}</div>
                        <div className="text-sm text-muted-foreground">Avg minutes to demo click</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{journeyData.avg_minutes_to_signup || 0}</div>
                        <div className="text-sm text-muted-foreground">Avg minutes to signup</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{journeyData.avg_minutes_to_complete_onboarding || 0}</div>
                        <div className="text-sm text-muted-foreground">Avg minutes to complete onboarding</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No journey data available yet.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Engagement Metrics</CardTitle>
                <CardDescription>User activity over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {engagementLoading ? (
                  <div>Loading...</div>
                ) : engagementData && engagementData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Active Users</TableHead>
                        <TableHead>Analyses</TableHead>
                        <TableHead>Routines Created</TableHead>
                        <TableHead>Routines Optimized</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {engagementData.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                          <TableCell>{row.daily_active_users}</TableCell>
                          <TableCell>{row.analyses}</TableCell>
                          <TableCell>{row.routines_created}</TableCell>
                          <TableCell>{row.routines_optimized}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-muted-foreground">No engagement data available yet.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;
